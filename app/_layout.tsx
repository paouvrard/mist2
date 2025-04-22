import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import '@walletconnect/react-native-compat';
import { WagmiProvider } from "wagmi";
import { mainnet } from "@wagmi/core/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit, defaultWagmiConfig, AppKit } from "@reown/appkit-wagmi-react-native";

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create QueryClient instance
const queryClient = new QueryClient();

// Configure Reown
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

const chains = [mainnet] as const;
const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

// Create AppKit instance
createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: mainnet,
  enableAnalytics: true,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        <AppKit />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
