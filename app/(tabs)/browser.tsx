import React, { useState, useRef } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function BrowserScreen() {
  const [url, setUrl] = useState('https://google.com');
  const [currentUrl, setCurrentUrl] = useState('https://google.com');
  const webViewRef = useRef<WebView>(null);
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

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