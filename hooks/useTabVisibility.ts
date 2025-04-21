import { createContext, useContext } from 'react';

export const TabVisibilityContext = createContext({
  hideTabBar: false,
  setHideTabBar: (hide: boolean) => {},
});

export const useTabVisibility = () => useContext(TabVisibilityContext);