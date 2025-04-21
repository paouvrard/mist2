import { Tabs } from 'expo-router';
import React, { useState } from 'react';
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
            title: 'Home', // Keep title for accessibility
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="browser"
          options={{
            title: 'Browser', // Keep title for accessibility
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="safari.fill" color={color} />,
          }}
        />
      </Tabs>
    </TabVisibilityContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 49, // Standard iOS tab bar height
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.3)',
    elevation: 8,
  },
  hidden: {
    display: 'none',
  },
});
