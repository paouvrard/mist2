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
import { switchChain, signMessage } from '@wagmi/core';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit-wagmi-react-native';

import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Wallet } from '@/utils/walletStorage';
import { wagmiConfig } from '@/app/_layout';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: (signature: string) => void;
  message: string;
  currentWallet: Wallet | null;
  currentChainId: number;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function SignatureRequestSheet({
  isVisible,
  onClose,
  onSuccess,
  message,
  currentWallet,
  currentChainId
}: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const { open } = useAppKit();
  const { address } = useAccount();

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      opacity.value = withTiming(1);
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      opacity.value = withTiming(0, undefined, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
          runOnJS(setError)(null);
          runOnJS(setIsLoading)(false);
        }
      });
      translateY.value = withSpring(1000, SPRING_CONFIG);
    }
  }, [isVisible]);

  const handleApprove = async () => {
    if (!currentWallet) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await switchChain(wagmiConfig, { chainId: currentChainId });
      const signature = await signMessage(wagmiConfig, { message });
      
      // Call onSuccess with the signature before closing
      if (onSuccess) {
        onSuccess(signature);
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await open();
    } catch (err) {
      setError((err instanceof Error ? err.message : 'Failed to open WalletConnect'));
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

  const isViewOnly = currentWallet?.type === 'view-only';
  const isWalletConnect = currentWallet?.type === 'wallet-connect';
  const accountMatches = currentWallet?.address.toLowerCase() === address?.toLowerCase();

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
          Sign Message
        </ThemedText>

        <View style={styles.messageContainer}>
          <ThemedText style={styles.messageLabel}>Message:</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
        </View>

        {error && (
          <ThemedText style={styles.error}>{error}</ThemedText>
        )}

        {isViewOnly && (
          <ThemedText style={styles.warning}>
            View-only wallet cannot approve the request
          </ThemedText>
        )}

        {isWalletConnect && !address && (
          <>
            <ThemedText style={styles.description}>
              No wallet connected. Connect a wallet to approve this request.
            </ThemedText>
            <TouchableOpacity
              style={[styles.button, styles.connectButton]}
              onPress={handleConnect}
              activeOpacity={0.8}>
              <ThemedText style={styles.buttonText}>Connect Wallet</ThemedText>
            </TouchableOpacity>
          </>
        )}

        {isWalletConnect && address && !accountMatches && (
          <>
            <ThemedText style={styles.description}>
              The account is not connected, switch account from the wallet or reconnect
            </ThemedText>
            <TouchableOpacity
              style={[styles.button, styles.connectButton]}
              onPress={handleConnect}
              activeOpacity={0.8}>
              <ThemedText style={styles.buttonText}>Reconnect</ThemedText>
            </TouchableOpacity>
          </>
        )}

        {isWalletConnect && accountMatches && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.approveButton,
              (isLoading || isViewOnly) && styles.disabledButton,
            ]}
            onPress={handleApprove}
            disabled={isLoading || isViewOnly}
            activeOpacity={0.8}>
            <ThemedText style={styles.buttonText}>
              {isLoading ? 'Signing...' : 'Approve'}
            </ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
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
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  messageContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
  },
  warning: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  connectButton: {
    backgroundColor: '#0a7ea4',
  },
  cancelButton: {
    backgroundColor: '#687076',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});