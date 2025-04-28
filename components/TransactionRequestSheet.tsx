import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
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
import { populateTransactionFields, formatTransactionForDisplay } from '@/utils/transactionUtils';

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
  
  const [populatingTransaction, setPopulatingTransaction] = useState(false);
  const [populatedTransaction, setPopulatedTransaction] = useState<Partial<Transaction>>(transaction);
  const [populationError, setPopulationError] = useState<string | null>(null);
  
  const formattedTx = useMemo(() => {
    return formatTransactionForDisplay(populatedTransaction);
  }, [populatedTransaction]);
  
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const { open } = useAppKit();
  const { address } = useAccount();
  const hitoManager = new HitoManager();

  useEffect(() => {
    if (isVisible) {
      populateTransactionData();
    }
  }, [isVisible, transaction, currentChainId]);

  const populateTransactionData = async () => {
    if (!isVisible) return;
    
    setPopulatingTransaction(true);
    setPopulationError(null);
    
    try {
      const populated = await populateTransactionFields(transaction, currentChainId);
      setPopulatedTransaction(populated);
    } catch (err) {
      console.error('Failed to populate transaction:', err);
      setPopulationError('Failed to load complete transaction details');
      setPopulatedTransaction(transaction);
    } finally {
      setPopulatingTransaction(false);
    }
  };

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
          runOnJS(setPopulationError)(null);
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
      const txToSend = populatedTransaction;

      if (currentWallet.type === 'hito') {
        console.log('Sending transaction to Hito wallet for signing:', txToSend);
        
        const nfcStatus = await HitoManager.checkNFCSupport();
        if (!nfcStatus.isSupported) {
          throw new Error(nfcStatus.message || 'NFC is required and not available');
        }
        
        // const formattedTx = hitoManager.formatTransaction(txToSend, currentWallet.address);
        
        await hitoManager.writeTransactionToNFC(txToSend);
        
        Alert.alert(
          'Transaction Sent to Hito',
          'Please sign the transaction on your Hito device, then scan the QR code with the signature.',
          [
            { text: 'Scan Signature', onPress: () => setShowQRScanner(true) }
          ]
        );
        
        setIsLoading(false);
      } else if (currentWallet.type === 'wallet-connect') {
        await switchChain(wagmiConfig, { chainId: currentChainId });
        const hash = await sendTransaction(wagmiConfig, txToSend);
        
        if (onSuccess) {
          onSuccess(hash);
        }
        
        onClose();
      } else if (currentWallet.type === 'view-only') {
        throw new Error('View-only wallets cannot send transactions');
      } else {
        await switchChain(wagmiConfig, { chainId: currentChainId });
        const hash = await sendTransaction(wagmiConfig, txToSend);
        
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
  
  const handleSignatureScanned = async (signatureData: string) => {
    console.log('Transaction signature received from QR code:', signatureData);
    
    try {
      setIsLoading(true);
      
      const signedTx = hitoManager.processScannedSignature(signatureData);
      console.log('Processed signed transaction:', signedTx);
      throw "TODO broadcast the signed transaction";
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
          {populatingTransaction ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0a7ea4" />
              <ThemedText style={styles.loadingText}>Loading transaction details...</ThemedText>
            </View>
          ) : populationError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{populationError}</ThemedText>
              <ThemedText style={styles.errorSubtext}>Showing partial transaction details.</ThemedText>
            </View>
          ) : (
            <>
              {formattedTx.to && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>To:</ThemedText>
                  <ThemedText style={styles.detailValue}>{formattedTx.to}</ThemedText>
                </View>
              )}
              {formattedTx.value && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Value:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {formattedTx.value} ETH
                  </ThemedText>
                </View>
              )}
              {formattedTx.data && formattedTx.data !== '0x' && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Data:</ThemedText>
                  <ThemedText style={[styles.detailValue, styles.dataText]} numberOfLines={3} ellipsizeMode="middle">
                    {formattedTx.data}
                  </ThemedText>
                </View>
              )}
              {formattedTx.type && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Type:</ThemedText>
                  <ThemedText style={styles.detailValue}>{formattedTx.type}</ThemedText>
                </View>
              )}
              {formattedTx.chainId && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Chain ID:</ThemedText>
                  <ThemedText style={styles.detailValue}>{formattedTx.chainId}</ThemedText>
                </View>
              )}
              {/* Display either EIP-1559 fee fields or legacy gasPrice based on transaction type */}
              {formattedTx.type === 'legacy' ? (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Gas Price:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {formattedTx.gasPrice || 'Not available'} Gwei
                  </ThemedText>
                </View>
              ) : (
                <>
                  {formattedTx.maxFeePerGas && (
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Max Fee:</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {formattedTx.maxFeePerGas} Gwei
                      </ThemedText>
                    </View>
                  )}
                  {formattedTx.maxPriorityFeePerGas && (
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Priority Fee:</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {formattedTx.maxPriorityFeePerGas} Gwei
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
              
              {formattedTx.gas && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Gas Limit:</ThemedText>
                  <ThemedText style={styles.detailValue}>{formattedTx.gas}</ThemedText>
                </View>
              )}
              
              {formattedTx.nonce !== undefined && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Nonce:</ThemedText>
                  <ThemedText style={styles.detailValue}>{formattedTx.nonce}</ThemedText>
                </View>
              )}
            </>
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
              (isLoading || populatingTransaction || isViewOnly) && styles.disabledButton,
            ]}
            onPress={handleApprove}
            disabled={isLoading || populatingTransaction || isViewOnly}
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
              (isLoading || populatingTransaction) && styles.disabledButton,
            ]}
            onPress={handleApprove}
            disabled={isLoading || populatingTransaction}
            activeOpacity={0.8}>
            <ThemedText style={styles.buttonText}>
              {isLoading ? 'Preparing...' : populatingTransaction ? 'Loading...' : 'Sign with Hito'}
            </ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.cancelButton,
          ]}
          onPress={onClose}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </TouchableOpacity>
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
  dataText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.7,
  },
  errorContainer: {
    marginBottom: 8,
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 4,
  },
  errorSubtext: {
    opacity: 0.7,
    fontSize: 12,
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