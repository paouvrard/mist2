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

const INFURA_ID = '8245495f0d1247d18e83e5f491b75c88'

/**
 * Returns the JavaScript code that injects the Ethereum provider into the WebView
 * @param instanceId Optional unique identifier for the WebView instance to support multiple providers
 */
export const getEthereumProvider = (instanceId: string = 'default'): string => {
  return `
    (function() {
      // Console logging bridge
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
        debug: (...args) => {
          originalConsole.log(...args); // Fallback to log if original debug doesn't exist
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console',
            method: 'debug',
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

      window.onunhandledrejection = (event) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'console',
          method: 'error',
          data: ['Unhandled Promise Rejection:', event.reason]
        }));
      };

      const providerInfo = {
        uuid: 'mist2-mobile-${instanceId}-' + Math.random().toString(36).slice(2),
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
        _chainId: '0x1', // Default to Ethereum mainnet
        _chainStates: {}, // Store chain state per origin
        _instanceId: '${instanceId}', // Track instance ID for multi-app support
        
        request: async function(request) {
          const id = this._nextId++;
          return new Promise((resolve, reject) => {
            // Track chain state for current origin
            const origin = window.location.origin;
            if (!this._chainStates[origin]) {
              this._chainStates[origin] = { chainId: this._chainId };
            }
            this._chainId = this._chainStates[origin].chainId;

            // For eth_requestAccounts, check if already connected
            if (request.method === 'eth_requestAccounts') {
              if (this._connected && this._address) {
                return resolve([this._address]);
              }
            }
            // Send request to native side
            this._callbacks[id] = { resolve, reject };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ethereum_request',
              id: id,
              instanceId: this._instanceId,
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
                
                // Initialize chain state for current origin if not exists
                const origin = window.location.origin;
                if (!this._chainStates[origin]) {
                  this._chainStates[origin] = { chainId: this._chainId };
                }
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
        get chainId() { return this._chainId; },
        get networkVersion() { return parseInt(this._chainId).toString(); },
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