interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  detail: EIP6963ProviderDetail;
}

interface EthereumRequest {
  method: string;
  params?: any[];
}

interface EthereumCallback {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface EthereumEvents {
  [key: string]: ((data: any) => void)[];
}

/**
 * Returns the JavaScript code that injects the Ethereum provider into the WebView
 */
export const getEthereumProvider = (): string => {
  return `
    (function() {
      // Console logging bridge
      /*
      const originalConsole = window.console;
      window.console = {
        log: (...args) => {
          originalConsole.log(...args);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console',
            method: 'log',
            data: args
          }));
        },
        warn: (...args) => {
          originalConsole.warn(...args);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console',
            method: 'warn',
            data: args
          }));
        },
        error: (...args) => {
          originalConsole.error(...args);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console',
            method: 'error',
            data: args
          }));
        },
        info: (...args) => {
          originalConsole.info(...args);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console',
            method: 'info',
            data: args
          }));
        },
      };

      // Catch unhandled errors and promise rejections
      window.onerror = (message, source, lineno, colno, error) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'console',
          method: 'error',
          data: [{
            message,
            source,
            lineno,
            colno,
            error: error?.stack || error?.message || error
          }]
        }));
        return false;
      };
      */

      window.onunhandledrejection = (event) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'console',
          method: 'error',
          data: ['Unhandled Promise Rejection:', event.reason]
        }));
      };

      const providerInfo = {
        uuid: 'mist2-mobile-' + Math.random().toString(36).slice(2),
        name: 'Mist2 Mobile',
        icon: '', // TODO: Add icon URL
        rdns: 'app.mist2'
      };

      window.ethereum = {
        isMetaMask: true,
        _callbacks: {},
        _nextId: 1,
        _connected: false,
        _address: null,
        
        request: async function(request) {
          const id = this._nextId++;
          return new Promise((resolve, reject) => {
            // For eth_requestAccounts, check if already connected
            if (request.method === 'eth_requestAccounts') {
              if (this._connected && this._address) {
                return resolve([this._address]);
              }
            }

            // For personal_sign, validate parameters
            if (request.method === 'personal_sign') {
              if (!request.params || request.params.length < 2) {
                return reject(new Error('personal_sign requires message and address parameters'));
              }
              if (!this._connected) {
                return reject(new Error('Not connected'));
              }
            }

            // For eth_sendTransaction, validate parameters
            if (request.method === 'eth_sendTransaction') {
              if (!request.params || request.params.length < 1) {
                return reject(new Error('eth_sendTransaction requires transaction parameters'));
              }
              if (!this._connected) {
                return reject(new Error('Not connected'));
              }
              const tx = request.params[0];
              if (!tx.to) {
                return reject(new Error('Transaction requires a to address'));
              }
            }

            // For eth_blockNumber, handle it directly
            if (request.method === 'eth_blockNumber') {
              return resolve('0x1234567'); // Mock block number for now
            }

            // For eth_estimateGas, handle it directly
            if (request.method === 'eth_estimateGas') {
              if (!request.params || request.params.length < 1) {
                return reject(new Error('eth_estimateGas requires transaction parameters'));
              }
              // Return a mock gas estimate (21000 is the base cost for a simple ETH transfer)
              const tx = request.params[0];
              // If there's data, return a higher estimate since it's likely a contract interaction
              const estimate = tx.data ? '0x1D4C0' : '0x5208'; // 120,000 : 21,000
              return resolve(estimate);
            }
            
            this._callbacks[id] = { resolve, reject };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ethereum_request',
              id: id,
              payload: request
            }));
          });
        },

        enable: function() {
          return this.request({ method: 'eth_requestAccounts' });
        },

        _resolveRequest: function(response) {
          const callback = this._callbacks[response.id];
          if (callback) {
            if (response.error) {
              callback.reject(response.error);
            } else {
              // Update connected state and address if this was a successful connection
              if (response.result && Array.isArray(response.result) && 
                  this._callbacks[response.id] && 
                  response.type === 'eth_requestAccounts') {
                this._connected = true;
                this._address = response.result[0];
              }
              callback.resolve(response.result);
            }
            delete this._callbacks[response.id];
          }
        },

        // Standard EIP-1193 methods
        _emitEvent: function(event, data) {
          if (!this._events) return;
          const handlers = this._events[event];
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error('Error in event handler:', error);
              }
            });
          }
        },

        on: function(event, callback) {
          if (!this._events) this._events = {};
          if (!this._events[event]) this._events[event] = [];
          this._events[event].push(callback);
        },

        removeListener: function(event, callback) {
          if (!this._events || !this._events[event]) return;
          this._events[event] = this._events[event].filter(cb => cb !== callback);
        },

        // Standard provider properties
        chainId: '0x1',
        networkVersion: '1',
        isConnected: function() { return this._connected; },
        get selectedAddress() { return this._address; }
      };

      // Announce this provider according to EIP-6963
      function announceProvider() {
        const providerDetail = {
          info: providerInfo,
          provider: window.ethereum
        };
        
        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
          detail: providerDetail
        }));
      }

      // Listen for provider requests
      window.addEventListener('eip6963:requestProvider', announceProvider);
      
      // Initial announcement
      announceProvider();
    })();
    true;
  `;
};