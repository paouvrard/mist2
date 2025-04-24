import { mainnet, goerli, polygon, optimism, arbitrum, gnosis, base, zksync, aurora } from "wagmi/chains";

export const chains = [
  mainnet,
  goerli,
  polygon,
  optimism,
  arbitrum,
  gnosis,
  base,
  aurora
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
