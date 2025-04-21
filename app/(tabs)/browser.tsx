import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { WalletConnectSheet } from '@/components/WalletConnectSheet';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getEthereumProvider } from '@/utils/ethereumProvider';

// Get the provider injection code
const INJECT_PROVIDER_JS = getEthereumProvider();

export default function BrowserScreen() {
  const [url, setUrl] = useState('https://app.uniswap.org');
  const [currentUrl, setCurrentUrl] = useState('https://app.uniswap.org');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isWalletSheetVisible, setIsWalletSheetVisible] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const webViewRef = useRef<WebView>(null);
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  const handleConnect = useCallback((request: any, id: number) => {
    setPendingRequestId(id);
    setIsWalletSheetVisible(true);
  }, []);

  const handleConnectConfirm = useCallback(() => {
    if (pendingRequestId !== null && webViewRef.current) {
      setIsConnected(true);
      const address = '0x0000000000000000000000000000000000000000';
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
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.addressBar}>
        <TouchableOpacity 
          onPress={() => webViewRef.current?.goBack()}
          style={styles.button}>
          <IconSymbol size={20} name="chevron.left" color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => webViewRef.current?.goForward()}
          style={styles.button}>
          <IconSymbol size={20} name="chevron.right" color={textColor} />
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
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url);
        }}
        injectedJavaScriptBeforeContentLoaded={INJECT_PROVIDER_JS}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      <WalletConnectSheet
        isVisible={isWalletSheetVisible}
        onClose={() => handleConnectCancel()}
        onConnect={handleConnectConfirm}
        onCancel={handleConnectCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 49, // Match the tab bar height
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  button: {
    padding: 10,
  },
  input: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  webview: {
    flex: 1,
  },
});