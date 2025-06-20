import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Keyboard, Platform, KeyboardAvoidingView, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { WalletConnectSheet } from '@/components/WalletConnectSheet';
import { WalletInfoSheet } from '@/components/WalletInfoSheet';
import { WelcomePage } from '@/components/WelcomePage';
import { SignatureRequestSheet } from '@/components/SignatureRequestSheet';
import { TransactionRequestSheet } from '@/components/TransactionRequestSheet';
import { AppInfoSheet } from '@/components/AppInfoSheet';
import { AddAppSheet } from '@/components/AddAppSheet';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getEthereumProvider } from '@/utils/ethereumProvider';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { Buffer } from 'buffer';
import { getRpcUrl } from '@/utils/chains';
import { Wallet } from '@/utils/walletStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define favorite apps with descriptions
const favoriteApps = [
  { 
    id: 'zerion', 
    name: 'Zerion', 
    url: 'https://app.zerion.io', 
    category: 'portfolio / send',
    description: 'All your tokens, DeFi positions, NFT collections, and transaction history across all major networks.'
  },
  { 
    id: 'uniswap', 
    name: 'Uniswap', 
    url: 'https://app.uniswap.org', 
    category: 'swap',
    description: 'The most widely used decentralized exchange (DEX) for swapping Ethereum tokens without intermediaries.'
  },
  { 
    id: 'aave', 
    name: 'Aave', 
    url: 'https://app.aave.com', 
    category: 'earn / borrow',
    description: 'The leading open source lending protocol where users can borrow or earn interest on crypto assets. Trusted by DeFi users for its security, transparency, and innovation'
  },
  { 
    id: 'bungee', 
    name: 'Bungee', 
    url: 'https://www.bungee.exchange', 
    category: 'bridge',
    description: 'Bounce between assets spread across any network efficiently using the open liquidity marketplace.'
  },
  { 
    id: 'jumper', 
    name: 'Jumper', 
    url: 'https://jumper.exchange', 
    category: 'bridge',
    description: 'Enabling seamless swap and bridge transactions across 25 blockchains.'
  },
  { 
    id: 'rainbow-bridge', 
    name: 'Rainbow Bridge', 
    url: 'https://rainbowbridge.app', 
    category: 'bridge',
    description: 'Transfer tokens between Ethereum, Aurora and NEAR Protocol.'
  },
  { 
    id: 'opensea', 
    name: 'OpenSea', 
    url: 'https://opensea.io', 
    category: 'nft / social',
    description: 'The largest NFT marketplace for discovering, collecting, and trading digital assets. Buy, sell, and explore NFTs.'
  },
  { 
    id: 'lens', 
    name: 'Lens', 
    url: 'https://hey.xyz', 
    category: 'nft / social',
    description: 'A Web3 social graph protocol built on Polygon. Enables decentralized social networking experiences.'
  },
  { 
    id: 'rarible', 
    name: 'Rarible', 
    url: 'https://rarible.com', 
    category: 'nft / social',
    description: 'A community-owned NFT marketplace. Create, sell, and collect digital items secured with blockchain.'
  },
  { 
    id: 'mycrypto', 
    name: 'MyCrypto', 
    url: 'https://app.mycrypto.com', 
    category: 'portfolio / send',
    description: 'A long-standing Ethereum wallet interface that emphasizes self-custody and security; trusted by early crypto users and power users for direct wallet management.'
  },
  { 
    id: 'safe', 
    name: 'Safe', 
    url: 'https://app.safe.global', 
    category: 'smart wallet',
    description: 'The OG multi-signature wallet for teams, DAOs, and power users. A smart contract wallet that supports multiple keys and recovery methods.'
  },
  { 
    id: 'zapper', 
    name: 'Zapper', 
    url: 'https://zapper.xyz', 
    category: 'portfolio / send',
    description: 'See what\'s happening onchain. Track your portfolio and activity.'
  },
  { 
    id: 'ens', 
    name: 'ENS', 
    url: 'https://app.ens.domains', 
    category: 'nft / social',
    description: 'The Ethereum Name Service lets you register human-readable .eth names for your wallet and web3 identity; popular among all kinds of Ethereum users to simplify crypto addresses.'
  },
  { 
    id: '1inch', 
    name: '1inch', 
    url: 'https://app.1inch.io', 
    category: 'swap',
    description: 'A DEX aggregator that finds the best prices across many exchanges to optimize trades; favored by cost-conscious traders and whales.'
  },
  { 
    id: 'cowswap', 
    name: 'CowSwap', 
    url: 'https://swap.cow.fi', 
    category: 'swap',
    description: 'Finds the lowest prices from all decentralized exchanges and DEX aggregators & saves you more with p2p trading and protection from MEV.'
  },
  { 
    id: 'stakefish', 
    name: 'Stakefish', 
    url: 'https://stake.fish/dashboard', 
    category: 'stake',
    description: 'Non-custodial. Secure. Stake confidently with the longest operating validators since 2018.'
  },
  { 
    id: 'sky', 
    name: 'Sky', 
    url: 'https://app.sky.money/', 
    category: 'earn / borrow',
    description: 'The new brand for MakerDAO, the creator of DAI, a decentralized stablecoin backed by collateral; used in many DeFi apps and seen as a pillar of Ethereum finance.'
  },
  { 
    id: 'lido', 
    name: 'Lido', 
    url: 'https://stake.lido.fi', 
    category: 'stake',
    description: 'Ethereum\'s leading liquid staking token, with best-in-class security, deepest liquidity and competitive rewards.'
  },
  { 
    id: 'rocketpool', 
    name: 'Rocket Pool', 
    url: 'https://stake.rocketpool.net', 
    category: 'stake',
    description: 'Rocket Pool is a decentralised staking protocol providing liquid & node staking products for the Ethereum (ETH) ecosystem.'
  },
];

