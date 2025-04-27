import { Platform } from 'react-native';

// Conditionally import NFC manager
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;

try {
  const nfcLib = require('react-native-nfc-manager');
  NfcManager = nfcLib.default;
  NfcTech = nfcLib.NfcTech;
  Ndef = nfcLib.Ndef;
} catch (error) {
  console.log('NFC manager module not available:', error);
}

/**
 * HitoManager handles the communication with Hito hardware wallet
 * - Sending transaction data via NFC
 * - Sending message data via NFC
 * - Processing QR-scanned signatures
 * - Broadcasting signed transactions
 */
export class HitoManager {
  /**
   * Format transaction data as per Hito requirements
   * @param tx Transaction object
   * @param address Wallet address
   * @returns Formatted transaction object for Hito
   */
  formatTransaction(tx: any, address: string) {
    console.log('Formatting transaction for Hito:', JSON.stringify(tx));
    
    // Format transaction as per Hito requirements
    const formattedTx = {
      from: address,
      to: tx.to,
      value: tx.value || '0x0',
      data: tx.data || '0x',
      nonce: tx.nonce,
      gasLimit: tx.gasLimit || tx.gas, // Handle both formats
      gasPrice: tx.gasPrice,
      type: tx.type || '0x0', // EIP-1559 support
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      chainId: tx.chainId,
    };
    
    // Log formatted transaction for debugging
    console.log('Formatted transaction:', JSON.stringify(formattedTx));
    
    return formattedTx;
  }

