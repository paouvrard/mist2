import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Wallet } from '@/utils/walletStorage';
import { wagmiConfig } from '@/app/_layout';
import { HitoManager } from '@/utils/hito/hitoManager';
import { QRScannerSheet } from './QRScannerSheet';

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
  const [showQRScanner, setShowQRScanner] = useState(false);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const { open } = useAppKit();
  const { address } = useAccount();
  const hitoManager = new HitoManager();

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
          runOnJS(setShowQRScanner)(false);
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
      if (currentWallet.type === 'hito') {
        console.log('Signing message with Hito wallet:', message);
        
        const nfcStatus = await HitoManager.checkNFCSupport();
        if (!nfcStatus.isSupported) {
          throw new Error(nfcStatus.message || 'NFC is required and not available');
        }
        
        await hitoManager.writeMessageToNFC(message, currentWallet.address);
        
        Alert.alert(
          'Message Sent to Hito',
          'Please sign the message on your Hito device, then scan the QR code with the signature.',
          [
            { text: 'Scan Signature', onPress: () => setShowQRScanner(true) }
          ]
        );
        
        setIsLoading(false);
      } else if (currentWallet.type === 'wallet-connect') {
        await switchChain(wagmiConfig, { chainId: currentChainId });
        const signature = await signMessage(wagmiConfig, { message });
        
        if (onSuccess) {
          onSuccess(signature);
        }
        
        onClose();
      } else if (currentWallet.type === 'view-only') {
        throw new Error('View-only wallets cannot sign messages');
      } else {
        throw new Error('Unsupported wallet type');
      }
    } catch (err) {
      console.error('Message signing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign message');
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
  
  const handleSignatureScanned = (signatureData: string) => {
    console.log('Signature received from QR code:', signatureData);
    
    try {
      setIsLoading(true);
      
      const signature = hitoManager.processScannedSignature(signatureData);
      console.log('Processed signature:', signature);
      
      if (onSuccess) {
        onSuccess(signature);
      }
      
      onClose();
    } catch (error) {
      console.error('Error processing signature:', error);
      setError(error instanceof Error ? error.message : 'Invalid signature');
      setIsLoading(false);
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
  const isHito = currentWallet?.type === 'hito';
  const accountMatches = currentWallet?.address.toLowerCase() === address?.toLowerCase();

  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0,0,0,0.5)' },
          overlayStyle,
        ]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={!isLoading ? onClose : undefined} />
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
            Sign Message
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
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
                style={styles.button}
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
                style={styles.button}
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
          
          {isHito && (
            <TouchableOpacity
              style={[
                styles.button,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleApprove}
              disabled={isLoading}
              activeOpacity={0.8}>
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Preparing...' : 'Sign with Hito'}
              </ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.8}>
            <ThemedText style={styles.buttonText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <QRScannerSheet
        isVisible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        purpose="signature"
        onScanComplete={handleSignatureScanned}
        keepTabBarHidden={true}
      />
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
  messageContainer: {
    backgroundColor: '#3a3a3a',
    padding: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#333333',
    borderLeftColor: '#333333',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  messageLabel: {
    fontSize: 14,
    color: '#b8b8b8',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#e8e8e8',
  },
  warning: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#555555',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#444444',
    borderTopColor: '#666666',
    borderLeftColor: '#666666',
    borderBottomColor: '#333333',
    borderRightColor: '#333333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});