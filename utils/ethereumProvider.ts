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

      // Chain configurations
      const chains = {
        '0x1': {
          chainId: '0x1',
          chainName: 'Ethereum Mainnet',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.infura.io/v3/'],
          blockExplorerUrls: ['https://etherscan.io']
        },
        '0x5': {
          chainId: '0x5',
          chainName: 'Goerli',
          nativeCurrency: {
            name: 'Goerli Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://goerli.infura.io/v3/'],
          blockExplorerUrls: ['https://goerli.etherscan.io']
        },
        '0x89': {
          chainId: '0x89',
          chainName: 'Polygon',
          nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
          },
          rpcUrls: ['https://polygon-rpc.com'],
          blockExplorerUrls: ['https://polygonscan.com']
        },
        '0xa': {
          chainId: '0xa',
          chainName: 'Optimism',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.optimism.io'],
          blockExplorerUrls: ['https://optimistic.etherscan.io']
        },
        '0xa4b1': {
          chainId: '0xa4b1',
          chainName: 'Arbitrum One',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://arb1.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://arbiscan.io']
        },
        '0x64': {
          chainId: '0x64',
          chainName: 'Gnosis Chain',
          nativeCurrency: {
            name: 'xDAI',
            symbol: 'xDAI',
            decimals: 18
          },
          rpcUrls: ['https://rpc.gnosischain.com'],
          blockExplorerUrls: ['https://gnosisscan.io']
        },
        '0x2105': {
          chainId: '0x2105',
          chainName: 'Base',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        },
        '0x4e454152': {
          chainId: '0x4e454152',
          chainName: 'Aurora',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.aurora.dev'],
          blockExplorerUrls: ['https://aurorascan.dev']
        },
        '0x118': {
          chainId: '0x118',
          chainName: 'ZkSync Era',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.era.zksync.io'],
          blockExplorerUrls: ['https://explorer.zksync.io']
        }
      };

      // Helper function to make JSON-RPC calls
      async function makeRpcCall(chainId, method, params = []) {
        const chain = chains[chainId];
        if (!chain || !chain.rpcUrls || chain.rpcUrls.length === 0) {
          throw new Error('No RPC URL available for chain ' + chainId);
        }

        const rpcUrl = chain.rpcUrls[0];
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Math.floor(Math.random() * 1000000),
            method: method,
            params: params
          })
        });

        if (!response.ok) {
          throw new Error('RPC request failed: ' + response.statusText);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || 'RPC error');
        }

        return data.result;
      }

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
        _chainId: '0x1', // Default to Ethereum mainnet
        _chainStates: {}, // Store chain state per origin
        
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

            // For eth_chainId, return current chain
            if (request.method === 'eth_chainId') {
              return resolve(this._chainId);
            }

            // For net_version, return numeric chain ID
            if (request.method === 'net_version') {
              return resolve(parseInt(this._chainId).toString());
            }

            // For eth_blockNumber, make RPC call
            if (request.method === 'eth_blockNumber') {
              makeRpcCall(this._chainId, 'eth_blockNumber')
                .then(resolve)
                .catch(reject);
              return;
            }

            // For eth_estimateGas, make RPC call
            if (request.method === 'eth_estimateGas') {
              if (!request.params || request.params.length < 1) {
                return reject(new Error('eth_estimateGas requires transaction parameters'));
              }
              makeRpcCall(this._chainId, 'eth_estimateGas', request.params)
                .then(resolve)
                .catch(reject);
              return;
            }

            // For wallet_switchEthereumChain
            if (request.method === 'wallet_switchEthereumChain') {
              if (!request.params || !request.params[0] || !request.params[0].chainId) {
                return reject(new Error('wallet_switchEthereumChain requires chainId parameter'));
              }
              
              const newChainId = request.params[0].chainId;
              if (!chains[newChainId]) {
                return reject(new Error('Unsupported chain ID'));
              }

              // Test RPC endpoint before switching
              makeRpcCall(newChainId, 'eth_blockNumber')
                .then(() => {
                  // RPC is working, proceed with chain switch
                  const origin = window.location.origin;
                  this._chainStates[origin] = { chainId: newChainId };
                  this._chainId = newChainId;
                  this._emitEvent('chainChanged', newChainId);
                  resolve(null);
                })
                .catch((error) => {
                  reject(new Error('Failed to connect to RPC endpoint: ' + error.message));
                });
              return;
            }

            // For wallet_addEthereumChain
            if (request.method === 'wallet_addEthereumChain') {
              if (!request.params || !request.params[0] || !request.params[0].chainId) {
                return reject(new Error('wallet_addEthereumChain requires chain information'));
              }

              const chainInfo = request.params[0];
              if (chains[chainInfo.chainId]) {
                // Chain already supported
                return resolve(null);
              }

              // Reject unsupported chains for now
              return reject(new Error('Chain not supported'));
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