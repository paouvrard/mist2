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
import { sendTransaction, switchChain } from '@wagmi/core';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit-wagmi-react-native';
import type { Transaction } from 'viem';

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
  onSuccess?: (hash: string) => void;
  transaction: Transaction;
  currentWallet: Wallet | null;
  currentChainId: number;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function TransactionRequestSheet({ 
  isVisible, 
  onClose, 
  onSuccess,
  transaction, 
  currentWallet,
  currentChainId,
}: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
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
      // Handle different wallet types
      if (currentWallet.type === 'hito') {
        console.log('Sending transaction to Hito wallet for signing:', transaction);
        
        // Check NFC support
        const nfcStatus = await HitoManager.checkNFCSupport();
        if (!nfcStatus.isSupported) {
          throw new Error(nfcStatus.message || 'NFC is required and not available');
        }
        
        // Format transaction for Hito
        const formattedTx = hitoManager.formatTransaction(transaction, currentWallet.address);
        
        // Send transaction to Hito via NFC
        await hitoManager.writeTransactionToNFC(formattedTx);
        
        // Show alert and prepare to scan QR code for signature
        Alert.alert(
          'Transaction Sent to Hito',
          'Please sign the transaction on your Hito device, then scan the QR code with the signature.',
          [
            { text: 'Scan Signature', onPress: () => setShowQRScanner(true) }
          ]
        );
        
        // We'll continue the transaction process when QR is scanned
        setIsLoading(false);
      } else if (currentWallet.type === 'wallet-connect') {
        await switchChain(wagmiConfig, { chainId: currentChainId });
        // Send the transaction
        const hash = await sendTransaction(wagmiConfig, transaction);
        
        // Call onSuccess with the transaction hash before closing
        if (onSuccess) {
          onSuccess(hash);
        }
        
        onClose();
      } else if (currentWallet.type === 'view-only') {
        throw new Error('View-only wallets cannot send transactions');
      } else {
        await switchChain(wagmiConfig, { chainId: currentChainId });
        // Send the transaction
        const hash = await sendTransaction(wagmiConfig, transaction);
        
        // Call onSuccess with the transaction hash before closing
        if (onSuccess) {
          onSuccess(hash);
        }
        
        onClose();
      }
    } catch (err) {
      console.error('Transaction error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to send transaction');
      } else {
        setError('Failed to send transaction');
      }
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await open();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to open WalletConnect');
      } else {
        setError('Failed to open WalletConnect');
      }
    }
  };
  
  // Handle signature from QR scanner for Hito wallet
  const handleSignatureScanned = async (signatureData: string) => {
    console.log('Transaction signature received from QR code:', signatureData);
    
    try {
      setIsLoading(true);
      
      // Process the signature
      const signedTx = hitoManager.processScannedSignature(signatureData);
      console.log('Processed signed transaction:', signedTx);
      const txHash = ""
      
      if (onSuccess) {
        onSuccess(txHash);
      }
      
      onClose();
    } catch (error) {
      console.error('Error processing or broadcasting transaction:', error);
      setError(error instanceof Error ? error.message : 'Failed to broadcast transaction');
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
            backgroundColor,
            paddingBottom: insets.bottom + 65,
          },
          sheetStyle,
        ]}>
        <ThemedView style={styles.handle} />
        <ThemedText type="title" style={styles.title}>
          Transaction Request
        </ThemedText>

        <View style={styles.detailsContainer}>
          {transaction.to && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>To:</ThemedText>
              <ThemedText style={styles.detailValue}>{transaction.to}</ThemedText>
            </View>
          )}
          {transaction.value && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Value:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {transaction.value.toString()} Wei
              </ThemedText>
            </View>
          )}
          {transaction.data && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Data:</ThemedText>
              <ThemedText style={styles.detailValue}>{transaction.data}</ThemedText>
            </View>
          )}
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
              {isLoading ? 'Sending...' : 'Approve'}
            </ThemedText>
          </TouchableOpacity>
        )}
        
        {isHito && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.approveButton,
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
          style={[
            styles.button,
            styles.cancelButton,
            isLoading && styles.disabledButton,
          ]}
          onPress={!isLoading ? onClose : undefined}
          disabled={isLoading}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </TouchableOpacity>
      </Animated.View>
      
      {/* QR Scanner for Hito signature */}
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
  detailsContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    opacity: 0.9,
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