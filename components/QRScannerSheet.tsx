import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useTabVisibility } from '@/hooks/useTabVisibility';

type ScanPurpose = 'address' | 'signature';

interface Props {
  isVisible: boolean;
  onClose: () => void;
  purpose: ScanPurpose;
  onScanComplete: (data: string) => void;
  keepTabBarHidden?: boolean;
}

/**
 * QR code scanner for Hito wallet interactions
 * - Scans wallet addresses
 * - Scans transaction/message signatures
 */
export function QRScannerSheet({ isVisible, onClose, purpose, onScanComplete, keepTabBarHidden = false }: Props) {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const { setHideTabBar } = useTabVisibility();
  
  // Request camera permission when the component becomes visible
  useEffect(() => {
    if (isVisible && permission && !permission.granted) {
      requestPermission();
    }
    
    // Always hide tab bar when the scanner is open
    if (isVisible) {
      setHideTabBar(true);
    } else if (!keepTabBarHidden) {
      // Only show tab bar when scanner closes AND keepTabBarHidden is false
      setHideTabBar(false);
    }
    
    return () => {
      // Only show tab bar when unmounting if keepTabBarHidden is false
      if (!keepTabBarHidden) {
        setHideTabBar(false);
      }
    };
  }, [isVisible, permission, setHideTabBar, keepTabBarHidden]);

  // Custom onClose handler to ensure close works on iOS
  const handleClose = () => {
    console.log("Close button pressed");
    setScanned(false);  // Reset scanned state
    onClose();          // Call the parent's onClose function
  };
  
  // Helper function to extract Ethereum address from various formats
  const extractEthereumAddress = (data: string): string => {
    // Check for ethereum: prefix format
    if (data.startsWith('ethereum:')) {
      const address = data.slice('ethereum:'.length);
      // Verify the extracted address is valid
      if (address.startsWith('0x') && address.length === 42) {
        return address;
      }
    }
    
    // Check for direct 0x format
    if (data.startsWith('0x') && data.length === 42) {
      return data;
    }
    
    // If we get here, it's not a valid address
    throw new Error('Invalid Ethereum address format. Expected ethereum:0x... or 0x... format.');
  };
  
  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    console.log(`QR code scanned (${purpose}):`, data);
    
    try {
      if (purpose === 'address') {
        // Extract and validate Ethereum address format
        const address = extractEthereumAddress(data);
        console.log('Valid Ethereum address detected:', address);
        onScanComplete(address);
        handleClose();
      } else if (purpose === 'signature') {
        console.log('Processing signature QR data');
        
        // Check for Hito's evm.sig: format
        if (data.startsWith('evm.sig:0x')) {
          const signature = data.slice('evm.sig:'.length);
          console.log('Valid Hito signature detected:', signature);
          onScanComplete(signature);
          handleClose();
          return;
        }
        
        try {
          // Try parsing as JSON first
          const parsed = JSON.parse(data);
          console.log('Parsed signature JSON:', parsed);
          
          if (parsed.signature) {
            console.log('Found signature in JSON:', parsed.signature);
            onScanComplete(parsed.signature);
            handleClose();
          } else if (parsed.rawTransaction) {
            console.log('Found rawTransaction in JSON:', parsed.rawTransaction);
            onScanComplete(parsed.rawTransaction);
            handleClose();
          } else {
            throw new Error('Missing signature in QR data');
          }
        } catch (jsonError) {
          console.log('Not valid JSON, checking if raw hex signature:', data);
          
          // If not JSON, check if it's a direct hex signature
          if (data.startsWith('0x')) {
            console.log('Valid hex signature detected');
            onScanComplete(data);
            handleClose();
          } else {
            throw new Error('Unrecognized QR data format. Expected Hito signature (evm.sig:0x...), JSON or hex string starting with 0x.');
          }
        }
      }
    } catch (error: unknown) {
      console.error('Scan error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Scan Error', 
        errorMessage, 
        [{ 
          text: 'Try Again', 
          onPress: () => {
            // Important: Reset scanned state to allow a new scan
            setScanned(false);
          }
        }]
      );
    }
  };
  
  if (!isVisible) return null;
  
  if (!permission) {
    return (
      <ThemedView style={styles.fullScreenContainer}>
        <ThemedText>Requesting camera permission...</ThemedText>
      </ThemedView>
    );
  }
  
  return (
    <View style={styles.fullScreenContainer}>
      {permission.granted ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"]
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          
          <View style={styles.overlay}>
            <View style={styles.header}>
              <ThemedText style={styles.headerText}>
                {purpose === 'address' ? 'Scan Hito Address' : 'Scan Hito Signature'}
              </ThemedText>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeButton}
                hitSlop={{ top: 25, right: 25, bottom: 25, left: 25 }} // Increase touch area
                activeOpacity={0.6} // Make it more responsive
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.scanFrame} />
            
            <ThemedText style={styles.instructions}>
              {purpose === 'address' 
                ? 'Please scan the QR code showing the wallet address on your Hito device'
                : 'After signing on your Hito device, scan the QR code with the signature'}
            </ThemedText>
            
            {scanned && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}>
                <ThemedText style={styles.rescanText}>Scan Again</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        // Simple loading view while waiting for permission
        <ThemedView style={styles.loadingContainer}>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.closeButton}
            hitSlop={{ top: 25, right: 25, bottom: 25, left: 25 }} // Increase touch area
            activeOpacity={0.6} // Make it more responsive
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <ThemedText style={styles.loadingText}>Accessing camera...</ThemedText>
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: 'black',
    zIndex: 100000,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 15, // Increase touchable area
    borderRadius: 30, // More touchable
    marginLeft: 10,
    ...Platform.OS === 'ios' ? { 
      backgroundColor: 'rgba(0,0,0,0.4)',
      marginRight: -5, // Offset the padding a bit
      marginTop: -5,
    } : {},
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 12,
    alignSelf: 'center',
  },
  instructions: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  rescanButton: {
    backgroundColor: '#2089dc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  rescanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2089dc',
    padding: 15,
    borderRadius: 8,
    margin: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center',
    color: 'white',
  },
  errorMessage: {
    fontSize: 16,
    margin: 20,
    textAlign: 'center',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
});