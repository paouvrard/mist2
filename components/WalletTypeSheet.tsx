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
            backgroundColor,
            paddingBottom: insets.bottom + 65,
          },
          sheetStyle,
        ]}>
        <ThemedView style={styles.handle} />
        <ThemedText type="title" style={styles.title}>
          Select Wallet Type
        </ThemedText>
        
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
          style={[styles.button, styles.typeButton, styles.disabledButton]}
          activeOpacity={0.8}>
          <ThemedText style={[styles.buttonText, styles.disabledText]}>Lattice1 (Coming Soon)</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.typeButton, styles.disabledButton]}
          activeOpacity={0.8}>
          <ThemedText style={[styles.buttonText, styles.disabledText]}>Ledger (Coming Soon)</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.typeButton, styles.disabledButton]}
          activeOpacity={0.8}>
          <ThemedText style={[styles.buttonText, styles.disabledText]}>Private Key (Coming Soon)</ThemedText>
        </TouchableOpacity>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 16,
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
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeButton: {
    backgroundColor: '#0a7ea4',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  disabledText: {
    color: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});