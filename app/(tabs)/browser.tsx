import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getEthereumProvider } from '@/utils/ethereumProvider';

// Get the provider injection code
const INJECT_PROVIDER_JS = getEthereumProvider();

export default function BrowserScreen() {
  const [url, setUrl] = useState('https://app.uniswap.org');
  const [currentUrl, setCurrentUrl] = useState('https://app.uniswap.org');
  const webViewRef = useRef<WebView>(null);
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ethereum_request') {
        handleEthereumRequest(data.payload, data.id);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }, []);

  const handleEthereumRequest = async (request: any, id: number) => {
    try {
      let response: any;
      
      switch (request.method) {
        case 'eth_requestAccounts':
          response = {
            id,
            result: ['0x0000000000000000000000000000000000000000']
          };
          break;
        
        case 'eth_chainId':
          response = {
            id,
            result: '0x1' // mainnet
          };
          break;
          
        case 'net_version':
          response = {
            id,
            result: '1' // mainnet
          };
          break;

        case 'eth_accounts':
          response = {
            id,
            result: ['0x0000000000000000000000000000000000000000']
          };
          break;

        case 'wallet_switchEthereumChain':
          response = {
            id,
            result: null // success
          };
          break;
          
        default:
          response = {
            id,
            error: {
              code: 4200,
              message: `Method ${request.method} not supported`
            }
          };
          console.warn('Unsupported Ethereum request:', request.method);
      }

      // Send response back to WebView
      webViewRef.current?.injectJavaScript(`
        window.ethereum._resolveRequest(${JSON.stringify(response)});
        true;
      `);
    } catch (error) {
      console.error('Error handling Ethereum request:', error);
      webViewRef.current?.injectJavaScript(`
        window.ethereum._resolveRequest({
          id: ${id},
          error: {
            code: 4001,
            message: 'Error processing request'
          }
        });
        true;
      `);
    }
  };

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
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