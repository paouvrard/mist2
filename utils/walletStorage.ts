import AsyncStorage from '@react-native-async-storage/async-storage';

export type ViewOnlyWallet = {
  type: 'view-only';
  address: string;
};

export type HitoWallet = {
  type: 'hito';
  address: string;
};

export type Lattice1Wallet = {
  type: 'lattice1';
  address: string;
};

export type WalletConnectWallet = {
  type: 'wallet-connect';
  address: string;
};

export type LedgerWallet = {
  type: 'ledger';
  address: string;
};

export type EoaWallet = {
  type: 'eoa';
  address: string;
  privateKey: string;
};

export type Wallet = ViewOnlyWallet | HitoWallet | Lattice1Wallet | WalletConnectWallet | LedgerWallet | EoaWallet;

const STORAGE_KEY = '@wallets';

export async function getWallets(): Promise<Wallet[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addWallet(wallet: Wallet): Promise<void> {
  const wallets = await getWallets();
  const existingIndex = wallets.findIndex(w => 
    w.type === wallet.type && w.address.toLowerCase() === wallet.address.toLowerCase()
  );

  if (existingIndex >= 0) {
    wallets[existingIndex] = wallet;
  } else {
    wallets.push(wallet);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

export async function deleteWallet(wallet: Wallet): Promise<void> {
  const wallets = await getWallets();
  const filtered = wallets.filter(w =>
    w.type !== wallet.type || w.address.toLowerCase() !== wallet.address.toLowerCase()
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}