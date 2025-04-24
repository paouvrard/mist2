import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { WalletTypeSheet } from '@/components/WalletTypeSheet';
import { addWallet, getWallets, deleteWallet, type Wallet } from '@/utils/walletStorage';
import { useAccount } from 'wagmi';

export default function HomeScreen() {
  const [isWalletTypeSheetVisible, setIsWalletTypeSheetVisible] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const insets = useSafeAreaInsets();
  const { address, isConnected } = useAccount();

  const loadWallets = async () => {
    const savedWallets = await getWallets();
    setWallets(savedWallets);
  };

  const handleAddWallet = async (wallet: Wallet) => {
    await addWallet(wallet);
    await loadWallets();
  };

  // Load wallets when the component mounts
  useEffect(() => {
    loadWallets();
  }, []);

  useEffect(() => {
    if (!address) return;
    handleAddWallet({
      type: 'wallet-connect',
      address,
    })
  }, [address]);

  const handleDeleteWallet = async (wallet: Wallet) => {
    await deleteWallet(wallet);
    await loadWallets();
  };

  const isWalletConnected = (wallet: Wallet) => {
    return isConnected && wallet.type === 'wallet-connect' && wallet.address.toLowerCase() === address?.toLowerCase();
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedText type="title" style={styles.title}>Wallets</ThemedText>
      
      {wallets.map((wallet, index) => (
        <ThemedView key={index} style={styles.walletCard}>
          <View style={styles.walletInfo}>
            <View style={styles.walletTypeContainer}>
              <ThemedText style={styles.walletType}>
                {wallet.type}
              </ThemedText>
              {isWalletConnected(wallet) && (
                <View style={styles.connectionDot} />
              )}
            </View>
            <ThemedText style={styles.walletAddress}>
              {wallet.address}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteWallet(wallet)}
            activeOpacity={0.8}>
            <ThemedText style={styles.deleteButtonText}>✕</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ))}
      
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => setIsWalletTypeSheetVisible(true)}
        activeOpacity={0.8}>
        <ThemedText style={styles.buttonText}>Connect new wallet</ThemedText>
      </TouchableOpacity>

      <WalletTypeSheet
        isVisible={isWalletTypeSheetVisible}
        onClose={() => setIsWalletTypeSheetVisible(false)}
        onAddWallet={handleAddWallet}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 32,
    marginBottom: 24,
  },
  walletCard: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  walletType: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
  },
  walletAddress: {
    fontSize: 14,
    opacity: 0.7,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220,53,69,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 16,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
