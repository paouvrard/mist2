import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  View, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  Dimensions
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function ViewOnlyAddressSheet({ isVisible, onClose, onConnect }: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [address, setAddress] = useState('');
  const [isRendered, setIsRendered] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Handle keyboard visibility changes
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    if (isVisible) {
      setIsRendered(true);
      opacity.value = withTiming(1, { duration: 150 });
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withSpring(1000, SPRING_CONFIG, () => {
        runOnJS(setIsRendered)(false);
      });
    }

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setAddress('');
    }
  }, [isVisible]);

  const handleConnect = () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }
    
    if (!address.startsWith('0x') || address.length !== 42) {
      Alert.alert('Error', 'Please enter a valid Ethereum address');
      return;
    }
    
    onConnect(address.trim());
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isRendered && !isVisible) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0,0,0,0.5)' },
          overlayStyle,
        ]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }} 
        />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        style={[
          styles.keyboardAvoidingView,
          { 
            // Add bottom tab bar height to the style instead of to keyboardVerticalOffset
            marginBottom: tabBarHeight
          }
        ]}
        keyboardVerticalOffset={-1}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            sheetStyle,
          ]}>
          <ThemedView style={styles.handle} />
          <ThemedText type="title" style={styles.title}>
            Enter Wallet Address
          </ThemedText>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter wallet address"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />
            <TouchableOpacity
              style={[styles.button, styles.connectButton]}
              onPress={handleConnect}
              activeOpacity={0.8}>
              <ThemedText style={styles.buttonText}>Connect</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000, // Ensure it appears above other elements
  },
  sheet: {
    position: 'relative', // Changed from absolute to relative
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12, // Reduced margin
  },
  inputContainer: {
    width: '100%',
    gap: 12, // Reduced gap
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  button: {
    paddingVertical: 12, // Reduced padding
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#0a7ea4',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});