// filepath: /Users/pa/mist2/utils/transactionUtils.ts
import { type Transaction, formatEther, formatGwei } from 'viem';
import { getProvider } from './chains';

/**
 * Populates missing fields for an EIP-1559 transaction
 * @param transaction - The partial transaction object with existing fields
 * @param chainId - The chain ID for the transaction
 * @returns A more complete transaction object with populated fields
 */
export async function populateTransactionFields(
  transaction: Partial<Transaction>, 
  chainId: number
): Promise<Transaction> {
  // Get provider for the specified chain
  const provider = getProvider(chainId);
  if (!provider) {
    throw new Error(`No provider available for chain ${chainId}`);
  }

  // Create a complete transaction object
  const populatedTx: any = { ...transaction };
  
  // Handle data/input field conversion
  if (populatedTx.data && !populatedTx.input) {
    populatedTx.input = populatedTx.data;
  } else if (populatedTx.input && !populatedTx.data) {
    populatedTx.data = populatedTx.input;
  }
  
  // Set the chainId if not provided
  if (populatedTx.chainId === undefined) {
    populatedTx.chainId = chainId;
  }
  
  // Check if the chain supports EIP-1559 by trying to estimate fees
  let isEIP1559Supported = false;
  let feeData = null;
  
  try {
    feeData = await provider.estimateFeesPerGas();
    isEIP1559Supported = !!(feeData?.maxFeePerGas && feeData?.maxPriorityFeePerGas);
  } catch (error) {
    console.warn('Failed to estimate fees, falling back to legacy tx type:', error);
    isEIP1559Supported = false;
  }
  
  // Set transaction type based on EIP-1559 support
  if (populatedTx.type === undefined) {
    populatedTx.type = isEIP1559Supported ? "eip1559" : "legacy";
  }
  
  // If sender address not provided, we can't get the nonce
  if (!populatedTx.from) {
    console.warn('Transaction missing from address, cannot fetch nonce');
    return populatedTx;
  }

  // Get the nonce if not provided
  if (populatedTx.nonce === undefined) {
    populatedTx.nonce = await provider.getTransactionCount({
      address: populatedTx.from,
      blockTag: 'pending'
    });
  }
  
  // Handle fee data based on EIP-1559 support
  if (isEIP1559Supported) {
    // For EIP-1559 compatible chains
    if (populatedTx.maxFeePerGas === undefined || populatedTx.maxPriorityFeePerGas === undefined) {
      if (feeData?.maxFeePerGas) {
        populatedTx.maxFeePerGas = feeData.maxFeePerGas;
      }
      if (feeData?.maxPriorityFeePerGas) {
        populatedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      }
    }
    delete populatedTx.gasPrice;
  } else {
    // For legacy chains
    if (populatedTx.gasPrice === undefined) {
      const gasPrice = await provider.getGasPrice();
      populatedTx.gasPrice = gasPrice;
    }
    
    // Clear EIP-1559 specific fields for legacy transactions
    delete populatedTx.maxFeePerGas;
    delete populatedTx.maxPriorityFeePerGas;
  }
  
  // Estimate gas if not provided
  if (populatedTx.gas === undefined) {
    const gasEstimate = await provider.estimateGas({
      account: populatedTx.from,
      to: populatedTx.to,
      value: populatedTx.value || 0n,
      data: populatedTx.data || populatedTx.input, // Use either data or input
      ...(isEIP1559Supported 
        ? { 
            maxFeePerGas: populatedTx.maxFeePerGas,
            maxPriorityFeePerGas: populatedTx.maxPriorityFeePerGas
          } 
        : { 
            gasPrice: populatedTx.gasPrice 
          })
    });
    
    // Add a 10% buffer to ensure the transaction succeeds
    populatedTx.gas = (gasEstimate * 110n) / 100n;
  }
  
  return populatedTx;
}

/**
 * Formats transaction fields for display
 * @param tx - The transaction object to format
 * @returns Object with formatted values for UI display
 */
export function formatTransactionForDisplay(tx: Partial<Transaction>) {
  // Use type assertion to access both standard fields and possible data field
  const transaction = tx as any;
  
  return {
    to: transaction.to,
    from: transaction.from,
    value: transaction.value ? formatEther(transaction.value) : '0',
    data: transaction.data || transaction.input, // Use either data or input
    gas: transaction.gas?.toString(),
    maxFeePerGas: transaction.maxFeePerGas ? formatGwei(transaction.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? formatGwei(transaction.maxPriorityFeePerGas) : undefined,
    gasPrice: transaction.gasPrice ? formatGwei(transaction.gasPrice) : undefined,
    nonce: transaction.nonce?.toString(),
    type: transaction.type?.toString(),
    chainId: transaction.chainId?.toString(),
  };
}