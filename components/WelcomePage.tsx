import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface WelcomePageProps {
  favoriteApps: Array<{ id: string; name: string; url: string }>;
  onAppSelect: (appId: string) => void;
}

export function WelcomePage({ favoriteApps, onAppSelect }: WelcomePageProps) {
  const insets = useSafeAreaInsets();
  
  // Calculate proper top padding based on platform, matching index page
  const titleTopPadding = Platform.OS === 'ios' ? insets.top + 20 : 40;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.titleContainer, { marginTop: titleTopPadding }]}>
        <ThemedText style={styles.titleText}>APPS</ThemedText>
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.grid}>
          {favoriteApps.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.appButton}
              onPress={() => onAppSelect(app.id)}>
              <ThemedText style={styles.appButtonText}>{app.name}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2a2a2a', // Same dark background as index page
    padding: 16,
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
  subtitle: {
    fontSize: 18,
    color: '#e8e8e8',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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