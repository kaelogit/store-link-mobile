import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Play, ShoppingBag } from 'lucide-react-native';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

export const ProfileGridItem = ({ item, type, router, theme, activeTab }: any) => {
  const imageUrl = type === 'wardrobe' ? item.product?.image_urls?.[0] : (item.image_urls?.[0] || item.thumbnail_url);
  if (!imageUrl) return null;

  const isMasonry = activeTab === 'drops';
  // Maintaining your exact height/width logic
  const itemHeight = isMasonry ? (Math.random() > 0.5 ? (width / 2) * 1.2 : (width / 2) * 0.8) : (width / 3) * 1.2;
  const itemWidth = isMasonry ? (width - 30) / 2 : (width - 4) / 3;

  return (
    <TouchableOpacity 
      style={[styles.gridCard, { backgroundColor: theme.surface, width: itemWidth, height: itemHeight, margin: isMasonry ? 5 : 0.6 }]} 
      onPress={() => router.push(type === 'reels' ? `/explore?id=${item.id}` : `/product/${item.product?.id || item.id}`)}
    >
      <Image source={{ uri: imageUrl }} style={styles.gridImg} />
      {type === 'reels' && <View style={styles.reelBadge}><Play size={12} color="#FFFFFF" /></View>}
      {type === 'wardrobe' && <View style={styles.wardrobeBadge}><ShoppingBag size={10} color="#FFFFFF" /></View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: { borderRadius: 8, overflow: 'hidden', position: 'relative' },
  gridImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  reelBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 4 },
  wardrobeBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#10B981', borderRadius: 4, padding: 4 },
});