import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppKit } from '@reown/appkit-wagmi-react-native';
import { useAccount, useWalletClient } from 'wagmi';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { WalletTypeSheet } from '@/components/WalletTypeSheet';
import { ViewOnlyAddressSheet } from '@/components/ViewOnlyAddressSheet';
import { QRScannerSheet } from '@/components/QRScannerSheet';
import { addWallet, getWallets, deleteWallet, type Wallet, truncateAddress } from '@/utils/walletStorage';
import { HitoManager } from '@/utils/hito/hitoManager';

function HomeScreen() {
  const [isWalletTypeSheetVisible, setIsWalletTypeSheetVisible] = useState(false);
  const [isViewOnlyAddressSheetVisible, setIsViewOnlyAddressSheetVisible] = useState(false);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const insets = useSafeAreaInsets();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();

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

  const handleHitoAddressScanned = (scannedAddress: string) => {
    console.log('Hito wallet address scanned:', scannedAddress);
    
    // Add the Hito wallet with the scanned address
    handleAddWallet({
      type: 'hito',
      address: scannedAddress
    });
    
    // Close the QR scanner
    setIsQRScannerVisible(false);
  };

  const handleViewOnlyConnect = (address: string) => {
    handleAddWallet({
      type: 'view-only',
      address: address
    });
    setIsViewOnlyAddressSheetVisible(false);
  };

  const handleCloseViewOnlySheet = () => {
    setIsViewOnlyAddressSheetVisible(false);
  };

  const handleCloseQRScanner = () => {
    setIsQRScannerVisible(false);
  };

  const handleSelectWalletType = async (type: 'view-only' | 'wallet-connect' | 'hito') => {
    setIsWalletTypeSheetVisible(false);
    try {
      if (type === 'view-only') {
        // Show the view-only address input sheet
        setIsViewOnlyAddressSheetVisible(true);
        // WalletTypeSheet will remain visible in the background
      } 
      else if (type === 'wallet-connect') {
        // Close the wallet type sheet first
        setIsWalletTypeSheetVisible(false);
        // Open WalletConnect modal
        await open();
        
        // If a wallet client is connected, get the address
        if (walletClient) {
          await handleAddWallet({
            type: 'wallet-connect',
            address: walletClient.account.address
          });
        }
      }
      else if (type === 'hito') {
        // For Hito wallets, show the QR scanner
        setIsQRScannerVisible(true);
        // WalletTypeSheet will remain visible in the background
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
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
              {truncateAddress(wallet.address)}
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
        onSelectWalletType={handleSelectWalletType}
      />

      <ViewOnlyAddressSheet
        isVisible={isViewOnlyAddressSheetVisible}
        onClose={handleCloseViewOnlySheet}
        onConnect={handleViewOnlyConnect}
      />

      <QRScannerSheet
        isVisible={isQRScannerVisible}
        onClose={handleCloseQRScanner}
        purpose="address"
        onScanComplete={handleHitoAddressScanned}
      />
    </ThemedView>
  );
}

// Explicitly export the default component
export default HomeScreen;

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