  /**
   * Write transaction data to Hito via NFC
   * @param tx Formatted transaction object
   * @returns Promise resolving to true if successful
   */
  async writeTransactionToNFC(tx: any): Promise<boolean> {
    if (!NfcManager) {
      console.log('NFC not available in this environment');
      return false;
    }

    try {
      console.log('Initializing NFC for transaction');
      
      // Initialize NFC
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // Format the transaction as per Hito requirements
      // The payload should be in the format: evm.sign:{walletAddress}:{txUnsignedHex}
      let txUnsignedHex = tx.unsignedTx || tx.data;
      
      // Ensure transaction hex starts with 0x
      if (!txUnsignedHex || !txUnsignedHex.startsWith('0x')) {
        console.log('Transaction hex is missing or improperly formatted, sending as JSON instead');
        // Fall back to JSON if we don't have proper hex
        const txJson = JSON.stringify(tx);
        console.log('Sending transaction to Hito as JSON:', txJson);
        
        const bytes = Ndef.encodeMessage([
          Ndef.textRecord(txJson)
        ]);
        
        if (bytes) {
          await NfcManager.ndefHandler.writeNdefMessage(bytes);
          console.log('Transaction data sent to Hito successfully');
          return true;
        } else {
          throw new Error('Failed to encode NDEF message');
        }
      } else {
        // Create the payload string in the format expected by Hito
        const payload = `evm.sign:${tx.from}:${txUnsignedHex}`;
        
        console.log('Sending transaction to Hito:', payload);
        
        // Create NDEF message
        const bytes = Ndef.encodeMessage([
          Ndef.textRecord(payload)
        ]);
        
        if (bytes) {
          await NfcManager.ndefHandler.writeNdefMessage(bytes);
          console.log('Transaction data sent to Hito successfully');
          return true;
        } else {
          throw new Error('Failed to encode NDEF message');
        }
      }
    } catch (error) {
      console.error('Error writing to NFC:', error);
      throw error;
    } finally {
      // Clean up NFC resources
      if (NfcManager) {
        NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    }
  }

  /**
   * Write message data to Hito via NFC for signing
   * @param message Message to sign
   * @param address Wallet address
   * @returns Promise resolving to true if successful
   */
  async writeMessageToNFC(message: string, address: string): Promise<boolean> {
    if (!NfcManager) {
      console.log('NFC not available in this environment');
      return false;
    }

    try {
      console.log('Initializing NFC for message signing');
      
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // Format message data for Hito according to the expected format: evm.msg:{walletAddress}:{msgHex}
      // Convert message to hex if it's not already
      let msgHex = message;
      if (!message.startsWith('0x')) {
        // Convert string message to hex
        msgHex = '0x' + Buffer.from(message, 'utf8').toString('hex');
      }

      // Create the payload string in the format expected by Hito
      const payload = `evm.msg:${address}:${msgHex}`;
      
      console.log('Sending message to Hito for signing:', payload);
      
      // Create NDEF message
      const bytes = Ndef.encodeMessage([
        Ndef.textRecord(payload)
      ]);
      
      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('Message data sent to Hito successfully');
        return true;
      } else {
        throw new Error('Failed to encode NDEF message');
      }
    } catch (error) {
      console.error('Error writing message to NFC:', error);
      throw error;
    } finally {
      // Clean up NFC resources
      if (NfcManager) {
        NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    }
  }

  /**
   * Process a scanned signature from Hito QR code
   * @param signatureData QR code data
   * @returns Processed signature
   */
  processScannedSignature(signatureData: string): string {
    console.log('Processing scanned signature data:', signatureData);
    
    try {
      // Handle Hito wallet format that starts with 'evm.sig:'
      if (signatureData.startsWith('evm.sig:')) {
        let signatureHex = signatureData.replace('evm.sig:', '');
        
        // Workaround for old version Hito with a non-even signature length
        if (signatureHex.length % 2 !== 0) {
          signatureHex = signatureHex.replace(/0$|1$/, 
            match => match === '0' ? '00' : '01');
        }
        
        console.log('Processed Hito signature:', signatureHex);
        return signatureHex;
      }
      
      // If already in hex format
      if (signatureData.startsWith('0x')) {
        console.log('Signature is already in hex format');
        return signatureData;
      }
      
      // Try parsing as JSON
      try {
        const sigData = JSON.parse(signatureData);
        console.log('Parsed signature JSON:', sigData);
        
        if (sigData.signature) {
          return sigData.signature;
        } else if (sigData.rawTransaction) {
          return sigData.rawTransaction;
        } else {
          throw new Error('Missing signature in parsed QR data');
        }
      } catch (jsonError) {
        console.error('Error parsing signature JSON:', jsonError);
        // If not JSON and not one of the expected formats, it's invalid
        throw new Error('Invalid signature format from Hito QR code');
      }
    } catch (error) {
      console.error('Error processing scanned signature:', error);
      throw error;
    }
  }

  /**
   * Initialize NFC
   * @returns Promise resolving when NFC is initialized
   */
  static async initNFC(): Promise<void> {
    if (!NfcManager) {
      console.log('NFC not available in this environment');
      return;
    }

    try {
      // Start NFC Manager first (this is important on iOS)
      await NfcManager.start();
      console.log('NFC initialized successfully');
    } catch (error) {
      console.error('Error initializing NFC:', error);
      throw error;
    }
  }

  /**
   * Check if NFC is available and enabled
   * @returns Object with isSupported flag and optional error message
   */
  static async checkNFCSupport(): Promise<{ isSupported: boolean; message?: string }> {
    if (!NfcManager) {
      return { 
        isSupported: false, 
        message: 'NFC is not supported in this environment (possibly in Expo Go)' 
      };
    }

    try {
      // iOS requires different handling for NFC
      if (Platform.OS === 'ios') {
        // On iOS, we start NFC and assume it's supported if the device is modern enough
        // Since isSupported() is unreliable on iOS
        try {
          await NfcManager.start();
          return { isSupported: true };
        } catch (iosError) {
          return { 
            isSupported: false, 
            message: `NFC not properly configured on iOS: ${iosError.message}` 
          };
        }
      } else {
        // Android path remains the same
        const isSupported = await NfcManager.isSupported();
        console.log('NFC supported:', isSupported);
        
        if (!isSupported) {
          return { 
            isSupported: false, 
            message: 'NFC is not supported on this device.' 
          };
        }
        
        // Check if NFC is enabled
        const isEnabled = await NfcManager.isEnabled();
        
        if (!isEnabled) {
          return { 
            isSupported: false, 
            message: 'NFC is supported but not enabled on this device. Please enable NFC in your device settings.' 
          };
        }
        
        return { isSupported: true };
      }
    } catch (error) {
      return { 
        isSupported: false, 
        message: `Error checking NFC support: ${error.message}` 
      };
    }
  }

  /**
   * Simulate NFC for development environments without NFC support
   * @returns Boolean indicating success
   */
  static async simulateNFC(): Promise<boolean> {
    console.log('Using simulated NFC in development environment');
    return Promise.resolve(true);
  }
}