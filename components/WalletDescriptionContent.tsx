// filepath: /Users/pa/mist2/components/WalletDescriptionContent.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

export function WalletDescriptionContent() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.paragraph}>
        Mist2 is your minimalist mobile Ethereum app gateway. It focuses on wallet connectivity, accessibility, privacy and security.
      </ThemedText>
      
      <ThemedText style={styles.sectionTitle}>Key Features:</ThemedText>
      <View style={styles.bulletPointContainer}>
        <ThemedText style={styles.bulletPoint}>• </ThemedText>
        <ThemedText style={styles.bulletPointText}>Hardware wallet support on the go</ThemedText>
      </View>
      <View style={styles.bulletPointContainer}>
        <ThemedText style={styles.bulletPoint}>• </ThemedText>
        <ThemedText style={styles.bulletPointText}>Manage multiple wallets: for privacy it is recommended to use many different addresses and to avoid linking them on-chain</ThemedText>
      </View>
      <View style={styles.bulletPointContainer}>
        <ThemedText style={styles.bulletPoint}>• </ThemedText>
        <ThemedText style={styles.bulletPointText}>Drag and drop to organise your wallets</ThemedText>
      </View>
      <View style={styles.bulletPointContainer}>
        <ThemedText style={styles.bulletPoint}>• </ThemedText>
        <ThemedText style={styles.bulletPointText}>Privacy-focused, no tracking or data collection, this is a tool not a product.</ThemedText>
      </View>
      <View style={styles.bulletPointContainer}>
        <ThemedText style={styles.bulletPoint}>• </ThemedText>
        <ThemedText style={styles.bulletPointText}>Open source</ThemedText>
      </View>
      
      <View style={styles.disclaimerBox}>
        <ThemedText style={styles.disclaimerTitle}>Disclaimer</ThemedText>
        <ThemedText style={styles.disclaimerText}>
          Mist2 is a self-custody wallet. You are responsible for securing your private keys and recovery phrases. We do not store your keys, collect your data, or have the ability to recover funds. Always review transactions and messages before signing them.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    color: '#e8e8e8',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 4,
    color: '#e8e8e8',
  },
  bulletPointContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#e8e8e8',
    width: 12,
  },
  bulletPointText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#e8e8e8',
    flex: 1,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(255, 70, 70, 0.15)',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9999',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#ff9999',
  },
});