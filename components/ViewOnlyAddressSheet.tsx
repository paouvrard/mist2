import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  View, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard
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
import { Ionicons } from '@expo/vector-icons';

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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [address, setAddress] = useState('');
  const [isRendered, setIsRendered] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const textColor = useThemeColor({}, 'text');

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
      opacity.value = withTiming(1);
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      opacity.value = withTiming(0, undefined, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
      translateY.value = withSpring(1000, SPRING_CONFIG);
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: '#2a2a2a', // Darker gray for retro windows
              paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
            },
            sheetStyle,
          ]}>
          
          {/* Windows 95 style title bar */}
          <View style={styles.titleBar}>
            <ThemedText type="title" style={styles.titleText}>
              Enter Wallet Address
            </ThemedText>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}>
              <Ionicons name="close" size={16} color={textColor} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
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
              style={styles.button}
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
    position: 'relative',
    width: '100%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#666666',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a7a8c',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  titleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 20,
    height: 20,
    backgroundColor: '#c0c0c0',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderBottomColor: '#555555',
    borderRightColor: '#555555',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  input: {
    backgroundColor: '#444444',
    borderRadius: 0,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#333333',
    borderLeftColor: '#333333',
    borderBottomColor: '#666666',
    borderRightColor: '#666666',
  },
  button: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
    backgroundColor: '#555555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});