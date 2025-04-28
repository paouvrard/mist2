import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
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
import { getWallets, type Wallet, truncateAddress } from '@/utils/walletStorage';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onConnect: (wallet: Wallet) => void;
  onCancel: () => void;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function WalletConnectSheet({ isVisible, onClose, onConnect, onCancel }: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  // Add state to track if the sheet is fully rendered and animated in
  const [isFullyVisible, setIsFullyVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadWallets();
      setIsRendered(true);
      opacity.value = withTiming(1);
      translateY.value = withSpring(0, SPRING_CONFIG, () => {
        // Mark as fully visible after animation completes
        runOnJS(setIsFullyVisible)(true);
      });
    } else {
      setIsFullyVisible(false);
      opacity.value = withTiming(0, undefined, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
          runOnJS(setSelectedWallet)(null);
        }
      });
      translateY.value = withSpring(1000, SPRING_CONFIG);
    }
  }, [isVisible]);

  const loadWallets = async () => {
    const savedWallets = await getWallets();
    setWallets(savedWallets);
  };

  const handleConnect = () => {
    if (selectedWallet && isFullyVisible) {
      onConnect(selectedWallet);
    }
  };

  const handleCancel = () => {
    if (isFullyVisible) {
      onCancel();
    }
  };

  const handleClose = () => {
    if (isFullyVisible) {
      onClose();
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
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
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
          Connect Wallet
        </ThemedText>
        <ThemedText style={styles.description}>
          Select a wallet to connect to this website
        </ThemedText>
        
        <ScrollView style={styles.walletList} keyboardShouldPersistTaps="handled">
          {wallets.map((wallet, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.walletOption,
                (selectedWallet?.address === wallet.address && selectedWallet?.type === wallet.type) &&
                  styles.selectedWallet,
              ]}
              onPress={() => setSelectedWallet(wallet)}
              activeOpacity={0.8}>
              <ThemedText style={styles.walletType}>
                {wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)}
              </ThemedText>
              <ThemedText style={styles.walletAddress}>
                {truncateAddress(wallet.address)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.button,
            styles.connectButton,
            !selectedWallet && styles.disabledButton,
          ]}
          onPress={handleConnect}
          disabled={!selectedWallet}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>
            {wallets.length === 0 ? 'No wallets available' : 'Connect'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
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
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 16,
  },
  walletList: {
    maxHeight: 300, // Increased from 200 to show more wallets before scrolling
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
  connectButton: {
    backgroundColor: '#0a7ea4',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  cancelButton: {
    backgroundColor: '#687076',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});