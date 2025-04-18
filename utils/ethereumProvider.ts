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
      window.ethereum = {
        isMetaMask: true,
        _callbacks: {},
        _nextId: 1,
        
        request: function(request) {
          const id = this._nextId++;
          return new Promise((resolve, reject) => {
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
              callback.resolve(response.result);
            }
            delete this._callbacks[response.id];
          }
        },

        // Standard EIP-1193 methods
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
        isConnected: function() { return true; },
        selectedAddress: '0x0000000000000000000000000000000000000000'
      };

      // Notify dapps that provider is ready
      const readyEvent = new Event('ethereum#initialized');
      window.dispatchEvent(readyEvent);
    })();
    true;
  `;
};