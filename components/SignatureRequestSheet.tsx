import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { switchChain, signMessage, signTypedData } from '@wagmi/core';
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
  const [isTypedData, setIsTypedData] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hitoMessageSent, setHitoMessageSent] = useState(false);
  const [walletConnectSending, setWalletConnectSending] = useState(false);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const { open } = useAppKit();
  const { address } = useAccount();
  const hitoManager = new HitoManager();

  const parsedMessageDisplay = useMemo(() => {
    try {
      // eth_signTypedData
      const parsedMessage = JSON.parse(message);
      setIsTypedData(true);
      return JSON.stringify(parsedMessage, null, 2);
    } catch (e) {
      // eth_sign
      setIsTypedData(false);
      return message;
    }
  }, [message]);

  // Get screen dimensions for max height calculation
  const windowHeight = Dimensions.get('window').height;
  const maxSheetHeight = windowHeight * 0.8;

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
          runOnJS(setHitoMessageSent)(false);
          runOnJS(setWalletConnectSending)(false);
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
        // TODO check isTypedData
        await hitoManager.writeMessageToNFC(message, currentWallet.address);
        setHitoMessageSent(true);
        setIsLoading(false);
      } else if (currentWallet.type === 'wallet-connect') {
        setWalletConnectSending(true);
        await switchChain(wagmiConfig, { chainId: currentChainId });
        let signature;
        if (isTypedData) {
          signature = await signTypedData(wagmiConfig, JSON.parse(message))
        } else {
          signature = await signMessage(wagmiConfig, { message });
        }
        
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
      setWalletConnectSending(false);
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
    maxHeight: maxSheetHeight,
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
        
        <ScrollView style={styles.scrollView} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}>
          <View style={styles.messageContainer}>
            <ThemedText style={styles.messageLabel}>Message:</ThemedText>
            <ThemedText style={[styles.message]}>
              {parsedMessageDisplay}
            </ThemedText>
          </View>

          {error && (
            <ThemedText style={styles.error}>{error}</ThemedText>
          )}

          {isViewOnly && (
            <ThemedText style={styles.warning}>
              View-only wallet cannot authorize the request
            </ThemedText>
          )}
        </ScrollView>
        
        <View style={styles.buttonContainer}>
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

          {isWalletConnect && accountMatches && !walletConnectSending && (
            <>
              <View style={styles.instructionsContainer}>
                <ThemedText style={styles.instructions}>
                  This will send a signature request to your connected wallet. Check the message above before proceeding.
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[
                  styles.button,
                  (isLoading || isViewOnly) && styles.disabledButton,
                ]}
                onPress={handleApprove}
                disabled={isLoading || isViewOnly}
                activeOpacity={0.8}>
                <ThemedText style={styles.buttonText}>
                  Sign with WalletConnect
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
          
          {isWalletConnect && walletConnectSending && (
            <>
              <View style={styles.instructionsContainer}>
                <ThemedText style={styles.instructions}>
                  Signature request sent to your wallet app. Please check your wallet app and confirm the signature.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.button,
                  styles.disabledButton
                ]}>
                <ThemedText style={styles.buttonText}>
                  Waiting for signature...
                </ThemedText>
              </View>
            </>
          )}
          
          {isHito && !hitoMessageSent && !isLoading && (
            <>
              <View style={styles.instructionsContainer}>
                <ThemedText style={styles.instructions}>
                  This will send the message to your Hito device via NFC.
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.button}
                onPress={handleApprove}
                activeOpacity={0.8}>
                <ThemedText style={styles.buttonText}>
                  Sign with Hito
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
          
          {isHito && isLoading && !hitoMessageSent && (
            <>
              <View style={styles.instructionsContainer}>
                <ThemedText style={styles.instructions}>
                  Select SEND in your Hito device and hold your phone near to transfer the message data.
                </ThemedText>
              </View>
              <View
                style={[
                  styles.button,
                  styles.disabledButton
                ]}>
                <ThemedText style={styles.buttonText}>
                  Sending to Hito...
                </ThemedText>
              </View>
            </>
          )}

          {isHito && hitoMessageSent && (
            <>
              <View style={styles.instructionsContainer}>
                <ThemedText style={styles.instructions}>
                  Sign the message on your device, then scan the QR code with the signature.
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setShowQRScanner(true)}
                activeOpacity={0.8}>
                <ThemedText style={styles.buttonText}>
                  Scan Signature QR Code
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
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
  scrollView: {
    flexGrow: 0,
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
    marginBottom: 0,
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
  instructionsContainer: {
    backgroundColor: '#3a3a3a',
    padding: 16,
    marginBottom: 0,
    marginTop: 16,
    borderRadius: 0,
  },
  instructions: {
    color: '#e8e8e8',
    textAlign: 'center',
  },
  scanButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#0a7a8c',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#0d8fa6',
    borderLeftColor: '#0d8fa6',
    borderBottomColor: '#086475',
    borderRightColor: '#086475',
    marginBottom: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 0,
  },
});