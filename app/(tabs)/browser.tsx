import React, { useCallback, useRef, useState, useEffect } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Keyboard, Platform, KeyboardAvoidingView, TouchableWithoutFeedback } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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

// Get the provider injection code
const INJECT_PROVIDER_JS = getEthereumProvider();

export default function BrowserScreen() {
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<Wallet | null>(null);
  const [isWalletSheetVisible, setIsWalletSheetVisible] = useState(false);
  const [isWalletInfoSheetVisible, setIsWalletInfoSheetVisible] = useState(false);
  const [isSignatureSheetVisible, setIsSignatureSheetVisible] = useState(false);
  const [isTransactionSheetVisible, setIsTransactionSheetVisible] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState('');
  const [transactionDetails, setTransactionDetails] = useState<Transaction>({} as Transaction);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number>(1); // Default to Ethereum mainnet
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigationBarHeight = 50; // Fixed height for the navigation bar
  const { setHideTabBar } = useTabVisibility();
  
  // Define navigation bar colors
  const navBarBackgroundColor = '#333333'; // Dark gray background for navigation bar
  const navBarTextColor = '#CCCCCC'; // Light gray for text and icons

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

  const handleConnect = useCallback((request: any, id: number) => {
    setPendingRequestId(id);
    setIsWalletSheetVisible(true);
  }, []);

  const handleConnectConfirm = useCallback((wallet: Wallet) => {
    if (pendingRequestId !== null && webViewRef.current) {
      setIsConnected(true);
      setConnectedWallet(wallet);
      webViewRef.current.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${pendingRequestId},
          type: 'eth_requestAccounts',
          result: ['${wallet.address}']
        });
      `);
      setIsWalletSheetVisible(false);
      setPendingRequestId(null);
    }
  }, [pendingRequestId]);

  const handleConnectCancel = useCallback(() => {
    if (pendingRequestId !== null && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${pendingRequestId},
          error: { code: 4001, message: 'User rejected the request.' }
        });
      `);
      setIsWalletSheetVisible(false);
      setPendingRequestId(null);
    }
  }, [pendingRequestId]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setConnectedWallet(null);
    setIsWalletInfoSheetVisible(false);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.ethereum._connected = false;
        window.ethereum._address = null;
        window.ethereum._emitEvent('accountsChanged', []);
        window.ethereum._emitEvent('disconnect', { code: 4900, message: 'User disconnected' });
      `);
    }
  }, []);

  const handleSwitchWallet = useCallback((wallet: Wallet) => {
    setConnectedWallet(wallet);
    setIsWalletInfoSheetVisible(false);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.ethereum._address = '${wallet.address}';
        window.ethereum._emitEvent('accountsChanged', ['${wallet.address}']);
      `);
    }
  }, []);

  const handleSignatureSuccess = useCallback((signature: string) => {
    if (pendingRequestId !== null && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${pendingRequestId},
          result: '${signature}'
        });
      `);
      setPendingRequestId(null);
    }
  }, [pendingRequestId]);

  const handleSignatureClose = useCallback(() => {
    if (pendingRequestId !== null && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${pendingRequestId},
          error: { code: 4001, message: 'User rejected the request.' }
        });
      `);
    }
    setIsSignatureSheetVisible(false);
    setPendingRequestId(null);
  }, [pendingRequestId]);

  const handleTransactionSuccess = useCallback((hash: string) => {
    if (pendingRequestId !== null && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${pendingRequestId},
          result: '${hash}'
        });
      `);
      setPendingRequestId(null);
    }
  }, [pendingRequestId]);

  const handleTransactionClose = useCallback(() => {
    if (pendingRequestId !== null && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${pendingRequestId},
          error: { code: 4001, message: 'User rejected the request.' }
        });
      `);
    }
    setIsTransactionSheetVisible(false);
    setPendingRequestId(null);
  }, [pendingRequestId]);

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

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      // Handle console messages
      if (data.type === 'console') {
        const args = data.data.map((arg: any) => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        );
        
        switch (data.method) {
          case 'log':
            console.log('[WebView]', ...args);
            break;
          case 'warn':
            console.warn('[WebView]', ...args);
            break;
          case 'error':
            console.error('[WebView]', ...args);
            break;
          case 'info':
            console.info('[WebView]', ...args);
            break;
        }
        return;
      }

      // Handle ethereum requests
      if (data.type === 'ethereum_request') {
        switch (data.payload.method) {
          case 'eth_requestAccounts':
            if (!isConnected) {
              handleConnect(data.payload, data.id);
            } else if (connectedWallet && webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  type: 'eth_requestAccounts',
                  result: ['${connectedWallet.address}']
                });
              `);
            }
            break;

          case 'personal_sign':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 2) {
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4200, message: 'personal_sign requires message and address parameters' }
                });
              `);
              break;
            }
            if (!isConnected || !connectedWallet) {
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4100, message: 'Not connected' }
                });
              `);
              break;
            }
            const decodedMessage = decodeHexMessage(data.payload.params[0]);
            setSignatureMessage(decodedMessage);
            setPendingRequestId(data.id);
            setIsSignatureSheetVisible(true);
            break;

          case 'eth_sendTransaction':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4200, message: 'eth_sendTransaction requires transaction parameters' }
                });
              `);
              break;
            }
            if (!isConnected || !connectedWallet) {
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4100, message: 'Not connected' }
                });
              `);
              break;
            }
            setTransactionDetails(data.payload.params[0]);
            setPendingRequestId(data.id);
            setIsTransactionSheetVisible(true);
            break;

          case 'eth_chainId':
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: '0x${currentChainId.toString(16)}'
                });
              `);
            }
            break;

          case 'net_version':
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: '${currentChainId.toString()}'
                });
              `);
            }
            break;

          case 'eth_accounts':
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: ${isConnected && connectedWallet ? `['${connectedWallet.address}']` : '[]'}
                });
              `);
            }
            break;

          case 'eth_blockNumber':
            // Use direct RPC call from React Native side instead of makeRpcCall in WebView
            if (webViewRef.current) {
              // Fetch from RPC using the current chain's RPC URL
              fetch(getRpcUrl(currentChainId), {
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
                if (webViewRef.current) {
                  if (responseJson.error) {
                    webViewRef.current.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    webViewRef.current.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(`
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
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4200, message: 'eth_estimateGas requires transaction parameters' }
                });
              `);
              break;
            }
            // Use direct RPC call from React Native side instead of makeRpcCall in WebView
            if (webViewRef.current) {
              // Fetch from RPC using the current chain's RPC URL
              fetch(getRpcUrl(currentChainId), {
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
                if (webViewRef.current) {
                  if (responseJson.error) {
                    webViewRef.current.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    webViewRef.current.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;

          case 'wallet_switchEthereumChain':
            // Validate parameters
            if (!data.payload.params || !data.payload.params[0] || !data.payload.params[0].chainId) {
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4200, message: 'wallet_switchEthereumChain requires chainId parameter' }
                });
              `);
              break;
            }
            
            // Handle chain switch
            if (webViewRef.current) {
              const newChainId = parseInt(data.payload.params[0].chainId, 16);
              setCurrentChainId(newChainId);
              webViewRef.current.injectJavaScript(`
                (function() {
                  const origin = window.location.origin;
                  window.ethereum._chainStates[origin] = { chainId: '${data.payload.params[0].chainId}' };
                  window.ethereum._chainId = '${data.payload.params[0].chainId}';
                  window.ethereum._emitEvent('chainChanged', '${data.payload.params[0].chainId}');
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    result: null
                  });
                })();
              `);
            }
            break;

          case 'wallet_addEthereumChain':
            // Validate parameters
            if (!data.payload.params || !data.payload.params[0] || !data.payload.params[0].chainId) {
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4200, message: 'wallet_addEthereumChain requires chain information' }
                });
              `);
              break;
            }

            // For now we'll just return success but we could implement adding new chains
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: null
                });
              `);
            }
            break;
            
          case 'eth_getTransactionByHash':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              webViewRef.current?.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: { code: 4200, message: 'eth_getTransactionByHash requires transaction hash parameter' }
                });
              `);
              break;
            }
            // Use direct RPC call from React Native side using the correct chain RPC URL
            if (webViewRef.current) {
              fetch(getRpcUrl(currentChainId), {
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
                if (webViewRef.current) {
                  if (responseJson.error) {
                    webViewRef.current.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    webViewRef.current.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;

          default:
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
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
      console.error('Error handling message:', error);
    }
  }, [isConnected, connectedWallet, currentChainId, handleConnect]);

  const goToUrl = (input: string) => {
    let processedUrl = input;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      processedUrl = 'https://' + input;
    }
    setUrl(processedUrl);
    setCurrentUrl(processedUrl);
    setShowWelcome(false);
  };

  const handleHomePress = () => {
    setShowWelcome(true);
    setUrl('');
    setCurrentUrl('');
  };

  const handleBackPress = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    } else {
      handleHomePress();
    }
  };

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  if (showWelcome) {
    return <WelcomePage onNavigate={goToUrl} />;
  }

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <View style={[styles.container, { backgroundColor }]}>
        <View style={[styles.webviewContainer]}>
          {url && (
            <WebView
              ref={webViewRef}
              source={{ uri: url }}
              style={styles.webview}
              onNavigationStateChange={(navState) => {
                setCurrentUrl(navState.url);
                setCanGoBack(navState.canGoBack);
              }}
              injectedJavaScriptBeforeContentLoaded={INJECT_PROVIDER_JS}
              onMessage={handleMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              keyboardDisplayRequiresUserAction={false}
            />
          )}
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          style={styles.navigationBarContainer} 
          keyboardVerticalOffset={0}>
          <View style={[styles.navigationBar, { backgroundColor: navBarBackgroundColor }]}>
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.button}>
              <IconSymbol size={20} name="chevron.left" color={navBarTextColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleHomePress}
              style={styles.button}>
              <IconSymbol size={20} name="house.fill" color={navBarTextColor} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: navBarTextColor }]}
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
              style={styles.button}>
              <IconSymbol size={20} name="key.fill" color={navBarTextColor} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

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
          wallet={connectedWallet ?? {} as Wallet}
        />
        <SignatureRequestSheet
          isVisible={isSignatureSheetVisible}
          message={signatureMessage}
          currentWallet={connectedWallet}
          currentChainId={currentChainId}
          onClose={handleSignatureClose}
          onSuccess={handleSignatureSuccess}
        />
        <TransactionRequestSheet
          isVisible={isTransactionSheetVisible}
          transaction={transactionDetails}
          currentWallet={connectedWallet}
          currentChainId={currentChainId}
          onClose={handleTransactionClose}
          onSuccess={handleTransactionSuccess}
        />
      </View>
    </TouchableWithoutFeedback>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.5)',
    height: 50,
    ...Platform.select({
      android: {
        elevation: 4, // Add elevation on Android to create shadow effect
      }
    }),
  },
  button: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40, // Ensure minimum touch target size
    minHeight: 40, // Ensure minimum touch target size
  },
  input: {
    flex: 1,
    height: 36,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#444444', // Darker input field to match the dark theme
    color: '#CCCCCC', // Light gray text for input
  },
  webview: {
    flex: 1,
  },
});