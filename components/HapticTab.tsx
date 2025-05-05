import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Dimensions, Platform, View } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const isFocused = props.accessibilityState?.selected || false;
  
  // Retro 3D button colors in dark mode
  const baseColor = '#444444';
  const highlightColor = '#666666';
  const shadowColor = '#222222';
  
  // Apply platform-specific styling
  const isAndroid = Platform.OS === 'android';
  
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      style={[
        styles.tabButton,
        isAndroid && styles.androidTabButton,
      ]}>
      <View style={[
        styles.innerButtonContainer,
        {
          backgroundColor: isFocused ? baseColor : 'transparent',
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderTopColor: isFocused ? highlightColor : 'transparent',
          borderLeftColor: isFocused ? highlightColor : 'transparent',
          borderRightColor: isFocused ? shadowColor : 'transparent',
          borderBottomColor: isFocused ? shadowColor : 'transparent',
        },
        // Android-specific shadow for 3D effect
        isAndroid && isFocused && styles.androidFocusedButton,
        // iOS transform for pressed effect
        !isAndroid && isFocused && { transform: [{ translateY: 1 }] }
      ]}>
        {props.children}
      </View>
    </PlatformPressable>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  tabButton: {
    width: screenWidth / 2, // Each tab takes half the screen width
    flex: 1,
    margin: 0,
    padding: 0,
    height: '100%', // Fill the full height of tab bar
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidTabButton: {
    paddingVertical: 0, // Reset any default padding that might cause height issues
  },
  innerButtonContainer: {
    flex: 1,
    width: '100%',
    height: '100%', // Fill the full height
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  androidFocusedButton: {
    elevation: 4, // Add Android elevation for 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
