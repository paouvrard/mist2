import React, { useCallback, useRef, useState, useEffect } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { WalletConnectSheet } from '@/components/WalletConnectSheet';
import { WalletInfoSheet } from '@/components/WalletInfoSheet';
import { WelcomePage } from '@/components/WelcomePage';
import { SignatureRequestSheet } from '@/components/SignatureRequestSheet';
import { TransactionRequestSheet } from '@/components/TransactionRequestSheet';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getEthereumProvider } from '@/utils/ethereumProvider';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { Buffer } from 'buffer';
import { Transaction } from 'viem';
import { getRpcUrl } from '@/utils/chains';
import { Wallet } from '@/utils/walletStorage';

// Define favorite apps
const favoriteApps = [
  { id: 'zerion', name: 'Zerion', url: 'https://app.zerion.io', category: 'portfolio' },
  { id: 'uniswap', name: 'Uniswap', url: 'https://app.uniswap.org', category: 'swap' },
  { id: 'aave', name: 'Aave', url: 'https://app.aave.com', category: 'earn' },
  { id: 'rainbow-bridge', name: 'Rainbow Bridge', url: 'https://rainbowbridge.app', category: 'bridge' },
  { id: 'rainbow-bridge-testnet', name: 'Rainbow Bridge Testnet', url: 'https://testnet.rainbowbridge.app', category: 'testnet' },
  { id: 'opensea', name: 'OpenSea', url: 'https://opensea.io', category: 'nft' },
  { id: 'lens', name: 'Lens', url: 'https://hey.xyz', category: 'social' },
  { id: 'rarible', name: 'Rarible', url: 'https://rarible.com', category: 'nft' },
];

// Interface for app connection state tracking
interface AppConnectionState {
  isConnected: boolean;
  wallet: Wallet | null;
  chainId: number;
  url: string;
  isLoaded?: boolean; // Track if WebView has been loaded
}

// App WebView Component
interface AppWebViewProps {
  instanceId: string;
  url: string;
  visible: boolean;
  onMessage: (event: any, instanceId: string) => void;
  onNavigationStateChange: (navState: any, instanceId: string) => void;
  ref?: (ref: WebView | null) => void;
}

