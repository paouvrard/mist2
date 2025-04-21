import AsyncStorage from '@react-native-async-storage/async-storage';

export type ViewOnlyWallet = {
  type: 'view-only';
  address: string;
};

export type HitoWallet = {
  type: 'hito';
  address: string;
  data: string;
};

export type Lattice1Wallet = {
  type: 'lattice1';
  address: string;
  data: string;
};

export type Wallet = ViewOnlyWallet | HitoWallet | Lattice1Wallet;

const STORAGE_KEY = 'wallets';

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
  wallets.push(wallet);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}