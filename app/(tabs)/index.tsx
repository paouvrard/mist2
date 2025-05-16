import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppKit } from '@reown/appkit-wagmi-react-native';
import { useAccount, useWalletClient } from 'wagmi';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { WalletTypeSheet } from '@/components/WalletTypeSheet';
import { ViewOnlyAddressSheet } from '@/components/ViewOnlyAddressSheet';
import { QRScannerSheet } from '@/components/QRScannerSheet';
import { WalletDetailsSheet } from '@/components/WalletDetailsSheet';
import { addWallet, getWallets, deleteWallet, reorderWallets, type Wallet, truncateAddress } from '@/utils/walletStorage';
import { HitoManager } from '@/utils/hito/hitoManager';
import { useTabVisibility } from '@/hooks/useTabVisibility';

function Wallets() {
  const [isWalletTypeSheetVisible, setIsWalletTypeSheetVisible] = useState(false);
  const [isViewOnlyAddressSheetVisible, setIsViewOnlyAddressSheetVisible] = useState(false);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
  const [isWalletDetailsSheetVisible, setIsWalletDetailsSheetVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const insets = useSafeAreaInsets();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();
  const { setHideTabBar } = useTabVisibility();

  // Hide tab bar when sheets are visible, show it otherwise
  useEffect(() => {
    const shouldHideTabBar = isWalletTypeSheetVisible || 
                            isViewOnlyAddressSheetVisible || 
                            isQRScannerVisible ||
                            isWalletDetailsSheetVisible;
    setHideTabBar(shouldHideTabBar);
  }, [isWalletTypeSheetVisible, isViewOnlyAddressSheetVisible, isQRScannerVisible, isWalletDetailsSheetVisible, setHideTabBar]);

  // Ensure tab bar is visible whenever Wallets is focused
  useFocusEffect(
    React.useCallback(() => {
      // Show tab bar when the screen is focused (only if no sheets are visible)
      if (!isWalletTypeSheetVisible && 
          !isViewOnlyAddressSheetVisible && 
          !isQRScannerVisible &&
          !isWalletDetailsSheetVisible) {
        setHideTabBar(false);
      }
      return () => {
        // No cleanup needed
      };
    }, [setHideTabBar, isWalletTypeSheetVisible, isViewOnlyAddressSheetVisible, isQRScannerVisible, isWalletDetailsSheetVisible])
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
    setIsWalletDetailsSheetVisible(false);
    setSelectedWallet(null);
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

  const handleWalletCardPress = (wallet: Wallet) => {
    // Only show wallet details if we're not in dragging mode
    if (!isDragging) {
      setSelectedWallet(wallet);
      setIsWalletDetailsSheetVisible(true);
    }
  };

  const handleCloseWalletDetailsSheet = () => {
    setIsWalletDetailsSheetVisible(false);
    setSelectedWallet(null);
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

  const handleDragEnd = useCallback(async ({ from, to }: { from: number; to: number }) => {
    // Update the dragging state
    setIsDragging(false);
    
    // Save the new order to storage and update state
    const updatedWallets = await reorderWallets(from, to);
    setWallets(updatedWallets);
  }, []);

  // Calculate proper top padding based on platform
  const titleTopPadding = Platform.OS === 'ios' ? insets.top + 20 : 40;

  const renderWalletItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Wallet>) => {
    const index = getIndex();
    const isWallConn = isWalletConnected(item);
    
    // Track if this is a potential drag operation or just a tap
    const pressStartTime = React.useRef<number>(0);
    const handlePressIn = () => {
      pressStartTime.current = Date.now();
    };
    
    const handlePressOut = () => {
      // If press duration is short, it's a tap, not a drag attempt
      const pressDuration = Date.now() - pressStartTime.current;
      if (pressDuration < 200) { // Less than 200ms is considered a tap
        setIsDragging(false);
      }
    };

    return (
      <ScaleDecorator activeScale={1}>
        <TouchableOpacity
          onLongPress={drag}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => handleWalletCardPress(item)}
          disabled={isActive}
          activeOpacity={0.7}
          style={[
            styles.walletCard,
            isActive && styles.walletCardDragging,
          ]}>
          <View style={styles.walletInfo}>
            <View style={styles.walletTypeContainer}>
              <ThemedText style={styles.walletType}>
                {item.type}
              </ThemedText>
              {isWallConn && (
                <View style={styles.connectionDot} />
              )}
            </View>
            <ThemedText style={styles.walletAddress}>
              {truncateAddress(item.address)}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [isDragging]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.titleContainer, { marginTop: titleTopPadding }]}>
        <ThemedText style={styles.titleText}>Wallets</ThemedText>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => setIsWalletTypeSheetVisibleWithTabBar(true)}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>+</ThemedText>
        </TouchableOpacity>
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.walletListFrame}>
          <DraggableFlatList
            data={wallets}
            keyExtractor={(item, index) => `${item.type}-${item.address}-${index}`}
            renderItem={renderWalletItem}
            onDragBegin={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            containerStyle={{ flex: 1 }}
            ListEmptyComponent={
              <View style={styles.emptyListContainer}>
                <ThemedText style={styles.emptyListText}>
                  No wallets added yet
                </ThemedText>
              </View>
            }
          />
        </View>
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
      
      <WalletDetailsSheet
        isVisible={isWalletDetailsSheetVisible}
        onClose={handleCloseWalletDetailsSheet}
        onForget={handleDeleteWallet}
        wallet={selectedWallet}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    color: 'white',
    fontSize: 28, // Slightly smaller to ensure it fits
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
    letterSpacing: 0.5,  // Slightly wider letter spacing for that retro look
    height: 36, // Explicitly set height to avoid text clipping
    lineHeight: 36, // Set proper line height to avoid clipping
    textAlign: 'left',
    textTransform: 'uppercase',  // Windows 95 often used uppercase for window titles
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 2, // Reduced horizontal padding to allow frame to extend wider
    paddingVertical: 8,
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
    padding: 16,
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
  walletCardDragging: {
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    transform: [{ scale: 0.95 }], // Changed from 1.02 to 0.95 to make the card smaller when dragging
    borderTopColor: '#aaaaaa',
    borderLeftColor: '#aaaaaa',
    borderBottomColor: '#666666',
    borderRightColor: '#666666',
  },
  walletListFrame: {
    flex: 1,
    marginHorizontal: 0, // Removed horizontal margin to make frame wider
    padding: 8,
    backgroundColor: '#2a2a2a', // Changed from #3a3a3a to match container background
    // Removed all border properties to eliminate the frame
  },
  emptyListContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: '#b8b8b8',
    fontFamily: 'SpaceMono-Regular',
  },
  newButton: {
    backgroundColor: '#555555',
    height: 36, // Fixed height that works well with the title
    width: 36, // Make it square for better appearance
    justifyContent: 'center', // Center the + text vertically
    alignItems: 'center', // Center the + text horizontally
    borderRadius: 4,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
});
