import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { WalletTypeSheet } from '@/components/WalletTypeSheet';
import { addWallet, getWallets, type Wallet } from '@/utils/walletStorage';

export default function HomeScreen() {
  const [isWalletTypeSheetVisible, setIsWalletTypeSheetVisible] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    const savedWallets = await getWallets();
    setWallets(savedWallets);
  };

  const handleAddWallet = async (wallet: Wallet) => {
    await addWallet(wallet);
    await loadWallets();
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedText type="title" style={styles.title}>Wallets</ThemedText>
      
      {wallets.map((wallet, index) => (
        <ThemedView key={index} style={styles.walletCard}>
          <ThemedText style={styles.walletType}>
            {wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)}
          </ThemedText>
          <ThemedText style={styles.walletAddress}>
            {wallet.address}
          </ThemedText>
        </ThemedView>
      ))}
      
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => setIsWalletTypeSheetVisible(true)}
        activeOpacity={0.8}>
        <ThemedText style={styles.buttonText}>Connect new key</ThemedText>
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
