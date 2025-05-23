import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import '@walletconnect/react-native-compat';
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit, defaultWagmiConfig, AppKit } from "@reown/appkit-wagmi-react-native";
import { Platform, StyleSheet, View, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { chains } from '@/utils/chains';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create QueryClient instance
const queryClient = new QueryClient();

const projectId = "2fda7efba5aabbe382ae748b14903bbe"; // Replace with your project ID from cloud.reown.com
const metadata = {
  name: "Mist2",
  description: "Mist2 Mobile Wallet",
  url: "https://mist2.app",
  icons: ["https://mist2.app/icon.png"],
  redirect: {
    native: "mist2://",
    universal: "https://mist2.app"
  }
};

export const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

// Create AppKit instance
createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: mainnet,
  enableAnalytics: true,
  features: {
    swaps: false,
  }
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, 'background');
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }

    // Set Android status bar color to match the app's navigation bar grey color
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#2a2a2a');
      StatusBar.setTranslucent(false);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <View style={[styles.container, { backgroundColor }]}>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                {/* Use StatusBar with proper configuration */}
                <ExpoStatusBar 
                  style={colorScheme === 'dark' ? 'light' : 'dark'} 
                  translucent={false} 
                />
                
                <View style={styles.navigationContainer}>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                </View>
              </ThemeProvider>
              {/* AppKit with higher z-index */}
              <View style={styles.appKitContainer}>
                <AppKit />
              </View>
            </View>
          </SafeAreaProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  navigationContainer: {
    flex: 1,
  },
  appKitContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999, // High z-index to ensure it appears above everything else
    elevation: 999, // For Android
    pointerEvents: 'box-none' // This allows touches to pass through when modal is not visible
  }
});
