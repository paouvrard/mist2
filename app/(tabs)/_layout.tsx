import { Tabs, useRouter } from 'expo-router';
import React, { useState, useRef, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TabVisibilityContext } from '@/hooks/useTabVisibility';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [hideTabBar, setHideTabBar] = useState(false);
  const router = useRouter();
  const previousRoute = useRef('');
  const currentRoute = useRef('');

  // Handler for tab screen changes
  const handleTabPress = useCallback((name: string) => {
    previousRoute.current = currentRoute.current;
    currentRoute.current = name;

    // If we're switching from browser to index, we need to reset the browser screen
    if (name === 'index' && previousRoute.current === 'browser') {
      // Use the global event system to notify the browser to reset
      router.setParams({ resetWebView: 'true' });
    }
  }, [router]);

  return (
    <TabVisibilityContext.Provider value={{ hideTabBar, setHideTabBar }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: [
            styles.tabBar,
            Platform.select({
              ios: {
                backgroundColor: 'transparent',
              },
              default: {},
            }),
            hideTabBar && styles.hidden,
          ],
          tabBarShowLabel: false, // Hide the text labels
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Wallets', // Keep title for accessibility
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="key.fill" color={color} />,
          }}
          listeners={{
            tabPress: () => handleTabPress('index')
          }}
        />
        <Tabs.Screen
          name="browser"
          options={{
            title: 'Browser', // Keep title for accessibility
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="safari.fill" color={color} />,
          }}
          listeners={{
            tabPress: () => handleTabPress('browser')
          }}
        />
      </Tabs>
    </TabVisibilityContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 50,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.3)',
    elevation: 8,
    justifyContent: 'center', // Center items vertically
    paddingBottom: 0, // Remove default padding to ensure true centering
  },
  hidden: {
    display: 'none',
  },
});
