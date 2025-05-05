import { View, StyleSheet } from 'react-native';

export default function TabBarBackground() {
  // Use dark mode background color (no need for colorScheme check)
  const backgroundColor = '#1e1e1e';
  
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