const AppWebView = React.forwardRef<WebView, AppWebViewProps>(({ 
  instanceId, 
  url, 
  visible, 
  onMessage, 
  onNavigationStateChange 
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const INJECT_PROVIDER_JS = getEthereumProvider(instanceId);

  // Use React.useImperativeHandle to forward the WebView ref
  React.useImperativeHandle(ref, () => webViewRef.current as WebView);

  // Don't render if no URL is provided
  if (!url) {
    return null;
  }

  return (
    <View 
      style={[
        styles.webviewWrapper, 
        // Use position instead of opacity for better state preservation
        !visible && styles.offscreenView
      ]}
      collapsable={false}
      renderToHardwareTextureAndroid={true}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onNavigationStateChange={(navState) => onNavigationStateChange(navState, instanceId)}
        injectedJavaScriptBeforeContentLoaded={INJECT_PROVIDER_JS}
        onMessage={(event) => onMessage(event, instanceId)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        keyboardDisplayRequiresUserAction={false}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets={true}
        androidLayerType="hardware"
        incognito={false} // Set to true for private browsing
        // Use key to prevent recreation of WebView if URL changes
        key={instanceId}
      />
    </View>
  );
});

export default function AppsScreen() {
  // Track app instances and their states
  const [appInstances, setAppInstances] = useState<{ [key: string]: AppConnectionState }>({});
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  
  // UI state
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Sheet states
  const [isWalletSheetVisible, setIsWalletSheetVisible] = useState(false);
  const [isWalletInfoSheetVisible, setIsWalletInfoSheetVisible] = useState(false);
  const [isSignatureSheetVisible, setIsSignatureSheetVisible] = useState(false);
  const [isTransactionSheetVisible, setIsTransactionSheetVisible] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState('');
  const [transactionDetails, setTransactionDetails] = useState<Transaction>({} as Transaction);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [pendingAppId, setPendingAppId] = useState<string | null>(null);
  
  // Get references and style values
  const webViewRefs = useRef<{[key: string]: WebView | null}>({});
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { setHideTabBar } = useTabVisibility();
  const params = useLocalSearchParams();
  
  // Define navigation bar colors
  const navBarBackgroundColor = '#333333'; // Dark gray background for navigation bar
  const navBarTextColor = '#CCCCCC'; // Light gray for text and icons

  // Track if this is the first time focusing or if we're returning after going to another tab
  const [isFocused, setIsFocused] = useState(false);
  const wasUnfocused = useRef(false);

  // Add focus effect to track when the screen gains and loses focus
  useFocusEffect(
    React.useCallback(() => {
      // When the screen comes into focus
      setIsFocused(true);
      
      // We don't want to reset to welcome page when returning from other tabs
      wasUnfocused.current = false;
      
      return () => {
        // When the screen loses focus
        setIsFocused(false);
        wasUnfocused.current = true;
      };
    }, [])
  );

  // Listen for the resetWebView parameter to know when to reset the webview
  useEffect(() => {
    if (params.resetWebView === 'true') {
      handleHomePress();
    }
  }, [params.resetWebView]);

  // Track keyboard visibility and height with improved handlers
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        if (Platform.OS === 'ios') {
          setKeyboardHeight(event.endCoordinates.height);
        }
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Update tab visibility when showing/hiding welcome screen
  useEffect(() => {
    setHideTabBar(!showWelcome);
  }, [showWelcome, setHideTabBar]);

  // Get the active app state
  const getActiveAppState = () => {
    if (!activeAppId || !appInstances[activeAppId]) {
      return {
        isConnected: false,
        wallet: null,
        chainId: 1, // Default to Ethereum mainnet
        url: ''
      };
    }
    return appInstances[activeAppId];
  };

  const activeAppState = getActiveAppState();

  // Switch to a specific app - creating it if needed
  const switchToApp = (appId: string) => {
    // Check if this is a favorite app that hasn't been created yet
    const favoriteApp = favoriteApps.find(app => app.id === appId);
    
    if (favoriteApp && !appInstances[appId]) {
      // Create the app instance for this favorite app
      setAppInstances(prev => ({
        ...prev,
        [appId]: {
          isConnected: false,
          wallet: null,
          chainId: 1,
          url: favoriteApp.url
        }
      }));
      
      // Set this as the active app
      setActiveAppId(appId);
      setCurrentUrl(favoriteApp.url);
      setShowWelcome(false);
    } else if (appInstances[appId]) {
      // Switch to existing app
      setActiveAppId(appId);
      setCurrentUrl(appInstances[appId].url);
      setShowWelcome(false);
    } else {
      console.warn(`App with ID ${appId} not found`);
    }
  };

  // Handle connection request from a WebView
  const handleConnect = useCallback((request: any, id: number, appId: string) => {
    setPendingRequestId(id);
    setPendingAppId(appId);
    setIsWalletSheetVisible(true);
  }, []);

  // When a user confirms wallet connection
  const handleConnectConfirm = useCallback((wallet: Wallet) => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      // Update the app instance state
      setAppInstances(prev => ({
        ...prev,
        [pendingAppId]: {
          ...prev[pendingAppId],
          isConnected: true,
          wallet: wallet
        }
      }));
      
      // Send response to the WebView
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            type: 'eth_requestAccounts',
            result: ['${wallet.address}']
          });
        `);
      }
      
      setIsWalletSheetVisible(false);
      setPendingRequestId(null);
      setPendingAppId(null);
    }
  }, [pendingRequestId, pendingAppId]);

  // When a user cancels wallet connection
  const handleConnectCancel = useCallback(() => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            error: { code: 4001, message: 'User rejected the request.' }
          });
        `);
      }
      setIsWalletSheetVisible(false);
      setPendingRequestId(null);
      setPendingAppId(null);
    }
  }, [pendingRequestId, pendingAppId]);

  // Disconnect wallet from current app
  const handleDisconnect = useCallback(() => {
    if (activeAppId) {
      setAppInstances(prev => ({
        ...prev,
        [activeAppId]: {
          ...prev[activeAppId],
          isConnected: false,
          wallet: null
        }
      }));
      
      const appWebViewRef = webViewRefs.current[activeAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._connected = false;
          window.ethereum._address = null;
          window.ethereum._emitEvent('accountsChanged', []);
          window.ethereum._emitEvent('disconnect', { code: 4900, message: 'User disconnected' });
        `);
      }
    }
    setIsWalletInfoSheetVisible(false);
  }, [activeAppId]);

  // Switch to a different wallet for the current app
  const handleSwitchWallet = useCallback((wallet: Wallet) => {
    if (activeAppId) {
      setAppInstances(prev => ({
        ...prev,
        [activeAppId]: {
          ...prev[activeAppId],
          wallet: wallet
        }
      }));
      
      const appWebViewRef = webViewRefs.current[activeAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._address = '${wallet.address}';
          window.ethereum._emitEvent('accountsChanged', ['${wallet.address}']);
        `);
      }
    }
    setIsWalletInfoSheetVisible(false);
  }, [activeAppId]);

  // Handle successful signature
  const handleSignatureSuccess = useCallback((signature: string) => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            result: '${signature}'
          });
        `);
      }
      setPendingRequestId(null);
      setPendingAppId(null);
    }
    setIsSignatureSheetVisible(false);
  }, [pendingRequestId, pendingAppId]);

  // Handle signature modal closing
  const handleSignatureClose = useCallback(() => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            error: { code: 4001, message: 'User rejected the request.' }
          });
        `);
      }
    }
    setIsSignatureSheetVisible(false);
    setPendingRequestId(null);
    setPendingAppId(null);
  }, [pendingRequestId, pendingAppId]);

  // Handle successful transaction
  const handleTransactionSuccess = useCallback((hash: string) => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            result: '${hash}'
          });
        `);
      }
      setPendingRequestId(null);
      setPendingAppId(null);
    }
    setIsTransactionSheetVisible(false);
  }, [pendingRequestId, pendingAppId]);

  // Handle transaction modal closing
  const handleTransactionClose = useCallback(() => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            error: { code: 4001, message: 'User rejected the request.' }
          });
        `);
      }
    }
    setIsTransactionSheetVisible(false);
    setPendingRequestId(null);
    setPendingAppId(null);
  }, [pendingRequestId, pendingAppId]);

  // Decode hex messages
  const decodeHexMessage = (hexMessage: string): string => {
    try {
      // Remove '0x' prefix if present
      const cleanHex = hexMessage.startsWith('0x') ? hexMessage.slice(2) : hexMessage;
      // Try to decode as UTF-8 string
      return Buffer.from(cleanHex, 'hex').toString('utf8');
    } catch (error) {
      // If decoding fails, return the original message
      return hexMessage;
    }
  };

  // Process messages from WebView
  const handleMessage = useCallback((event: any, appId: string) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle console messages
      if (data.type === 'console') {
        console.log(`[WebView ${appId}]:`, data);
        return;
      }

      // Handle ethereum requests
      if (data.type === 'ethereum_request') {
        // Get the current app state
        const appState = appInstances[appId] || { 
          isConnected: false, 
          wallet: null, 
          chainId: 1,
          url: ''
        };
        
        const appWebViewRef = webViewRefs.current[appId];
        
        switch (data.payload.method) {
          case 'eth_requestAccounts':
            if (!appState.isConnected) {
              handleConnect(data.payload, data.id, appId);
            } else if (appState.wallet && appWebViewRef) {
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  type: 'eth_requestAccounts',
                  result: ['${appState.wallet.address}']
                });
              `);
            }
            break;
            
          case 'eth_accounts':
            if (appWebViewRef) {
              const addresses = appState.wallet ? [appState.wallet.address] : [];
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: ${JSON.stringify(addresses)}
                });
              `);
            }
            break;
            
          case 'eth_chainId':
            if (appWebViewRef) {
              const chainId = `0x${appState.chainId.toString(16)}`;
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: "${chainId}"
                });
              `);
            }
            break;
            
          case 'eth_sendTransaction':
            if (!appState.isConnected || !appState.wallet) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              // Extract transaction details
              const txParams = data.payload.params[0];
              
              // Set transaction details for the modal
              setTransactionDetails(txParams);
              
              // Set the pending request data
              setPendingRequestId(data.id);
              setPendingAppId(appId);
              
              // Show the transaction approval modal
              setIsTransactionSheetVisible(true);
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4001, message: 'Invalid transaction parameters.' }
                  });
                `);
              }
            }
            break;
            
          case 'eth_sign':
          case 'personal_sign':
            if (!appState.isConnected || !appState.wallet) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              let message;
              
              // Extract the message to be signed
              if (data.payload.method === 'eth_sign') {
                message = data.payload.params[1]; // In eth_sign, the message is the second param
              } else {
                message = data.payload.params[0]; // In personal_sign, the message is the first param
              }
              
              // If the message is hex-encoded, decode it for display
              if (typeof message === 'string' && message.startsWith('0x')) {
                const decodedMessage = decodeHexMessage(message);
                setSignatureMessage(decodedMessage);
              } else {
                setSignatureMessage(message);
              }
              
              // Set the pending request data
              setPendingRequestId(data.id);
              setPendingAppId(appId);
              
              // Show the signature approval modal
              setIsSignatureSheetVisible(true);
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4001, message: 'Error processing signature request.' }
                  });
                `);
              }
            }
            break;
            
          case 'wallet_switchEthereumChain':
            if (!appState.isConnected) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              const newChainId = parseInt(data.payload.params[0].chainId);
              
              // Update the app's chain ID
              setAppInstances(prev => ({
                ...prev,
                [appId]: {
                  ...prev[appId],
                  chainId: newChainId
                }
              }));
              
              if (appWebViewRef) {
                const chainIdHex = `0x${newChainId.toString(16)}`;
                
                appWebViewRef.injectJavaScript(`
                  window.ethereum._chainId = "${chainIdHex}";
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    result: null
                  });
                  window.ethereum._emitEvent('chainChanged', "${chainIdHex}");
                `);
              }
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4902, message: 'Unrecognized chain ID.' }
                  });
                `);
              }
            }
            break;
            
          case 'wallet_addEthereumChain':
            // Validate parameters
            if (!appState.isConnected) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            if (!data.payload.params || !data.payload.params[0] || !data.payload.params[0].chainId) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'wallet_addEthereumChain requires chain information' }
                  });
                `);
              }
              break;
            }

            // For now we'll just return success but we could implement adding new chains
            if (appWebViewRef) {
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: null
                });
              `);
            }
            break;
            
          case 'eth_blockNumber':
            // Use direct RPC call from React Native side
            if (appWebViewRef) {
              // Fetch from RPC using the current chain's RPC URL
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_blockNumber',
                  params: []
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_estimateGas':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'eth_estimateGas requires transaction parameters' }
                  });
                `);
              }
              break;
            }
            
            // Use direct RPC call
            if (appWebViewRef) {
              // Fetch from RPC using the current chain's RPC URL
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_estimateGas',
                  params: data.payload.params
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_getTransactionByHash':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'eth_getTransactionByHash requires transaction hash parameter' }
                  });
                `);
              }
              break;
            }
            
            // Use direct RPC call
            if (appWebViewRef) {
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_getTransactionByHash',
                  params: data.payload.params
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;

          case 'eth_signTypedData':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4':
            if (!appState.isConnected || !appState.wallet) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              // Extract typed data for display - this would need more processing for proper display
              const typedData = data.payload.params[1]; // Typed data is the second param
              let message;
              
              try {
                // Try to parse the typed data if it's a string
                const parsedData = typeof typedData === 'string' ? JSON.parse(typedData) : typedData;
                message = JSON.stringify(parsedData, null, 2);
              } catch (e) {
                message = typedData;
              }
              
              // Set the message for display
              setSignatureMessage(`[Typed Data Signature Request]\n${message}`);
              
              // Set the pending request data
              setPendingRequestId(data.id);
              setPendingAppId(appId);
              
              // Show the signature approval modal
              setIsSignatureSheetVisible(true);
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4001, message: 'Error processing typed data signature request.' }
                  });
                `);
              }
            }
            break;

          default:
            if (appWebViewRef) {
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: {
                    code: 4200,
                    message: 'Method ${data.payload.method} not supported'
                  }
                });
              `);
            }
        }
      }
    } catch (error) {
      console.error(`Error handling message from app ${appId}:`, error);
    }
  }, [appInstances, handleConnect]);

  // Update WebView refs when components mount/unmount
  const handleWebViewRef = (ref: WebView | null, instanceId: string) => {
    if (ref) {
      webViewRefs.current[instanceId] = ref;
    } else {
      delete webViewRefs.current[instanceId];
    }
  };

  // Handle navigation state change for an app
  const handleNavigationStateChange = (navState: any, instanceId: string) => {
    if (instanceId === activeAppId) {
      setCurrentUrl(navState.url);
      setCanGoBack(navState.canGoBack);
    }
    
    // Update the URL in the app instances state
    setAppInstances(prev => ({
      ...prev,
      [instanceId]: {
        ...prev[instanceId],
        url: navState.url
      }
    }));
  };

  // Navigate to a URL and create a new app instance if needed
  const goToUrl = (input: string) => {
    let processedUrl = input;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      processedUrl = 'https://' + input;
    }
    
    // First, check if this matches a favorite app
    try {
      const inputUrlObj = new URL(processedUrl);
      
      // Check if this URL matches any favorite app
      const matchedFavoriteApp = favoriteApps.find(app => {
        try {
          const appUrlObj = new URL(app.url);
          return inputUrlObj.hostname === appUrlObj.hostname;
        } catch (e) {
          return false;
        }
      });
      
      if (matchedFavoriteApp) {
        // Use switchToApp which will create the instance if needed
        switchToApp(matchedFavoriteApp.id);
        return;
      }
    } catch (error) {
      console.log('URL parsing error:', error);
    }
    
    // Check other existing instances
    let existingAppId: string | null = null;
    
    Object.entries(appInstances).forEach(([id, instance]) => {
      try {
        const inputUrlObj = new URL(processedUrl);
        const instanceUrlObj = instance.url ? new URL(instance.url) : null;
        
        if (instanceUrlObj && 
            inputUrlObj.hostname === instanceUrlObj.hostname) {
          existingAppId = id;
        }
      } catch (error) {
        console.log('URL parsing error:', error);
      }
    });
    
    if (existingAppId) {
      // Reuse existing app instance
      switchToApp(existingAppId);
    } else {
      // Create a new app instance with a dynamic ID
      const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      setAppInstances(prev => ({
        ...prev,
        [appId]: {
          isConnected: false,
          wallet: null,
          chainId: 1,
          url: processedUrl
        }
      }));
      
      // Set this as the active app
      setActiveAppId(appId);
      setCurrentUrl(processedUrl);
      setShowWelcome(false);
    }
  };

  // Return to the welcome screen WITHOUT resetting app state
  const handleHomePress = () => {
    setShowWelcome(true);
    // Don't reset activeAppId or currentUrl to preserve state
  };

  // Go back in the active WebView history
  const handleBackPress = () => {
    if (activeAppId && webViewRefs.current[activeAppId] && canGoBack) {
      webViewRefs.current[activeAppId].goBack();
    } else {
      handleHomePress();
    }
  };

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Show welcome screen if needed, but keep WebViews mounted */}
      {showWelcome && (
        <View style={styles.welcomeContainer}>
          <WelcomePage 
            favoriteApps={favoriteApps} 
            onAppSelect={switchToApp} 
          />
        </View>
      )}
      
      {/* Keep WebViews mounted but hide them when showing welcome */}
      <View style={[
        styles.webviewContainer, 
        { paddingTop: insets.top },
        showWelcome && styles.offscreenView // Use position-based hiding instead of display: none
      ]}>
        {/* Render all app instances */}
        {Object.entries(appInstances).map(([instanceId, appState]) => (
          <AppWebView 
            key={instanceId}
            instanceId={instanceId}
            url={appState.url}
            visible={instanceId === activeAppId && !showWelcome}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationStateChange}
            ref={(ref) => handleWebViewRef(ref, instanceId)}
          />
        ))}
      </View>

      {/* Only show navigation bar when not on welcome screen */}
      {!showWelcome && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          style={styles.navigationBarContainer} 
          keyboardVerticalOffset={0}>
          <View style={[styles.navigationBar, { backgroundColor: '#2a2a2a' }]}>
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.navButton}>
              <IconSymbol size={20} name="chevron.left" color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleHomePress}
              style={styles.navButton}>
              <IconSymbol size={20} name="house.fill" color="#ffffff" />
            </TouchableOpacity>
            <TextInput
              style={styles.urlInput}
              value={currentUrl}
              onChangeText={setCurrentUrl}
              onSubmitEditing={() => goToUrl(currentUrl)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
            />
            <TouchableOpacity 
              onPress={() => setIsWalletInfoSheetVisible(true)}
              style={styles.navButton}>
              <IconSymbol size={20} name="key.fill" color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <WalletConnectSheet
        isVisible={isWalletSheetVisible}
        onClose={handleConnectCancel}
        onConnect={handleConnectConfirm}
        onCancel={handleConnectCancel}
      />
      <WalletInfoSheet
        isVisible={isWalletInfoSheetVisible}
        onClose={() => setIsWalletInfoSheetVisible(false)}
        onDisconnect={handleDisconnect}
        onSwitchWallet={handleSwitchWallet}
        wallet={activeAppState.wallet}
      />
      <SignatureRequestSheet
        isVisible={isSignatureSheetVisible}
        message={signatureMessage}
        currentWallet={pendingAppId ? appInstances[pendingAppId]?.wallet : null}
        currentChainId={pendingAppId ? appInstances[pendingAppId]?.chainId : 1}
        onClose={handleSignatureClose}
        onSuccess={handleSignatureSuccess}
      />
      <TransactionRequestSheet
        isVisible={isTransactionSheetVisible}
        transaction={transactionDetails}
        currentWallet={pendingAppId ? appInstances[pendingAppId]?.wallet : null}
        currentChainId={pendingAppId ? appInstances[pendingAppId]?.chainId : 1}
        onClose={handleTransactionClose}
        onSuccess={handleTransactionSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webviewContainer: {
    flex: 1,
    paddingBottom: 50, // Fixed padding for the navigation bar height
  },
  navigationBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8, // Add elevation for Android to ensure it's above other elements
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopColor: '#333333',
    height: 50,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#555555',
    marginHorizontal: 4,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  urlInput: {
    flex: 1,
    height: 36,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0, // Square corners
    backgroundColor: '#444444',
    color: '#ffffff',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#333333',
    borderLeftColor: '#333333',
    borderBottomColor: '#666666',
    borderRightColor: '#666666',
  },
  webviewWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  offscreenView: {
    position: 'absolute',
    left: -10000, // Move far off-screen instead of changing opacity
    width: '100%',
    height: '100%',
  },
  welcomeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10, // Ensure welcome screen appears above WebViews
  },
  webview: {
    flex: 1,
  },
});