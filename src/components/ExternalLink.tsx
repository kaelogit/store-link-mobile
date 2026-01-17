import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform, Share, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ExternalLinkProps extends React.ComponentProps<typeof Link> {
  href: string;
}

/**
 * 🏰 LINK & SHARE ENGINE v61.1 (Pure Build)
 * Audited: Native Sharing, Deep-Linking, and Browser Sync.
 */

// 🚀 BROWSER SYNC: Opens links within the app experience
export function ExternalLink({ href, ...rest }: ExternalLinkProps) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href as any}
      onPress={async (e) => {
        if (Platform.OS !== 'web') {
          // 🛡️ Keep user within the secure app experience
          e.preventDefault();
          Haptics.selectionAsync();
          
          // Open in professional in-app browser
          await WebBrowser.openBrowserAsync(href, {
            readerMode: false,
            toolbarColor: '#111827', // StoreLink Onyx Constant
            enableBarCollapsing: true,
          });
        }
      }}
    />
  );
}

// 🚀 MARKETPLACE SHARE: Handles product promotion and viral discovery
export const shareProductDrop = async (productId: string, productName: string, merchantName: string) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  
  // Standardized Deep-Link Protocol
  const deepLink = `https://storelink.ng/product/${productId}`;
  const message = `Check out this new drop: "${productName}" from ${merchantName} on StoreLink. ✨\n\nView item: ${deepLink}`;

  try {
    const result = await Share.share({
      message: message,
      url: deepLink, // Native deep-link support
      title: `StoreLink Drop: ${productName}`,
    });

    if (result.action === Share.sharedAction) {
      // Logic for successful broadcast
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch (error: any) {
    Alert.alert("Share Error", "Could not complete the request. Please try again.");
  }
};