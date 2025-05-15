// filepath: /Users/pa/mist2/utils/transactionUtils.ts
import { type Transaction, formatEther, formatGwei, hexToBigInt } from 'viem';
import { getProvider } from './chains';

/**
 * Populates missing fields for an EIP-1559 transaction
 * @param transaction - The partial transaction object with existing fields
 * @param chainId - The chain ID for the transaction
 * @returns A more complete transaction object with populated fields
 */
export async function populateTransactionFields(
  tx: any, 
  chainId: number,
  currentAddress: `0x${string}`,
): Promise<Transaction> {
  // TODO: test contract deployment without to field
  // Get provider for the specified chain
  const provider = getProvider(chainId);
  if (!tx.from) {
    throw new Error('Transaction must have a "from" field');
  }
  if (tx.from !== currentAddress) {
    console.warn('Transaction "from" address does not match current address');
  }

  let populatedTx: Partial<Transaction> = {}
  populatedTx.from = tx.from;
  populatedTx.to = tx.to ?? null;
  populatedTx.value = hexToBigInt(tx.value || '0x0');

  // Handle data/input field conversion
  if (tx.data) {
    populatedTx.input = tx.data;
  } else if (tx.input) {
    populatedTx.input = tx.input;
  }
  
  // Set the chainId if not provided
  if (!tx.chainId) {
    populatedTx.chainId = Number(chainId);
  } else {
    populatedTx.chainId = Number(tx.chainId);
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
  populatedTx.type = isEIP1559Supported ? "eip1559" : "legacy";
  
  // Get the nonce if not provided
  if (tx.nonce === undefined) {
    populatedTx.nonce = await provider.getTransactionCount({
      address: tx.from as `0x${string}`,
      blockTag: 'pending'
    });
  } else {
    populatedTx.nonce = tx.nonce;
  }
  
  // Handle fee data based on EIP-1559 support
  if (isEIP1559Supported && feeData) {
    // For EIP-1559 compatible chains
    populatedTx.maxFeePerGas = feeData.maxFeePerGas;
    populatedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
  } else {
    // For legacy chains
    const gasPrice = await provider.getGasPrice();
    populatedTx.gasPrice = gasPrice;
  }

  const gasEstimate = await provider.estimateGas({
    account: populatedTx.from,
    to: populatedTx.to,
    value: populatedTx.value,
    data: populatedTx.input,
  });
  
  // Add a 10% buffer to ensure the transaction succeeds
  populatedTx.gas = (gasEstimate * 110n) / 100n;
  
  return populatedTx as Transaction;
}

/**
 * Formats transaction fields for display
 * @param tx - The transaction object to format
 * @returns Object with formatted values for UI display
 */
export function formatTransactionForDisplay(tx: Transaction) {
  return {
    to: tx.to,
    from: tx.from,
    value: formatEther(tx.value),
    input: tx.input,
    gas: tx.gas?.toString(),
    maxFeePerGas: tx.maxFeePerGas ? formatGwei(tx.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? formatGwei(tx.maxPriorityFeePerGas) : undefined,
    gasPrice: tx.gasPrice ? formatGwei(tx.gasPrice) : undefined,
    nonce: tx.nonce.toString(),
    type: tx.type.toString(),
    chainId: tx.chainId?.toString(),
  };
}