// Custom apps storage key
const CUSTOM_APPS_STORAGE_KEY = '@customApps';

// Interface for app connection state tracking
interface AppConnectionState {
  isConnected: boolean;
  wallet: Wallet | null;
  chainId: number;
  url: string;
  isLoaded?: boolean; // Track if WebView has been loaded
}

// Interface for custom apps
interface CustomApp {
  id: string;
  name: string;
  url: string;
  category: string;
}

// Interface for app descriptions
export interface AppDescription {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
}

// App WebView Component
interface AppWebViewProps {
  instanceId: string;
  url: string;
  visible: boolean;
  onMessage: (event: any, instanceId: string) => void;
  onNavigationStateChange: (navState: any, instanceId: string) => void;
  ref?: (ref: WebView | null) => void;
}

const AppWebView = React.forwardRef<WebView, AppWebViewProps>(({ 
  instanceId, 
  url, 
  visible, 
  onMessage, 
  onNavigationStateChange 
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const INJECT_PROVIDER_JS = getEthereumProvider(instanceId);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background'); // Get the theme background color

  // Use React.useImperativeHandle to forward the WebView ref with our custom methods
  React.useImperativeHandle(ref, () => ({
    ...webViewRef.current,
    // Add a custom navigate method that directly calls the WebView's loadUrl method
    navigate: (newUrl: string) => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          window.location.href = "${newUrl}";
          true;
        `);
      }
    },
    injectJavaScript: (script: string) => {
      if (webViewRef.current) {
        return webViewRef.current.injectJavaScript(script);
      }
    },
    goBack: () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
      }
    }
  }));

  // Don't render if no URL is provided
  if (!url) {
    return null;
  }

  // Create appropriate status bar spacing only for iOS
  const statusBarHeight = Platform.OS === 'ios' ? insets.top : 0;

  return (
    <View 
      style={[
        styles.webviewWrapper, 
        !visible && styles.offscreenView
      ]}
      collapsable={false}
      renderToHardwareTextureAndroid={true}>
      
      {/* Status bar spacer - only visible on iOS */}
      {Platform.OS === 'ios' && (
        <View style={{ height: statusBarHeight, backgroundColor: '#2a2a2a' }} />
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onNavigationStateChange={(navState) => onNavigationStateChange(navState, instanceId)}
        injectedJavaScriptBeforeContentLoaded={INJECT_PROVIDER_JS}
        onMessage={(event) => onMessage(event, instanceId)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        keyboardDisplayRequiresUserAction={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        androidLayerType="hardware"
        contentInset={{ top: 0, left: 0, right: 0, bottom: 40 }}
        containerStyle={{ paddingBottom: 40 }}
        originWhitelist={['*']}
        incognito={false}
        key={instanceId}
      />
    </View>
  );
});

export default function AppsScreen() {
  // Track app instances and their states
  const [appInstances, setAppInstances] = useState<{ [key: string]: AppConnectionState }>({});
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  
  // UI state
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Sheet states
  const [isWalletSheetVisible, setIsWalletSheetVisible] = useState(false);
  const [isWalletInfoSheetVisible, setIsWalletInfoSheetVisible] = useState(false);
  const [isSignatureSheetVisible, setIsSignatureSheetVisible] = useState(false);
  const [isTransactionSheetVisible, setIsTransactionSheetVisible] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState('');
  const [transactionDetails, setTransactionDetails] = useState({});
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [pendingAppId, setPendingAppId] = useState<string | null>(null);
  const [customApps, setCustomApps] = useState<CustomApp[]>([]);
  const [isAddAppSheetVisible, setIsAddAppSheetVisible] = useState(false);

  // New state variables for AppInfoSheet
  const [isAppInfoSheetVisible, setIsAppInfoSheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [appDescriptions, setAppDescriptions] = useState<AppDescription[]>([]);
  
  // Get references and style values
  const webViewRefs = useRef<{[key: string]: WebView | null}>({});
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
  const { setHideTabBar } = useTabVisibility();
  const params = useLocalSearchParams();
  
  const wasUnfocused = useRef(false);

  // Add focus effect to track when the screen gains and loses focus
  useFocusEffect(
    React.useCallback(() => {
      // We don't want to reset to welcome page when returning from other tabs
      wasUnfocused.current = false;
      
      return () => {
        // When the screen loses focus
        wasUnfocused.current = true;
      };
    }, [])
  );

  // Listen for the resetWebView parameter to know when to reset the webview
  useEffect(() => {
    if (params.resetWebView === 'true') {
      handleHomePress();
    }
  }, [params.resetWebView]);

  // Track keyboard visibility and height with improved handlers
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        if (Platform.OS === 'ios') {
          setKeyboardHeight(event.endCoordinates.height);
        }
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Update tab visibility when showing/hiding welcome screen
  useEffect(() => {
    setHideTabBar(!showWelcome);
  }, [showWelcome, setHideTabBar]);

  // Handle Android hardware back button
  useEffect(() => {
    // Only add the listener for Android
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // If we're not on the welcome screen and we have an active app
        if (!showWelcome && activeAppId) {
          handleHomePress();
          // Return true to prevent default behavior (closing the app)
          return true;
        }
        // Return false to allow default behavior if we're on the welcome screen
        return false;
      });
      
      // Clean up the event listener when component unmounts
      return () => backHandler.remove();
    }
  }, [showWelcome, activeAppId, canGoBack]);

  // Get the active app state
  const getActiveAppState = () => {
    if (!activeAppId || !appInstances[activeAppId]) {
      return {
        isConnected: false,
        wallet: null,
        chainId: 1, // Default to Ethereum mainnet
        url: ''
      };
    }
    return appInstances[activeAppId];
  };

  const activeAppState = getActiveAppState();

  // Switch to a specific app - creating it if needed
  const switchToApp = (appId: string) => {
    // First check if this is a favorite app that hasn't been created yet
    const favoriteApp = favoriteApps.find(app => app.id === appId);
    // Then check if this is a custom app
    const customApp = customApps.find(app => app.id === appId);
    const app = favoriteApp || customApp;
    
    if (app && !appInstances[appId]) {
      // Create the app instance for this app
      setAppInstances(prev => ({
        ...prev,
        [appId]: {
          isConnected: false,
          wallet: null,
          chainId: 1,
          url: app.url
        }
      }));
      
      // Set this as the active app
      setActiveAppId(appId);
      setCurrentUrl(app.url);
      setShowWelcome(false);
    } else if (appInstances[appId]) {
      // Switch to existing app
      setActiveAppId(appId);
      setCurrentUrl(appInstances[appId].url);
      setShowWelcome(false);
    } else {
      console.warn(`App with ID ${appId} not found`);
    }
  };

  // Force update the WebView with a new URL by recreating it
  const reloadWebViewWithUrl = (appId: string, newUrl: string) => {
    // Update the app instance state with the new URL
    setAppInstances(prev => {
      // Create a new object to ensure a re-render
      return {
        ...prev,
        [appId]: {
          ...prev[appId],
          url: newUrl,
          // Add a timestamp to force a WebView recreation
          timestamp: Date.now()
        }
      };
    });
    
    // Update UI state
    setCurrentUrl(newUrl);
  };

  // Handle clearing app data (cache, local storage, cookies, history)
  const handleClearAppData = (appId: string) => {
    // First check if the app exists in instances
    // Then check favorite apps
    // Then check custom apps
    const favoriteApp = favoriteApps.find(app => app.id === appId);
    const customApp = customApps.find(app => app.id === appId);
    
    let appUrl = '';
    let needToCreateInstance = false;
    
    if (appInstances[appId]) {
      // App already exists as an instance
      appUrl = appInstances[appId].url;
    } else if (favoriteApp) {
      // App exists in favorites but not as an instance yet
      appUrl = favoriteApp.url;
      needToCreateInstance = true;
    } else if (customApp) {
      // App exists in custom apps but not as an instance yet
      appUrl = customApp.url;
      needToCreateInstance = true;
    } else {
      console.warn(`Cannot clear data for unknown app ID: ${appId}`);
      return;
    }
    
    // Close the app info sheet if it's visible
    if (isAppInfoSheetVisible) {
      setIsAppInfoSheetVisible(false);
    }
    
    // JavaScript to clear all storage types
    const clearDataScript = `
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(';').forEach(function(c) {
        document.cookie = c.trim().split('=')[0] + '=;' + 'expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
      });
      
      // Clear cache via reload with cache disabled
      // Setting no-cache headers for all future requests
      window.caches && window.caches.keys().then(function(names) {
        for (let name of names) window.caches.delete(name);
      });
      
      // Clear IndexedDB databases
      window.indexedDB && window.indexedDB.databases && window.indexedDB.databases().then(function(dbs) {
        dbs.forEach(function(db) {
          window.indexedDB.deleteDatabase(db.name);
        });
      });
      
      // Clear application cache (deprecated, but some sites still use it)
      window.applicationCache && window.applicationCache.abort && window.applicationCache.abort();
      
      // Force a hard reload of the page to apply all changes
      setTimeout(function() {
        window.location.reload(true);
      }, 100);
      
      // Return true to satisfy WebView.injectJavaScript requirement
      true;
    `;
    
    if (needToCreateInstance) {
      // Create an instance for this app first
      const newAppId = appId;
      
      // Create the app instance
      setAppInstances(prev => ({
        ...prev,
        [newAppId]: {
          isConnected: false,
          wallet: null,
          chainId: 1,
          url: appUrl,
          timestamp: Date.now() // Add timestamp to ensure WebView is created fresh
        }
      }));
      
      // Set this as the active app
      setActiveAppId(newAppId);
      setCurrentUrl(appUrl);
      setShowWelcome(false);
      
      // Allow a moment for the WebView to initialize before injecting script
      setTimeout(() => {
        const webViewRef = webViewRefs.current[newAppId];
        if (webViewRef) {
          webViewRef.injectJavaScript(clearDataScript);
        }
      }, 1000); // Wait a second for the WebView to initialize
      
    } else {
      // Use existing app instance
      const webViewRef = webViewRefs.current[appId];
      
      // If the app isn't already active, make it active first
      setActiveAppId(appId);
      setCurrentUrl(appUrl);
      setShowWelcome(false);
      
      if (webViewRef) {
        webViewRef.injectJavaScript(clearDataScript);
      }
    }
  };

  // Handle connection request from a WebView
  const handleConnect = useCallback((request: any, id: number, appId: string) => {
    setPendingRequestId(id);
    setPendingAppId(appId);
    setIsWalletSheetVisible(true);
  }, []);

  // When a user confirms wallet connection
  const handleConnectConfirm = useCallback((wallet: Wallet) => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      // Update the app instance state
      setAppInstances(prev => ({
        ...prev,
        [pendingAppId]: {
          ...prev[pendingAppId],
          isConnected: true,
          wallet: wallet
        }
      }));
      
      // Send response to the WebView
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            type: 'eth_requestAccounts',
            result: ['${wallet.address}']
          });
        `);
      }
      
      setIsWalletSheetVisible(false);
      setPendingRequestId(null);
      setPendingAppId(null);
    }
  }, [pendingRequestId, pendingAppId]);

  // When a user cancels wallet connection
  const handleConnectCancel = useCallback(() => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            error: { code: 4001, message: 'User rejected the request.' }
          });
        `);
      }
      setIsWalletSheetVisible(false);
      setPendingRequestId(null);
      setPendingAppId(null);
    }
  }, [pendingRequestId, pendingAppId]);

  // Disconnect wallet from current app
  const handleDisconnect = useCallback(() => {
    if (activeAppId) {
      setAppInstances(prev => ({
        ...prev,
        [activeAppId]: {
          ...prev[activeAppId],
          isConnected: false,
          wallet: null
        }
      }));
      
      const appWebViewRef = webViewRefs.current[activeAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._connected = false;
          window.ethereum._address = null;
          window.ethereum._emitEvent('accountsChanged', []);
          window.ethereum._emitEvent('disconnect', { code: 4900, message: 'User disconnected' });
        `);
      }
    }
    setIsWalletInfoSheetVisible(false);
  }, [activeAppId]);

  // Switch to a different wallet for the current app
  const handleSwitchWallet = useCallback((wallet: Wallet) => {
    if (activeAppId) {
      setAppInstances(prev => ({
        ...prev,
        [activeAppId]: {
          ...prev[activeAppId],
          wallet: wallet
        }
      }));
      
      const appWebViewRef = webViewRefs.current[activeAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._address = '${wallet.address}';
          window.ethereum._emitEvent('accountsChanged', ['${wallet.address}']);
        `);
      }
    }
    setIsWalletInfoSheetVisible(false);
  }, [activeAppId]);

  // Handle successful signature
  const handleSignatureSuccess = useCallback((signature: string) => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            result: '${signature}'
          });
        `);
      }
      setPendingRequestId(null);
      setPendingAppId(null);
    }
    setIsSignatureSheetVisible(false);
  }, [pendingRequestId, pendingAppId]);

  // Handle signature modal closing
  const handleSignatureClose = useCallback(() => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            error: { code: 4001, message: 'User rejected the request.' }
          });
        `);
      }
    }
    setIsSignatureSheetVisible(false);
    setPendingRequestId(null);
    setPendingAppId(null);
  }, [pendingRequestId, pendingAppId]);

  // Handle successful transaction
  const handleTransactionSuccess = useCallback((hash: string) => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            result: '${hash}'
          });
        `);
      }
      setPendingRequestId(null);
      setPendingAppId(null);
    }
    setIsTransactionSheetVisible(false);
  }, [pendingRequestId, pendingAppId]);

  // Handle transaction modal closing
  const handleTransactionClose = useCallback(() => {
    if (pendingRequestId !== null && pendingAppId !== null) {
      const appWebViewRef = webViewRefs.current[pendingAppId];
      if (appWebViewRef) {
        appWebViewRef.injectJavaScript(`
          window.ethereum._resolveRequest({
            id: ${pendingRequestId},
            error: { code: 4001, message: 'User rejected the request.' }
          });
        `);
      }
    }
    setIsTransactionSheetVisible(false);
    setPendingRequestId(null);
    setPendingAppId(null);
  }, [pendingRequestId, pendingAppId]);

  // Decode hex messages
  const decodeHexMessage = (hexMessage: string): string => {
    try {
      // Remove '0x' prefix if present
      const cleanHex = hexMessage.startsWith('0x') ? hexMessage.slice(2) : hexMessage;
      // Try to decode as UTF-8 string
      return Buffer.from(cleanHex, 'hex').toString('utf8');
    } catch (error) {
      // If decoding fails, return the original message
      return hexMessage;
    }
  };

  // Process messages from WebView
  const handleMessage = useCallback((event: any, appId: string) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle console messages
      if (data.type === 'console') {
        console.log(`[WebView ${appId}]:`, data);
        return;
      }

      // Handle ethereum requests
      if (data.type === 'ethereum_request') {
        // Get the current app state
        const appState = appInstances[appId] || { 
          isConnected: false, 
          wallet: null, 
          chainId: 1,
          url: ''
        };
        
        const appWebViewRef = webViewRefs.current[appId];
        
        switch (data.payload.method) {
          case 'eth_requestAccounts':
            if (!appState.isConnected) {
              handleConnect(data.payload, data.id, appId);
            } else if (appState.wallet && appWebViewRef) {
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  type: 'eth_requestAccounts',
                  result: ['${appState.wallet.address}']
                });
              `);
            }
            break;
            
          case 'eth_accounts':
            if (appWebViewRef) {
              const addresses = appState.wallet ? [appState.wallet.address] : [];
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: ${JSON.stringify(addresses)}
                });
              `);
            }
            break;
            
          case 'eth_chainId':
            if (appWebViewRef) {
              const chainId = `0x${appState.chainId.toString(16)}`;
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: "${chainId}"
                });
              `);
            }
            break;
            
          case 'eth_sendTransaction':
            if (!appState.isConnected || !appState.wallet) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              // Extract transaction details
              const txParams = data.payload.params[0];
              
              // Set transaction details for the modal
              setTransactionDetails(txParams);
              
              // Set the pending request data
              setPendingRequestId(data.id);
              setPendingAppId(appId);
              
              // Show the transaction approval modal
              setIsTransactionSheetVisible(true);
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4001, message: 'Invalid transaction parameters.' }
                  });
                `);
              }
            }
            break;
            
          case 'eth_sign':
          case 'personal_sign':
            if (!appState.isConnected || !appState.wallet) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              let message;
              
              // Extract the message to be signed
              if (data.payload.method === 'eth_sign') {
                message = data.payload.params[1]; // In eth_sign, the message is the second param
              } else {
                message = data.payload.params[0]; // In personal_sign, the message is the first param
              }
              
              // If the message is hex-encoded, decode it for display
              if (typeof message === 'string' && message.startsWith('0x')) {
                const decodedMessage = decodeHexMessage(message);
                setSignatureMessage(decodedMessage);
              } else {
                setSignatureMessage(message);
              }
              
              // Set the pending request data
              setPendingRequestId(data.id);
              setPendingAppId(appId);
              
              // Show the signature approval modal
              setIsSignatureSheetVisible(true);
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4001, message: 'Error processing signature request.' }
                  });
                `);
              }
            }
            break;
            
          case 'wallet_switchEthereumChain':
            if (!appState.isConnected) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              const newChainId = parseInt(data.payload.params[0].chainId);
              
              // Update the app's chain ID
              setAppInstances(prev => ({
                ...prev,
                [appId]: {
                  ...prev[appId],
                  chainId: newChainId
                }
              }));
              
              if (appWebViewRef) {
                const chainIdHex = `0x${newChainId.toString(16)}`;
                
                appWebViewRef.injectJavaScript(`
                  window.ethereum._chainId = "${chainIdHex}";
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    result: null
                  });
                  window.ethereum._emitEvent('chainChanged', "${chainIdHex}");
                `);
              }
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4902, message: 'Unrecognized chain ID.' }
                  });
                `);
              }
            }
            break;
            
          case 'wallet_addEthereumChain':
            // Validate parameters
            if (!appState.isConnected) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            if (!data.payload.params || !data.payload.params[0] || !data.payload.params[0].chainId) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'wallet_addEthereumChain requires chain information' }
                  });
                `);
              }
              break;
            }

            // For now we'll just return success but we could implement adding new chains
            if (appWebViewRef) {
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  result: null
                });
              `);
            }
            break;
            
          case 'eth_blockNumber':
            // Use direct RPC call from React Native side
            if (appWebViewRef) {
              // Fetch from RPC using the current chain's RPC URL
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_blockNumber',
                  params: []
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_estimateGas':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'eth_estimateGas requires transaction parameters' }
                  });
                `);
              }
              break;
            }
            
            // Use direct RPC call
            if (appWebViewRef) {
              // Fetch from RPC using the current chain's RPC URL
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_estimateGas',
                  params: data.payload.params
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_getTransactionByHash':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'eth_getTransactionByHash requires transaction hash parameter' }
                  });
                `);
              }
              break;
            }
            
            // Use direct RPC call
            if (appWebViewRef) {
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_getTransactionByHash',
                  params: data.payload.params
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_call':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'eth_call requires transaction parameters' }
                  });
                `);
              }
              break;
            }
            
            // Use direct RPC call
            if (appWebViewRef) {
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_call',
                  params: data.payload.params
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_getBalance':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'eth_getBalance requires address parameter' }
                  });
                `);
              }
              break;
            }
            
            // Use direct RPC call
            if (appWebViewRef) {
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_getBalance',
                  params: data.payload.params
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_gasPrice':
            // Use direct RPC call from React Native side
            if (appWebViewRef) {
              // Fetch from RPC using the current chain's RPC URL
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_gasPrice',
                  params: []
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;
            
          case 'eth_getCode':
            // Validate parameters
            if (!data.payload.params || data.payload.params.length < 1) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4200, message: 'eth_getCode requires address parameter' }
                  });
                `);
              }
              break;
            }
            
            // Use direct RPC call
            if (appWebViewRef) {
              fetch(getRpcUrl(appState.chainId), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: 1,
                  jsonrpc: '2.0',
                  method: 'eth_getCode',
                  params: data.payload.params
                })
              })
              .then(response => response.json())
              .then(responseJson => {
                if (appWebViewRef) {
                  if (responseJson.error) {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        error: { code: 4200, message: "${responseJson.error.message || 'RPC error'}" }
                      });
                    `);
                  } else {
                    appWebViewRef.injectJavaScript(`
                      window.ethereum._resolveRequest({
                        id: ${data.id},
                        result: ${JSON.stringify(responseJson.result)}
                      });
                    `);
                  }
                }
              })
              .catch(error => {
                if (appWebViewRef) {
                  appWebViewRef.injectJavaScript(`
                    window.ethereum._resolveRequest({
                      id: ${data.id},
                      error: { code: 4200, message: "${error.message || 'RPC error'}" }
                    });
                  `);
                }
              });
            }
            break;

          case 'eth_signTypedData':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4':
            if (!appState.isConnected || !appState.wallet) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4100, message: 'Please connect wallet first.' }
                  });
                `);
              }
              break;
            }
            
            try {
              // Extract typed data for display - this would need more processing for proper display
              const typedData = data.payload.params[1]; // Typed data is the second param
              
              // Set the message for display
              setSignatureMessage(typedData);
              
              // Set the pending request data
              setPendingRequestId(data.id);
              setPendingAppId(appId);
              
              // Show the signature approval modal
              setIsSignatureSheetVisible(true);
            } catch (error) {
              if (appWebViewRef) {
                appWebViewRef.injectJavaScript(`
                  window.ethereum._resolveRequest({
                    id: ${data.id},
                    error: { code: 4001, message: 'Error processing typed data signature request.' }
                  });
                `);
              }
            }
            break;

          default:
            if (appWebViewRef) {
              appWebViewRef.injectJavaScript(`
                window.ethereum._resolveRequest({
                  id: ${data.id},
                  error: {
                    code: 4200,
                    message: 'Method ${data.payload.method} not supported'
                  }
                });
              `);
            }
        }
      }
    } catch (error) {
      console.error(`Error handling message from app ${appId}:`, error);
    }
  }, [appInstances, handleConnect]);

  // Update WebView refs when components mount/unmount
  const handleWebViewRef = (ref: WebView | null, instanceId: string) => {
    if (ref) {
      webViewRefs.current[instanceId] = ref;
    } else {
      delete webViewRefs.current[instanceId];
    }
  };

  // Handle navigation state change for an app
  const handleNavigationStateChange = (navState: any, instanceId: string) => {
    if (instanceId === activeAppId) {
      setCurrentUrl(navState.url);
      setCanGoBack(navState.canGoBack);
    }
    
    // Update the URL in the app instances state
    setAppInstances(prev => ({
      ...prev,
      [instanceId]: {
        ...prev[instanceId],
        url: navState.url
      }
    }));
  };

  // Navigate to a URL and create a new app instance if needed
  const goToUrl = (input: string) => {
    Keyboard.dismiss();
    
    let processedUrl = input;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      processedUrl = 'https://' + input;
    }
    
    // If the URL is the same as the current URL and we have an active app,
    // just reload the current page
    if (activeAppId && appInstances[activeAppId] && 
        (processedUrl === appInstances[activeAppId].url)) {
      // Get the WebView reference
      const webViewRef = webViewRefs.current[activeAppId];
      
      if (webViewRef) {
        // Force a reload of the current page
        webViewRef.injectJavaScript(`
          window.location.reload(true);
          true;
        `);
        return;
      }
    }
    
    // First, check if this matches any favorite or custom app
    try {
      const inputUrlObj = new URL(processedUrl);
      
      // Check if this URL matches any favorite app
      const matchedFavoriteApp = favoriteApps.find(app => {
        try {
          const appUrlObj = new URL(app.url);
          return inputUrlObj.hostname === appUrlObj.hostname;
        } catch (e) {
          return false;
        }
      });
      
      // Check if this URL matches any custom app
      const matchedCustomApp = customApps.find(app => {
        try {
          const appUrlObj = new URL(app.url);
          return inputUrlObj.hostname === appUrlObj.hostname;
        } catch (e) {
          return false;
        }
      });
      
      const matchedApp = matchedFavoriteApp || matchedCustomApp;
      
      if (matchedApp) {
        // Use switchToApp which will create the instance if needed
        switchToApp(matchedApp.id);
        
        // Force reload with the exact URL if it's different from the app's default
        if (processedUrl !== matchedApp.url) {
          // Small timeout to ensure the app is fully mounted
          setTimeout(() => reloadWebViewWithUrl(matchedApp.id, processedUrl), 50);
        }
        return;
      }
    } catch (error) {
      console.log('URL parsing error:', error);
    }
    
    // Check other existing instances
    let existingAppId: string | null = null;
    
    Object.entries(appInstances).forEach(([id, instance]) => {
      try {
        const inputUrlObj = new URL(processedUrl);
        const instanceUrlObj = instance.url ? new URL(instance.url) : null;
        
        if (instanceUrlObj && 
            inputUrlObj.hostname === instanceUrlObj.hostname) {
          existingAppId = id;
        }
      } catch (error) {
        console.log('URL parsing error:', error);
      }
    });
    
    if (existingAppId) {
      // Reuse existing app instance
      switchToApp(existingAppId);
      
      // Force reload with the exact URL
      reloadWebViewWithUrl(existingAppId, processedUrl);
    } else {
      // Create a new app instance with a dynamic ID
      const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      setAppInstances(prev => ({
        ...prev,
        [appId]: {
          isConnected: false,
          wallet: null,
          chainId: 1,
          url: processedUrl,
          timestamp: Date.now()
        }
      }));
      
      // Set this as the active app
      setActiveAppId(appId);
      setCurrentUrl(processedUrl);
      setShowWelcome(false);
    }
  };

  // Return to the welcome screen WITHOUT resetting app state
  const handleHomePress = () => {
    setShowWelcome(true);
    // Don't reset activeAppId or currentUrl to preserve state
  };

  // Go back in the active WebView history
  const handleBackPress = () => {
    if (activeAppId && webViewRefs.current[activeAppId] && canGoBack) {
      webViewRefs.current[activeAppId].goBack();
    } else {
      handleHomePress();
    }
  };

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Load custom apps from storage
  useEffect(() => {
    const loadCustomApps = async () => {
      try {
        const storedApps = await AsyncStorage.getItem(CUSTOM_APPS_STORAGE_KEY);
        if (storedApps) {
          setCustomApps(JSON.parse(storedApps));
        }
      } catch (error) {
        console.error('Failed to load custom apps:', error);
      }
    };
    
    loadCustomApps();
  }, []);

  // Save custom apps to storage
  const saveCustomApps = async (apps: CustomApp[]) => {
    try {
      await AsyncStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(apps));
    } catch (error) {
      console.error('Failed to save custom apps:', error);
    }
  };
  
  // Add a new custom app
  const handleAddApp = (name: string, url: string) => {
    // Create a unique ID by combining name and random number
    const id = `my_app_${name.replace(/\s+/g, '_').toLowerCase()}_${Math.floor(Math.random() * 10000)}`;
    
    const newApp: CustomApp = {
      id,
      name,
      url,
      category: 'my' // Set category to 'my'
    };
    
    const updatedApps = [...customApps, newApp];
    setCustomApps(updatedApps);
    saveCustomApps(updatedApps);
    setIsAddAppSheetVisible(false);
  };
  
  // Add an existing app to MY APPS
  const handleAddToMyApps = (name: string, url: string) => {
    // Create a unique ID
    const id = `my_app_${name.replace(/\s+/g, '_').toLowerCase()}_${Math.floor(Math.random() * 10000)}`;
    
    const newApp: CustomApp = {
      id,
      name,
      url,
      category: 'my' // Set category to 'my'
    };
    
    const updatedApps = [...customApps, newApp];
    setCustomApps(updatedApps);
    saveCustomApps(updatedApps);
  };
  
  // Delete a custom app
  const handleDeleteApp = (appId: string) => {
    const updatedApps = customApps.filter(app => app.id !== appId);
    setCustomApps(updatedApps);
    saveCustomApps(updatedApps);
  };
  
  // Handler for showing category info
  const handleShowCategoryInfo = useCallback((category: string, descriptions: AppDescription[]) => {
    setSelectedCategory(category);
    setAppDescriptions(descriptions);
    setIsAppInfoSheetVisible(true);
  }, []);

  // Combine favorite apps and custom apps for WelcomePage
  const allApps = useMemo(() => {
    return [...favoriteApps, ...customApps];
  }, [favoriteApps, customApps]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Show welcome screen if needed, but keep WebViews mounted */}
      {showWelcome && (
        <View style={styles.welcomeContainer}>
          <WelcomePage 
            favoriteApps={allApps} 
            onAppSelect={switchToApp}
            onClearAppData={handleClearAppData}
            onAddCustomApp={() => setIsAddAppSheetVisible(true)}
            onDeleteApp={handleDeleteApp}
            onShowCategoryInfo={handleShowCategoryInfo}
          />
        </View>
      )}
      
      {/* Keep WebViews mounted but hide them when showing welcome */}
      <View style={[
        styles.webviewContainer, 
        // Remove paddingTop to eliminate the space between the status bar and content
        showWelcome && styles.offscreenView // Use position-based hiding instead of display: none
      ]}>
        {/* Render all app instances */}
        {Object.entries(appInstances).map(([instanceId, appState]) => (
          <AppWebView 
            key={instanceId}
            instanceId={instanceId}
            url={appState.url}
            visible={instanceId === activeAppId && !showWelcome}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationStateChange}
            ref={(ref) => handleWebViewRef(ref, instanceId)}
          />
        ))}
      </View>

      {/* Only show navigation bar when not on welcome screen */}
      {!showWelcome && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          style={styles.navigationBarContainer} 
          keyboardVerticalOffset={0}>
          <View style={[styles.navigationBar, { backgroundColor: '#2a2a2a' }]}>
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.navButton}>
              <IconSymbol size={20} name="chevron.left" color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleHomePress}
              style={styles.navButton}>
              <IconSymbol size={20} name="house.fill" color="#ffffff" />
            </TouchableOpacity>
            <TextInput
              style={styles.urlInput}
              value={currentUrl}
              onChangeText={setCurrentUrl}
              onSubmitEditing={() => goToUrl(currentUrl)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
            />
            <TouchableOpacity 
              onPress={() => setIsWalletInfoSheetVisible(true)}
              style={styles.navButton}>
              <IconSymbol size={20} name="key.fill" color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <AppInfoSheet
        isVisible={isAppInfoSheetVisible}
        onClose={() => setIsAppInfoSheetVisible(false)}
        categoryTitle={selectedCategory}
        appDescriptions={appDescriptions}
        onClearData={handleClearAppData}
        onDeleteApp={selectedCategory.toLowerCase() === 'my' ? handleDeleteApp : undefined}
        onAddToMyApps={handleAddToMyApps}
      />
      
      <AddAppSheet
        isVisible={isAddAppSheetVisible}
        onClose={() => setIsAddAppSheetVisible(false)}
        onAddApp={handleAddApp}
      />
      
      <WalletConnectSheet
        isVisible={isWalletSheetVisible}
        onClose={handleConnectCancel}
        onConnect={handleConnectConfirm}
        onCancel={handleConnectCancel}
      />
      <WalletInfoSheet
        isVisible={isWalletInfoSheetVisible}
        onClose={() => setIsWalletInfoSheetVisible(false)}
        onDisconnect={handleDisconnect}
        onSwitchWallet={handleSwitchWallet}
        wallet={activeAppState.wallet}
      />
      <SignatureRequestSheet
        isVisible={isSignatureSheetVisible}
        message={signatureMessage}
        currentWallet={pendingAppId ? appInstances[pendingAppId]?.wallet : null}
        currentChainId={pendingAppId ? appInstances[pendingAppId]?.chainId : 1}
        onClose={handleSignatureClose}
        onSuccess={handleSignatureSuccess}
      />
      <TransactionRequestSheet
        isVisible={isTransactionSheetVisible}
        transaction={transactionDetails}
        currentWallet={pendingAppId ? appInstances[pendingAppId]?.wallet : null}
        currentChainId={pendingAppId ? appInstances[pendingAppId]?.chainId : 1}
        onClose={handleTransactionClose}
        onSuccess={handleTransactionSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webviewContainer: {
    flex: 1,
    paddingBottom: 50, // Fixed padding for the navigation bar height
    // Ensure there are no invisible overlays blocking touch events
    overflow: 'hidden',
  },
  navigationBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8, // Add elevation for Android to ensure it's above other elements
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopColor: '#333333',
    height: 50,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#555555',
    marginHorizontal: 4,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  urlInput: {
    flex: 1,
    height: 36,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0, // Square corners
    backgroundColor: '#444444',
    color: '#ffffff',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#333333',
    borderLeftColor: '#333333',
    borderBottomColor: '#666666',
    borderRightColor: '#666666',
  },
  webviewWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Make sure WebView container isn't interfering with touches
    overflow: 'hidden',
    backgroundColor: 'transparent', // Avoid any background color that might block touch
  },
  offscreenView: {
    position: 'absolute',
    left: -10000, // Move far off-screen instead of changing opacity
    width: '100%',
    height: '100%',
  },
  welcomeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10, // Ensure welcome screen appears above WebViews
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent', // Ensure WebView has transparent background
  },
});