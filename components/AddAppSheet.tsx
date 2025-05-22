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
  TouchableWithoutFeedback
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

import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTabVisibility } from '@/hooks/useTabVisibility';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onAddApp: (name: string, url: string) => void;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function AddAppSheet({ isVisible, onClose, onAddApp }: Props) {
  const insets = useSafeAreaInsets();
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [isRendered, setIsRendered] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const textColor = useThemeColor({}, 'text');
  const { setHideTabBar } = useTabVisibility();
  const tabBarHeight = useBottomTabBarHeight();

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
      // Hide tab bar when sheet is open
      setHideTabBar(true);
    } else {
      opacity.value = withTiming(0, undefined, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
      translateY.value = withSpring(1000, SPRING_CONFIG);
      // Show tab bar when sheet is closed
      setHideTabBar(false);
    }

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      // Ensure tab bar is shown when component is unmounted
      setHideTabBar(false);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setAppName('');
      setAppUrl('');
    }
  }, [isVisible]);

  const handleAdd = () => {
    if (!appName.trim()) {
      Alert.alert('Error', 'Please enter an app name');
      return;
    }
    
    if (!appUrl.trim()) {
      Alert.alert('Error', 'Please enter an app URL');
      return;
    }
    
    // Basic URL validation
    let processedUrl = appUrl.trim();
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = 'https://' + processedUrl;
    }
    
    onAddApp(appName.trim(), processedUrl);
    Keyboard.dismiss();
    onClose();
  };

  const closeSheet = () => {
    Keyboard.dismiss();
    onClose();
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
      {/* Overlay that covers the entire screen */}
      <Animated.View
        style={[
          styles.overlay,
          { backgroundColor: 'rgba(0,0,0,0.5)' },
          overlayStyle,
        ]}>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.overlayTouchable} />
        </TouchableWithoutFeedback>
      </Animated.View>
      
      {/* Keyboard avoiding container for the sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        
        {/* The actual sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: '#2a2a2a',
              paddingBottom: insets.bottom + 25,
            },
            sheetStyle,
          ]}>
          
          {/* Title bar */}
          <View style={styles.titleBar}>
            <ThemedText type="title" style={styles.titleText}>
              ADD MY APP
            </ThemedText>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeSheet}>
              <Ionicons name="close" size={16} color={textColor} />
            </TouchableOpacity>
          </View>
          
          {/* Content area */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.content}>
              <TextInput
                style={styles.input}
                value={appName}
                onChangeText={setAppName}
                placeholder="App Name"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
              
              <TextInput
                style={styles.input}
                value={appUrl}
                onChangeText={setAppUrl}
                placeholder="App URL (e.g., app.uniswap.org)"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              
              <TouchableOpacity
                style={styles.button}
                onPress={handleAdd}
                activeOpacity={0.8}>
                <ThemedText style={styles.buttonText}>ADD</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
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