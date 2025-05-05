import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BlurTabBarBackground() {
  // Always use dark mode background color
  const backgroundColor = 'rgba(30, 30, 30, 0.9)';
  
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor }]}>
      <BlurView
        // Dark blur for consistent dark mode styling
        tint="dark"
        intensity={70}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function useBottomTabOverflow() {
  const tabHeight = useBottomTabBarHeight();
  const { bottom } = useSafeAreaInsets();
  return tabHeight - bottom;
}
