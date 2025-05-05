import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
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
import { useTabVisibility } from '@/hooks/useTabVisibility';

function Wallets() {
  const [isWalletTypeSheetVisible, setIsWalletTypeSheetVisible] = useState(false);
  const [isViewOnlyAddressSheetVisible, setIsViewOnlyAddressSheetVisible] = useState(false);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const insets = useSafeAreaInsets();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();
  const { setHideTabBar } = useTabVisibility();

  // Hide tab bar when sheets are visible, show it otherwise
  useEffect(() => {
    const shouldHideTabBar = isWalletTypeSheetVisible || isViewOnlyAddressSheetVisible || isQRScannerVisible;
    setHideTabBar(shouldHideTabBar);
  }, [isWalletTypeSheetVisible, isViewOnlyAddressSheetVisible, isQRScannerVisible, setHideTabBar]);

  // Ensure tab bar is visible whenever Wallets is focused
  useFocusEffect(
    React.useCallback(() => {
      // Show tab bar when the screen is focused (only if no sheets are visible)
      if (!isWalletTypeSheetVisible && !isViewOnlyAddressSheetVisible && !isQRScannerVisible) {
        setHideTabBar(false);
      }
      return () => {
        // No cleanup needed
      };
    }, [setHideTabBar, isWalletTypeSheetVisible, isViewOnlyAddressSheetVisible, isQRScannerVisible])
  );

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
    setHideTabBar(false);
  };

  const handleViewOnlyConnect = (address: string) => {
    handleAddWallet({
      type: 'view-only',
      address: address
    });
    setIsViewOnlyAddressSheetVisible(false);
    setHideTabBar(false);
  };

  const handleCloseViewOnlySheet = () => {
    setIsViewOnlyAddressSheetVisible(false);
    setHideTabBar(false);
  };

  const handleCloseQRScanner = () => {
    setIsQRScannerVisible(false);
    setHideTabBar(false);
  };

  const setIsWalletTypeSheetVisibleWithTabBar = (visible: boolean) => {
    setIsWalletTypeSheetVisible(visible);
    setHideTabBar(visible);
  };

  const handleSelectWalletType = async (type: 'view-only' | 'wallet-connect' | 'hito') => {
    setIsWalletTypeSheetVisible(false);
    try {
      if (type === 'view-only') {
        // Show the view-only address input sheet
        setIsViewOnlyAddressSheetVisible(true);
        setHideTabBar(true); // Keep tab bar hidden
        // WalletTypeSheet will remain visible in the background
      } 
      else if (type === 'wallet-connect') {
        // Close the wallet type sheet first
        setIsWalletTypeSheetVisible(false);
        setHideTabBar(false); // Show tab bar again
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
        setHideTabBar(true); // Hide tab bar when showing QR scanner
        // WalletTypeSheet will remain visible in the background
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Calculate proper top padding based on platform
  const titleTopPadding = Platform.OS === 'ios' ? insets.top + 20 : 40;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.titleContainer, { marginTop: titleTopPadding }]}>
        <ThemedText style={styles.titleText}>Wallets</ThemedText>
      </View>
      
      <View style={styles.contentContainer}>
        {wallets.map((wallet, index) => (
          <View key={index} style={styles.walletCard}>
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
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => setIsWalletTypeSheetVisibleWithTabBar(true)}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>Connect new wallet</ThemedText>
        </TouchableOpacity>
      </View>

      <WalletTypeSheet
        isVisible={isWalletTypeSheetVisible}
        onClose={() => setIsWalletTypeSheetVisibleWithTabBar(false)}
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
export default Wallets;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a', // Darker gray background similar to WalletTypeSheet
    padding: 16,
  },
  titleContainer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  titleText: {
    color: 'white',
    fontSize: 28, // Slightly smaller to ensure it fits
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
    letterSpacing: 0.5,  // Slightly wider letter spacing for that retro look
    height: 40, // Explicitly set height to avoid text clipping
    lineHeight: 36, // Set proper line height to avoid clipping
    textAlign: 'left',
    textTransform: 'uppercase',  // Windows 95 often used uppercase for window titles
  },
  contentContainer: {
    flex: 1,
    padding: 8, // Reduced from 16
  },
  walletCard: {
    backgroundColor: '#3a3a3a',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
    padding: 10,
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
    color: '#e8e8e8',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
  },
  walletAddress: {
    fontSize: 14,
    color: '#b8b8b8',
  },
  deleteButton: {
    width: 28,
    height: 28,
    marginLeft: 12,
    backgroundColor: '#c0c0c0',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#e8e8e8',
    borderLeftColor: '#e8e8e8',
    borderBottomColor: '#555555',
    borderRightColor: '#555555',
  },
  deleteButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  connectButton: {
    backgroundColor: '#555555',
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
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
