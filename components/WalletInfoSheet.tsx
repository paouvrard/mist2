import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
import { getWallets, type Wallet } from '@/utils/walletStorage';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  onSwitchWallet: (wallet: Wallet) => void;
  wallet: Wallet;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function WalletInfoSheet({ isVisible, onClose, onDisconnect, onSwitchWallet, wallet }: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    if (isVisible) {
      loadWallets();
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

  const loadWallets = async () => {
    const savedWallets = await getWallets();
    setWallets(savedWallets);
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
            backgroundColor,
            paddingBottom: insets.bottom + 65,
          },
          sheetStyle,
        ]}>
        <ThemedView style={styles.handle} />
        <ThemedText type="title" style={styles.title}>
          Connected Wallet
        </ThemedText>
        
        <ScrollView style={styles.walletList}>
          {wallets.map((walletItem, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.walletOption,
                walletItem.address === wallet.address && styles.selectedWallet,
              ]}
              onPress={() => {
                if (walletItem.address !== wallet.address) {
                  onSwitchWallet(walletItem);
                }
              }}
              activeOpacity={0.8}>
              <ThemedText style={styles.walletType}>
                {walletItem.type.charAt(0).toUpperCase() + walletItem.type.slice(1)}
              </ThemedText>
              <ThemedText style={styles.walletAddress}>
                {walletItem.address}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={onDisconnect}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>Disconnect</ThemedText>
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
  walletList: {
    maxHeight: 200,
  },
  walletOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 8,
  },
  selectedWallet: {
    backgroundColor: 'rgba(10,126,164,0.1)',
    borderColor: '#0a7ea4',
    borderWidth: 1,
  },
  walletType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 14,
    opacity: 0.7,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});