import { Tabs, useRouter } from 'expo-router';
import React, { useState, useRef, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { TabVisibilityContext } from '@/hooks/useTabVisibility';

export default function TabLayout() {
  const [hideTabBar, setHideTabBar] = useState(false);
  const router = useRouter();
  const previousRoute = useRef('');
  const currentRoute = useRef('');

  // Handler for tab screen changes
  const handleTabPress = useCallback((name: string) => {
    previousRoute.current = currentRoute.current;
    currentRoute.current = name;

    // If we're switching from apps to index, we need to reset the apps screen
    if (name === 'index' && previousRoute.current === 'apps') {
      // Use the global event system to notify the apps to reset
      router.setParams({ resetWebView: 'true' });
    }
  }, [router]);

  return (
    <TabVisibilityContext.Provider value={{ hideTabBar, setHideTabBar }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: (props) => <HapticTab {...props} />,
          tabBarBackground: () => <TabBarBackground />,
          tabBarStyle: [
            styles.tabBar,
            Platform.select({
              ios: styles.iosTabBar,
              android: styles.androidTabBar,
              default: {},
            }),
            hideTabBar && styles.hidden,
          ],
          tabBarShowLabel: true,
          tabBarLabelStyle: [
            styles.tabLabel,
            Platform.OS === 'android' && styles.androidTabLabel,
          ],
          tabBarActiveTintColor: '#ECEDEE', // Always dark mode text color
          tabBarInactiveTintColor: '#9BA1A6', // Always dark mode inactive color
          tabBarIconStyle: { display: 'none' }, // Hide default icons
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'WALLETS',
            tabBarLabel: 'WALLETS',
          }}
          listeners={{
            tabPress: () => handleTabPress('index')
          }}
        />
        <Tabs.Screen
          name="apps"
          options={{
            title: 'APPS',
            tabBarLabel: 'APPS',
          }}
          listeners={{
            tabPress: () => handleTabPress('apps')
          }}
        />
      </Tabs>
    </TabVisibilityContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.3)',
  },
  iosTabBar: {
    height: 70, // Keep iOS tab bar at 70px
    backgroundColor: 'transparent',
  },
  androidTabBar: {
    height: 50, // Reduced height for Android
    paddingBottom: 0,
    paddingTop: 0,
  },
  hidden: {
    display: 'none',
  },
  tabLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
    paddingBottom: 0,
    margin: 0,
  },
  androidTabLabel: {
    paddingTop: 2, // Reduced padding to match the smaller tab bar height
  },
});
