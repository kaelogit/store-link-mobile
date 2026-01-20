import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Play, ShoppingBag } from 'lucide-react-native';
import { Image } from 'expo-image'; // 🛡️ HIGH-SPEED IMAGE ENGINE
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

interface ProfileGridItemProps {
  item: any;
  type: 'drops' | 'reels' | 'wardrobe';
  router: any;
  theme: any;
  index: number;
  activeTab: string;
}

/**
 * 🏰 PROFILE GRID ITEM v105.0
 * Purpose: Renders a single item in the profile grid (Product, Reel, or Saved Item).
 * Fix: Stable Masonry Layout (No Jitter) & High-Performance Images.
 */
export const ProfileGridItem = ({ item, type, router, theme, index, activeTab }: ProfileGridItemProps) => {
  
  // 🛡️ Safe Image Extraction
  const imageUrl = useMemo(() => {
    if (type === 'wardrobe') return item.image_urls?.[0]; // Wardrobe items are products directly
    if (type === 'reels') return item.thumbnail_url;
    return item.image_urls?.[0]; // Drops
  }, [item, type]);

  if (!imageUrl) return null;

  const isMasonry = activeTab === 'drops';
  
  // 🛡️ STABLE HEIGHT CALCULATION
  // Instead of Math.random(), we use modulo logic on the index to create a repeating but STABLE pattern.
  // Pattern: Tall, Short, Short, Tall...
  const itemHeight = useMemo(() => {
    if (!isMasonry) return (width / 3) * 1.25; // Standard grid for Reels/Wardrobe
    const pattern = index % 4; 
    if (pattern === 0 || pattern === 3) return (width / 2) * 1.3; // Tall
    return (width / 2) * 0.9; // Short
  }, [index, isMasonry]);

  const itemWidth = isMasonry ? (width - 30) / 2 : (width - 4) / 3;

  const handlePress = () => {
    if (type === 'reels') {
      // Navigate to explore feed but focused on this reel
      // Note: You might need a specific reel viewer route if explore doesn't support ID params yet
      router.push(`/story-viewer/${item.id}`); 
    } else {
      router.push(`/product/${item.id}`);
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[
        styles.gridCard, 
        { 
          backgroundColor: theme.surface, 
          width: itemWidth, 
          height: itemHeight, 
          margin: isMasonry ? 5 : 0.6,
          marginBottom: isMasonry ? 10 : 0.6
        }
      ]} 
      onPress={handlePress}
    >
      <Image 
        source={{ uri: imageUrl }} 
        style={styles.gridImg} 
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      
      {/* 🛡️ TYPE BADGES */}
      {type === 'reels' && (
        <View style={styles.reelBadge}>
          <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.viewCount}>{formatCompactNumber(item.view_count || 0)}</Text>
        </View>
      )}
      
      {type === 'wardrobe' && (
        <View style={styles.wardrobeBadge}>
          <ShoppingBag size={10} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Helper for Reel Views
const formatCompactNumber = (number: number) => {
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
};

// Helper Text Component just for this file to avoid import loops if needed
const Text = ({ style, children }: any) => <Text style={style}>{children}</Text>; 

const styles = StyleSheet.create({
  gridCard: { borderRadius: 8, overflow: 'hidden', position: 'relative' },
  gridImg: { width: '100%', height: '100%' },
  
  reelBadge: { 
    position: 'absolute', 
    bottom: 8, 
    left: 8, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)', 
    borderRadius: 4, 
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  viewCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700'
  },
  
  wardrobeBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: Colors.brand.emerald, 
    borderRadius: 6, 
    padding: 6 
  },
});