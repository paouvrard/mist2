import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View } from 'react-native';
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

export interface AppDescription {
  id: string;
  name: string;
  description: string;
}

interface Props {
  isVisible: boolean;
  onClose: () => void;
  categoryTitle: string;
  appDescriptions: AppDescription[];
  onClearData?: (appId: string) => void;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

export function AppInfoSheet({ isVisible, onClose, categoryTitle, appDescriptions, onClearData }: Props) {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(false);
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  // Add state to track which apps have been cleared
  const [clearedApps, setClearedApps] = useState<Record<string, boolean>>({});

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
      // Reset cleared state when sheet is closed
      setClearedApps({});
    }
  }, [isVisible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Handle clear data with temporary "Cleared!" text
  const handleClearData = (appId: string) => {
    if (onClearData) {
      // Update state to show "Cleared!" text
      setClearedApps(prev => ({ ...prev, [appId]: true }));
      
      // Call the original handler
      onClearData(appId);
      
      // Reset text after 1 second
      setTimeout(() => {
        setClearedApps(prev => ({ ...prev, [appId]: false }));
      }, 1000);
    }
  };

  if (!isRendered && !isVisible) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0,0,0,0.5)' },
          overlayStyle,
        ]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: '#2a2a2a',
            paddingBottom: insets.bottom + 25,
          },
          sheetStyle,
        ]}>
        {/* Windows 95-style title bar */}
        <View style={styles.titleBar}>
          <ThemedText type="title" style={styles.titleText}>
            {categoryTitle} Apps
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {appDescriptions.length > 0 ? (
            appDescriptions.map((app) => (
              <View key={app.id} style={styles.appItem}>
                <ThemedText style={styles.appName}>{app.name}</ThemedText>
                <ThemedText style={styles.appDescription}>
                  {app.description}
                </ThemedText>
                {onClearData && (
                  <TouchableOpacity 
                    style={styles.clearButton} 
                    onPress={() => handleClearData(app.id)}
                  >
                    <ThemedText style={styles.clearButtonText}>
                      {clearedApps[app.id] ? 'Cleared !' : 'Clear Data'}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.noAppsContainer}>
              <ThemedText style={styles.noAppsText}>
                No app descriptions available for this category.
              </ThemedText>
            </View>
          )}
        </ScrollView>
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
    maxHeight: '80%',
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
  content: {
    padding: 16,
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
  clearButton: {
    backgroundColor: '#555555',
    paddingVertical: 8,
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