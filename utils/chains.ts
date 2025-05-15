import { mainnet, polygon, optimism, arbitrum, gnosis, base, aurora, auroraTestnet, sepolia } from "wagmi/chains";
import { createPublicClient, http } from 'viem';

export const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  gnosis,
  base,
  aurora,
  auroraTestnet,
  sepolia,
] as const;

/**
 * Gets the RPC URL for a specific chain ID
 * @param chainId The chain ID to get the RPC URL for
 * @returns The RPC URL for the chain, or mainnet's RPC URL as fallback
 */
export function getRpcUrl(chainId: number): string {
  const chain = chains.find(chain => chain.id === chainId);
  // Use the first RPC URL from the chain definition, or fallback to mainnet
  return chain?.rpcUrls.default.http[0] || mainnet.rpcUrls.default.http[0];
}

/**
 * Get a viem public client (provider) for the specified chain
 * @param chainId - The chain ID
 * @returns A viem public client for the chain, or undefined if chain is not supported
 */
export function getProvider(chainId: number) {
  const chain = chains.find(chain => chain.id === chainId);
  
  if (!chain) {
    throw new Error(`No provider available for chain ${chainId}`);
  }

  try {
    return createPublicClient({
      chain,
      transport: http(),
    });
  } catch (error) {
    console.error(error)
    throw new Error(`Failed to create provider for chainId ${chainId}.`);
  }
}

/**
 * Check if a chainId is supported
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported, false otherwise
 */
export function isChainSupported(chainId: number): boolean {
  return chains.some(chain => chain.id === chainId);
}
