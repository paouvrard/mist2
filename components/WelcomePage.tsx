import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface WelcomePageProps {
  favoriteApps: Array<{ id: string; name: string; url: string }>;
  onAppSelect: (appId: string) => void;
}

export function WelcomePage({ favoriteApps, onAppSelect }: WelcomePageProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.content, { 
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }]}>
        <ThemedText type="title" style={styles.title}>Welcome</ThemedText>
        <ThemedText style={styles.subtitle}>Your Favorite dApps</ThemedText>
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
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  appButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  appButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});