import { useEffect } from 'react';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { addWallet } from '@/utils/walletStorage';

export function useWalletConnect() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (!address) return;
    
    if (isConnected && walletClient) {
      // When connecting, store the wallet
      addWallet({
        type: 'wallet-connect',
        address,
      }).catch(console.error);
    }
  }, [address, isConnected, walletClient]);

  return {
    address,
    isConnected,
    disconnect,
    walletClient
  };
}