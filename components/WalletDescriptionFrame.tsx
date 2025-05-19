// filepath: /Users/pa/mist2/components/WalletDescriptionFrame.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WalletDescriptionContent } from './WalletDescriptionContent';

export function WalletDescriptionFrame() {
  return (
    <View style={styles.frame}>
      <WalletDescriptionContent />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#3a3a3a',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: '#888888',
    borderLeftColor: '#888888',
    borderBottomColor: '#444444',
    borderRightColor: '#444444',
    padding: 6,
    marginVertical: 6,
    width: '100%', // Ensure it takes full width
  },
});