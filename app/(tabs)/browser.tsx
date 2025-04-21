import React, { useCallback, useRef, useState, useEffect } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { WalletConnectSheet } from '@/components/WalletConnectSheet';
import { WalletInfoSheet } from '@/components/WalletInfoSheet';
import { WelcomePage } from '@/components/WelcomePage';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getEthereumProvider } from '@/utils/ethereumProvider';
import { useTabVisibility } from '@/hooks/useTabVisibility';

// Get the provider injection code
const INJECT_PROVIDER_JS = getEthereumProvider();

export default function BrowserScreen() {
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isWalletSheetVisible, setIsWalletSheetVisible] = useState(false);
  const [isWalletInfoSheetVisible, setIsWalletInfoSheetVisible] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigationBarHeight = 50; // Fixed height for the navigation bar
  const { setHideTabBar } = useTabVisibility();
  const address = '0x10AfAE3f75c4AbCE599966602e859d499E6745E4';

  // Update tab visibility when showing/hiding welcome screen
  useEffect(() => {
    setHideTabBar(!showWelcome);
  }, [showWelcome, setHideTabBar]);

  const handleConnect = useCallback((request: any, id: number) => {
    setPendingRequestId(id);
    setIsWalletSheetVisible(true);
  }, []);

  const handleConnectConfirm = useCallback(() => {
    if (pendingRequestId !== null && webViewRef.current) {
      setIsConnected(true);
      setConnectedAddress(address);
      webViewRef.current.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${pendingRequestId},
          type: 'eth_requestAccounts',
          result: ['${address}']
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
    setConnectedAddress(null);
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

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ethereum_request') {
        switch (data.payload.method) {
          case 'eth_requestAccounts':
            if (!isConnected) {
              handleConnect(data.payload, data.id);
            } else if (connectedAddress && webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  type: 'eth_requestAccounts',
                  result: ['${connectedAddress}']
                });
              `);
            }
            break;
            
          case 'eth_chainId':
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: '0x1'
                });
              `);
            }
            break;
            
          case 'net_version':
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: '1'
                });
              `);
            }
            break;

          case 'eth_accounts':
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: ${isConnected && connectedAddress ? `['${connectedAddress}']` : '[]'}
                });
              `);
            }
            break;

          case 'wallet_switchEthereumChain':
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: null
                });
              `);
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
  }, [isConnected, connectedAddress, handleConnect]);

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

  if (showWelcome) {
    return <WelcomePage onNavigate={goToUrl} />;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.webviewContainer, { 
        paddingTop: insets.top,
        marginBottom: navigationBarHeight + tabBarHeight,
      }]}>
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
          />
        )}
      </View>
      <View style={[styles.navigationBar, { 
        bottom: tabBarHeight,
        marginBottom: 6
      }]}>
        <TouchableOpacity 
          onPress={handleBackPress}
          style={styles.button}>
          <IconSymbol size={20} name="chevron.left" color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleHomePress}
          style={styles.button}>
          <IconSymbol size={20} name="house.fill" color={textColor} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: textColor }]}
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
          <IconSymbol size={20} name="key.fill" color={textColor} />
        </TouchableOpacity>
      </View>
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
        walletAddress={address}
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
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.3)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
    height: 50,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  button: {
    padding: 10,
  },
  input: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  webview: {
    flex: 1,
  },
});