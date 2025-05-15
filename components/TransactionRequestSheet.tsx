import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
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
import { keccak256, parseSignature, serializeTransaction, type Transaction } from 'viem';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Wallet } from '@/utils/walletStorage';
import { wagmiConfig } from '@/app/_layout';
import { HitoManager } from '@/utils/hito/hitoManager';
import { QRScannerSheet } from './QRScannerSheet';
import { populateTransactionFields, formatTransactionForDisplay } from '@/utils/transactionUtils';
import { getProvider } from '@/utils/chains';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: (hash: string) => void;
  transaction: any;
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
  const [populatedTransaction, setPopulatedTransaction] = useState<Transaction | null>(null);
  const [populationError, setPopulationError] = useState<string | null>(null);
  
  const formattedTx = useMemo(() => {
    if (!populatedTransaction) return null;
    return formatTransactionForDisplay(populatedTransaction);
  }, [populatedTransaction]);
  
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const { open } = useAppKit();
  const { address } = useAccount();
  const hitoManager = new HitoManager();
  
  // Get screen dimensions for max height calculation
  const windowHeight = Dimensions.get('window').height;
  const maxSheetHeight = windowHeight * 0.8;

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
      if (!currentWallet) {
        throw new Error('No wallet connected'); 
      }
      const populated = await populateTransactionFields(transaction, currentChainId, currentWallet.address as `0x${string}`);
      setPopulatedTransaction(populated);
    } catch (err) {
      console.error('Failed to populate transaction:', err);
      setPopulationError('Failed to load transaction details');
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
    if (!currentWallet || !populatedTransaction) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (currentWallet.type === 'hito') {
        console.log('Sending transaction to Hito wallet for signing:', populatedTransaction);
        
        const nfcStatus = await HitoManager.checkNFCSupport();
        if (!nfcStatus.isSupported) {
          throw new Error(nfcStatus.message || 'NFC is required and not available');
        }
        
        await hitoManager.writeTransactionToNFC(populatedTransaction, currentWallet.address);
        
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
        const hash = await sendTransaction(wagmiConfig, populatedTransaction);
        
        if (onSuccess) {
          onSuccess(hash);
        }
        
        onClose();
      } else if (currentWallet.type === 'view-only') {
        throw new Error('View-only wallets cannot send transactions');
      } else {
        throw new Error('Unsupported wallet type');
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
    if (!populatedTransaction) return;
    console.log('Transaction signature received from QR code:', signatureData);
    
    try {
      setIsLoading(true);
      const sigHex = hitoManager.processScannedSignature(signatureData);
      const rlpTx = hitoManager.getRLPTransaction(populatedTransaction, sigHex);
      const txHash = keccak256(rlpTx);
      console.log('Transaction hash:', txHash, rlpTx);
      const provider = getProvider(populatedTransaction.chainId!);
      await provider.sendRawTransaction({ serializedTransaction: rlpTx});
      
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
        {/* Windows 95 title bar */}
        <View style={styles.titleBar}>
          <ThemedText type="title" style={styles.titleText}>
            Transaction Request
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.detailsContainer}>
            {populatingTransaction ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0a7a8c" />
                <ThemedText style={styles.loadingText}>Loading transaction details...</ThemedText>
              </View>
            ) : populationError ? (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{populationError}</ThemedText>
              </View>
            ) : formattedTx ? (
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
                {formattedTx.input && (
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Data:</ThemedText>
                    <ThemedText style={[styles.detailValue, styles.dataText]} ellipsizeMode="middle">
                      {formattedTx.input}
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
            ) : (
              <ThemedText style={styles.description}>
                Failed to load transaction details
              </ThemedText>
            )}
          </View>
        </ScrollView>
        <View>
          {error && (
            <ThemedText style={styles.error}>{error}</ThemedText>
          )}

          {isViewOnly && (
            <ThemedText style={styles.warning}>
              View-only wallet cannot approve the request
            </ThemedText>
          )}

          {isWalletConnect && !address && !populatingTransaction && (
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

          {isWalletConnect && address && !accountMatches && !populatingTransaction && (
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

          {isWalletConnect && accountMatches && !populatingTransaction && (
            <TouchableOpacity
              style={[
                styles.button,
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
          
          {isHito && !populatingTransaction && (
            <TouchableOpacity
              style={[
                styles.button,
                (isLoading || populatingTransaction) && styles.disabledButton,
              ]}
              onPress={handleApprove}
              disabled={isLoading || populatingTransaction}
              activeOpacity={0.8}>
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Connect your Hito to NFC...' : 'Approve with Hito'}
              </ThemedText>
            </TouchableOpacity>
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
  detailsContainer: {
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
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#b8b8b8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#e8e8e8',
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
    color: '#b8b8b8',
  },
  errorContainer: {
    marginBottom: 8,
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 4,
  },
  errorSubtext: {
    color: '#b8b8b8',
    fontSize: 12,
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