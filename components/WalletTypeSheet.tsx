import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSelectWalletType: (type: 'view-only' | 'wallet-connect' | 'hito') => void;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function WalletTypeSheet({ isVisible, onClose, onSelectWalletType }: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
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
  }, [isVisible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleViewOnlySelect = () => {
    onSelectWalletType('view-only');
  };

  const handleWalletConnectSelect = () => {
    onSelectWalletType('wallet-connect');
  };

  const handleHitoSelect = () => {
    onSelectWalletType('hito');
  };

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
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: '#2a2a2a', // Darker gray for retro windows
            paddingBottom: insets.bottom + 25,
          },
          sheetStyle,
        ]}>
        {/* Windows 95 title bar */}
        <View style={styles.titleBar}>
          <ThemedText type="title" style={styles.titleText}>
            Select Wallet Type
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.button, styles.typeButton]}
            onPress={handleViewOnlySelect}
            activeOpacity={0.8}>
            <ThemedText style={styles.buttonText}>View Only</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.typeButton]}
            onPress={handleWalletConnectSelect}
            activeOpacity={0.8}>
            <ThemedText style={styles.buttonText}>WalletConnect</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.typeButton]}
            onPress={handleHitoSelect}
            activeOpacity={0.8}>
            <ThemedText style={styles.buttonText}>Hito</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.disabledButton]}
            activeOpacity={0.8}>
            <ThemedText style={[styles.buttonText, styles.disabledText]}>Lattice1 (Coming Soon)</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.disabledButton]}
            activeOpacity={0.8}>
            <ThemedText style={[styles.buttonText, styles.disabledText]}>Ledger (Coming Soon)</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.disabledButton]}
            activeOpacity={0.8}>
            <ThemedText style={[styles.buttonText, styles.disabledText]}>Private Key (Coming Soon)</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.disabledButton]}
            activeOpacity={0.8}>
            <ThemedText style={[styles.buttonText, styles.disabledText]}>Smart Wallet (Coming Soon)</ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  typeButton: {
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#444444',
    borderTopColor: '#666666',
    borderLeftColor: '#666666',
    borderBottomColor: '#333333',
    borderRightColor: '#333333',
    marginBottom: 12,
  },
  disabledText: {
    color: '#888888',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});