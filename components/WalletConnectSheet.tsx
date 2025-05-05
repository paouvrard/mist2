import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform, ScrollView, View } from 'react-native';
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
  const textColor = useThemeColor({}, 'text');
  const [isFullyVisible, setIsFullyVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadWallets();
      setIsRendered(true);
      opacity.value = withTiming(1);
      translateY.value = withSpring(0, SPRING_CONFIG, () => {
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
            backgroundColor: '#2a2a2a',
            paddingBottom: insets.bottom + 25,
          },
          sheetStyle,
        ]}>
        <View style={styles.titleBar}>
          <ThemedText type="title" style={styles.titleText}>
            Connect Wallet
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
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
  description: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#e8e8e8',
  },
  walletList: {
    maxHeight: 300,
  },
  walletOption: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#555555',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  selectedWallet: {
    backgroundColor: '#666666',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#444444',
    borderLeftColor: '#444444',
    borderBottomColor: '#888888',
    borderRightColor: '#888888',
  },
  walletType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#e8e8e8',
  },
  walletAddress: {
    fontSize: 14,
    color: '#b8b8b8',
  },
  button: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    marginBottom: 12,
  },
  connectButton: {
    backgroundColor: '#555555',
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  disabledButton: {
    backgroundColor: '#444444',
    borderTopColor: '#666666',
    borderLeftColor: '#666666',
    borderBottomColor: '#333333',
    borderRightColor: '#333333',
  },
  cancelButton: {
    backgroundColor: '#555555',
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});