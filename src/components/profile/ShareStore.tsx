import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { Share2, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';
interface ShareStoreProps {
  slug?: string | null; // Made optional for safety
  displayName?: string | null;
}

/**
 * 🏰 SHARE STORE ENGINE v1.1
 * Purpose: Allows sellers to broadcast their store link to other platforms.
 * Logic: Generates a clean URL and uses the phone's native sharing tools.
 */
export const ShareStore = ({ slug, displayName }: ShareStoreProps) => {
  const theme = Colors[(useColorScheme() ?? 'light') as 'light' | 'dark'];
  const [copied, setCopied] = useState(false);

  // Fallback if data is loading
  const safeSlug = slug || 'store';
  const safeName = displayName || 'Store';

  // The professional public URL
  const storeUrl = `https://storelink.app/${safeSlug}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(storeUrl);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Reset the "Copied" checkmark after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Check out my store ${safeName} on StoreLink! 🛍️\n\n${storeUrl}`,
      });
    } catch (error) {
      Alert.alert("Error", "Could not open share menu.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.subtext }]}>YOUR STORE LINK</Text>
      
      <View style={[styles.linkBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.urlText, { color: theme.text }]} numberOfLines={1}>
          storelink.app/{safeSlug}
        </Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleCopy} style={styles.iconBtn}>
            {copied ? (
              <Check size={18} color={Colors.brand.emerald} strokeWidth={3} />
            ) : (
              <Copy size={18} color={theme.subtext} />
            )}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity onPress={handleNativeShare} style={styles.iconBtn}>
            <Share2 size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  divider: {
    width: 1.5,
    height: 20,
  },
});