import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Clipboard } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { type Wallet, truncateAddress } from '@/utils/walletStorage';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onForget: (wallet: Wallet) => void;
  wallet: Wallet | null;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function WalletDetailsSheet({ isVisible, onClose, onForget, wallet }: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy Address');
  const insets = useSafeAreaInsets();
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

  const handleForget = () => {
    if (wallet) {
      onForget(wallet);
    }
  };

  const handleCopyAddress = () => {
    if (wallet) {
      // Using React Native's built-in Clipboard as a fallback
      Clipboard.setString(wallet.address);
      setCopyButtonText('Copied to clipboard !');
      
      // Reset button text after 1 second
      setTimeout(() => {
        setCopyButtonText('Copy Address');
      }, 1000);
    }
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
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: '#2a2a2a',
            paddingBottom: insets.bottom + 25,
          },
          sheetStyle,
        ]}>
        {/* Windows 95 style title bar */}
        <View style={styles.titleBar}>
          <ThemedText type="title" style={styles.titleText}>
            Wallet Details
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          {wallet ? (
            <>
              <View style={styles.detailContainer}>
                <ThemedText style={styles.label}>Type:</ThemedText>
                <ThemedText style={styles.detailText}>
                  {wallet.type}
                </ThemedText>
              </View>
              
              <View style={styles.detailContainer}>
                <ThemedText style={styles.label}>Address:</ThemedText>
                <ThemedText style={styles.detailText}>
                  {wallet.address}
                </ThemedText>
              </View>
              
              <TouchableOpacity
                style={[styles.button, styles.forgetButton]}
                onPress={handleForget}
                activeOpacity={0.8}>
                <ThemedText style={[styles.buttonText, styles.forgetButtonText]}>Forget this wallet</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.copyButton]}
                onPress={handleCopyAddress}
                activeOpacity={0.8}>
                <ThemedText style={styles.buttonText}>{copyButtonText}</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noWalletContainer}>
              <ThemedText style={styles.noWalletText}>
                No wallet details available.
              </ThemedText>
            </View>
          )}
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
  detailContainer: {
    padding: 12,
    backgroundColor: '#3a3a3a',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#444444',
    borderLeftColor: '#444444',
    borderBottomColor: '#555555',
    borderRightColor: '#555555',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e8e8e8',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#b8b8b8',
    fontFamily: 'SpaceMono-Regular',
  },
  button: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  copyButton: {
    backgroundColor: '#555555',
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
    marginTop: 12,
  },
  forgetButton: {
    backgroundColor: '#555555',
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
    marginTop: 12,
  },
  forgetButtonText: {
    color: '#FF9999', // Softer pastel red
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noWalletContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a3a3a',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#333333',
    borderLeftColor: '#333333',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  noWalletText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#e8e8e8',
  },
});