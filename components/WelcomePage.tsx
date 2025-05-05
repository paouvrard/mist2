import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface WelcomePageProps {
  favoriteApps: Array<{ id: string; name: string; url: string; category: string }>;
  onAppSelect: (appId: string) => void;
}

export function WelcomePage({ favoriteApps, onAppSelect }: WelcomePageProps) {
  const insets = useSafeAreaInsets();
  
  // Calculate proper top padding based on platform, matching index page
  const titleTopPadding = Platform.OS === 'ios' ? insets.top + 20 : 40;

  // Define category order (priority list)
  const categoryOrder = [
    'portfolio',
    'swap',
    'earn', 
    'bridge',
    'social',
    'nft',
    'other',
    'testnet'
  ];

  // Group apps by category
  const appsByCategory = useMemo(() => {
    const groupedApps: { [key: string]: typeof favoriteApps } = {};
    
    favoriteApps.forEach(app => {
      const category = app.category || 'other';
      if (!groupedApps[category]) {
        groupedApps[category] = [];
      }
      groupedApps[category].push(app);
    });
    
    return groupedApps;
  }, [favoriteApps]);
  
  // Get sorted categories based on the predefined order
  const sortedCategories = useMemo(() => {
    // Get all unique categories from the apps
    const availableCategories = Object.keys(appsByCategory);
    
    // First, add categories in the predefined order (if they exist in the apps)
    const orderedCategories = categoryOrder.filter(cat => availableCategories.includes(cat));
    
    // Then add any additional categories that might not be in our predefined order
    const remainingCategories = availableCategories
      .filter(cat => !categoryOrder.includes(cat))
      .sort(); // Sort alphabetically
    
    return [...orderedCategories, ...remainingCategories];
  }, [appsByCategory, categoryOrder]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.titleContainer, { marginTop: titleTopPadding }]}>
        <ThemedText style={styles.titleText}>APPS</ThemedText>
      </View>
      
      <ScrollView style={styles.contentContainer}>
        {sortedCategories.map(category => (
          <View key={category} style={styles.categorySection}>
            <ThemedText style={styles.categoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </ThemedText>
            
            <View style={styles.grid}>
              {appsByCategory[category].map((app) => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.appButton}
                  onPress={() => onAppSelect(app.id)}>
                  <ThemedText style={styles.appButtonText}>{app.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a', // Same dark background as index page
    padding: 16,
    marginBottom: 45,
  },
  titleContainer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  titleText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
    letterSpacing: 0.5,
    height: 40,
    lineHeight: 36,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  contentContainer: {
    flex: 1,
    padding: 8,
  },
  categorySection: {
    marginBottom: 5,
  },
  categoryTitle: {
    fontSize: 18,
    color: '#e8e8e8',
    marginBottom: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
  },
  appButton: {
    backgroundColor: '#555555',
    padding: 16,
    minWidth: 150,
    alignItems: 'center',
    marginBottom: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
  },
  appButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});