import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Platform, 
  Dimensions,
  FlatList,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTabVisibility } from '@/hooks/useTabVisibility';

export interface AppDescription {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  categoryTitle: string;
  appDescriptions: AppDescription[];
  onClearData: (appId: string) => void;
  onDeleteApp?: (appId: string) => void;
  onAddToMyApps?: (name: string, url: string) => void;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

// Special Android-compatible button component
const AndroidSafeButton = ({
  onPress,
  style,
  children,
  disabled = false
}: {
  onPress: () => void,
  style: any,
  children: React.ReactNode,
  disabled?: boolean
}) => {
  // On Android, use a plain View with direct touch event handling
  if (Platform.OS === 'android') {
    return (
      <View 
        style={[style, disabled && { opacity: 0.6 }]} 
        onTouchEnd={(e: any) => {
          e.preventDefault();
          if (!disabled) onPress();
        }}
      >
        {children}
      </View>
    );
  }
  
  // Use regular TouchableOpacity for iOS
  return (
    <TouchableOpacity
      style={[style, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

export function AppInfoSheet({ isVisible, onClose, categoryTitle, appDescriptions, onClearData, onDeleteApp, onAddToMyApps }: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const [deletingApps, setDeletingApps] = useState<string[]>([]);
  const [addedApps, setAddedApps] = useState<{ [key: string]: boolean }>({});
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const { setHideTabBar } = useTabVisibility();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get screen dimensions for max height calculation
  const windowHeight = Dimensions.get('window').height;
  const maxSheetHeight = windowHeight * 0.8; // 80% of screen height

  // Track if this is the "my" category
  const isCustomAppsCategory = categoryTitle.toLowerCase() === 'my';

  // Forcibly keep tab bar hidden with an interval when the sheet is visible
  useEffect(() => {
    if (isVisible) {
      // Immediately hide the tab bar
      setHideTabBar(true);
      
      // Force tab bar to stay hidden with frequent updates to override parent effects
      intervalRef.current = setInterval(() => {
        setHideTabBar(true);
      }, 100);
    } else {
      // Clear the interval when closing
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Allow the tab bar to be shown again
      setHideTabBar(false);
    }
    
    return () => {
      // Clean up interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setHideTabBar(false);
    };
  }, [isVisible, setHideTabBar]);

  // Animation effect for the sheet
  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      opacity.value = withTiming(1);
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      opacity.value = withTiming(0, undefined, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
      translateY.value = withSpring(1000, SPRING_CONFIG);
    }
  }, [isVisible]);

  const handleClearData = (appId: string) => {
    onClearData(appId);
  };
  
  const handleDeleteApp = (appId: string) => {
    if (onDeleteApp) {
      // Add this app to the list of currently being deleted
      setDeletingApps(prev => [...prev, appId]);
      
      // Call the delete handler
      onDeleteApp(appId);
      
      // Check if this is the last app in the category
      const remainingApps = appDescriptions.filter(app => 
        app.id !== appId && !deletingApps.includes(app.id)
      );
      
      if (remainingApps.length === 0) {
        // If this was the last app, close the sheet
        onClose();
      }
    }
  };

  const handleAddToMyApps = (name: string, url: string) => {
    if (onAddToMyApps) {
      // Call the handler to add the app
      onAddToMyApps(name, url);
      
      // Mark this app as added
      setAddedApps(prev => ({ ...prev, [name]: true }));
      
      // Reset the button text after 1 second
      setTimeout(() => {
        setAddedApps(prev => ({ ...prev, [name]: false }));
      }, 1000);
    }
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    maxHeight: maxSheetHeight,
  }));

  // Make this sheet fit content properly without excessive space
  const extraBottomPadding = Platform.OS === 'ios' ? 20 : 10;
  const bottomInset = insets.bottom + extraBottomPadding;

  if (!isRendered && !isVisible) {
    return null;
  }

  // Custom close handler to ensure we clean up properly
  const handleClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHideTabBar(false);
    onClose();
  };

  // Render each app item
  const renderAppItem = ({ item: app }: { item: AppDescription }) => {
    // Skip apps that are being deleted
    if (deletingApps.includes(app.id)) {
      return null;
    }
    
    return (
      <View key={app.id} style={styles.appItem}>
        <ThemedText style={styles.appName}>{app.name}</ThemedText>
        
        {app.description ? (
          <ThemedText style={styles.appDescription}>
            {app.description}
          </ThemedText>
        ) : null}
        
        {app.url ? (
          <ThemedText style={styles.appUrl}>
            {app.url}
          </ThemedText>
        ) : null}
        
        <View style={styles.buttonsRow}>
          <AndroidSafeButton 
            style={styles.clearButton} 
            onPress={() => handleClearData(app.id)}
          >
            <ThemedText style={styles.clearButtonText}>
              Clear Data
            </ThemedText>
          </AndroidSafeButton>
          
          {!isCustomAppsCategory && onAddToMyApps && app.url && (
            <AndroidSafeButton 
              style={styles.addButton} 
              onPress={() => handleAddToMyApps(app.name, app.url)}
              disabled={!!addedApps[app.name]} // Disable if already added
            >
              <ThemedText style={styles.addButtonText}>
                {addedApps[app.name] ? 'Added !' : 'Add to MY APPS'}
              </ThemedText>
            </AndroidSafeButton>
          )}
          
          {isCustomAppsCategory && onDeleteApp && (
            <AndroidSafeButton 
              style={styles.deleteButton} 
              onPress={() => handleDeleteApp(app.id)}
            >
              <ThemedText style={styles.deleteButtonText}>
                Delete App
              </ThemedText>
            </AndroidSafeButton>
          )}
        </View>
      </View>
    );
  };

  // Render empty list component
  const renderEmptyList = () => (
    <View style={styles.noAppsContainer}>
      <ThemedText style={styles.noAppsText}>
        Your apps will appear here. Use MY APPS to create custom links to Safe Apps and your other favorite applications.
      </ThemedText>
    </View>
  );

  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0,0,0,0.5)' },
          overlayStyle,
          { zIndex: 10000 }
        ]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: '#2a2a2a',
            paddingBottom: bottomInset,
            zIndex: 10001,
            elevation: 50,
            maxHeight: maxSheetHeight,
          },
          sheetStyle,
        ]}>
        {/* Windows 95-style title bar */}
        <View style={styles.titleBar}>
          <ThemedText type="title" style={styles.titleText}>
            {categoryTitle} Apps
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={appDescriptions}
          renderItem={renderAppItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 0, padding: 16 }}
          ListEmptyComponent={renderEmptyList}
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          android_disableSound={true}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#666666',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a7a8c',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  titleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 20,
    height: 20,
    backgroundColor: '#c0c0c0',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderBottomColor: '#555555',
    borderRightColor: '#555555',
  },
  appItem: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#555555',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#e8e8e8',
  },
  appDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#b8b8b8',
    marginBottom: 12,
  },
  appUrl: {
    fontSize: 14,
    lineHeight: 20,
    color: '#b8b8b8',
    marginBottom: 12,
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#555555',
    paddingVertical: 6, // Match addButton padding
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  clearButtonText: {
    color: '#FF9999',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#555555',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 8, // Same margin as clearButton and deleteButton
    width: 140,
    alignItems: 'center',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  addButtonText: {
    color: '#e8e8e8',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#555555',
    paddingVertical: 6, // Match other buttons
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  deleteButtonText: {
    color: '#FF9999',
    fontSize: 14,
    fontWeight: '500',
  },
  noAppsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a3a3a',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#333333',
    borderLeftColor: '#333333',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  noAppsText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#e8e8e8',
  },
});