import React, { useState, useRef, memo } from 'react';
import { 
  StyleSheet, Image, TouchableOpacity, 
  Dimensions, ScrollView, NativeSyntheticEvent, 
  NativeScrollEvent, Animated, Platform, Pressable 
} from 'react-native';
import { 
  Heart, MessageCircle, Share2, 
  BadgeCheck, Bookmark, Plus, Tag, Diamond 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// 🏛️ Sovereign Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';
import { shareProductDrop } from './ExternalLink'; 

const { width } = Dimensions.get('window');
const IMAGE_RATIO = 1.25; 
const IMAGE_HEIGHT = width * IMAGE_RATIO;

/**
 * 🏰 PRODUCT CARD v77.1 (Pure Build)
 * Audited: Section I Identity Layer & Section II Asset Registry.
 */
export const ProductCard = memo(({ 
  item, 
  isSaved, 
  onAddToCart, 
  onOpenComments,
  onToggleWishlist,
  onToggleLike
}: any) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [localLiked, setLocalLiked] = useState(false);
  const likeScale = useRef(new Animated.Value(0)).current;

  // 🛡️ PRESTIGE AUTHORITY
  const merchant = item.seller;
  const isDiamond = merchant?.prestige_weight === 3;
  const isVerified = merchant?.is_verified;

  const handleDoubleTap = () => {
    if (!localLiked) {
      setLocalLiked(true);
      onToggleLike?.(item.id);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 0, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(slide);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 👤 BRAND INFO */}
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <TouchableOpacity 
          activeOpacity={0.7}
          style={styles.merchantNode}
          onPress={() => router.push(`/profile/${item.seller_id}`)}
        >
          <Image source={{ uri: merchant?.logo_url }} style={styles.avatar} />
          <View style={{ backgroundColor: 'transparent' }}>
            <View style={[styles.nameRow, { backgroundColor: 'transparent' }]}>
              <Text style={[styles.merchantName, { color: theme.text }]}>
                {merchant?.display_name?.toUpperCase() || 'BRAND'}
              </Text>
              {isDiamond ? (
                <Diamond size={12} color="#8B5CF6" fill="#8B5CF6" />
              ) : (
                isVerified && <BadgeCheck size={14} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
              )}
            </View>
            <View style={[styles.categoryRow, { backgroundColor: 'transparent' }]}>
              <Tag size={10} color={theme.subtext} />
              <Text style={[styles.categoryLabel, { color: theme.subtext }]}>
                {item.category?.toUpperCase() || 'EXCLUSIVES'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {item.is_flash_drop && (
          <View style={[styles.flashBadge, { backgroundColor: Colors.brand.gold + '15' }]}>
            <Text style={[styles.flashText, { color: Colors.brand.gold }]}>⚡ FLASH</Text>
          </View>
        )}
      </View>

      {/* 🖼️ CINEMATIC CANVAS */}
      <View style={styles.mediaContainer}>
        <Pressable onPress={handleDoubleTap}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {item.image_urls?.map((url: string, idx: number) => (
              <Image key={idx} source={{ uri: url }} style={styles.mainImage} />
            ))}
          </ScrollView>
        </Pressable>

        <Animated.View style={[styles.centerHeart, { transform: [{ scale: likeScale }] }]}>
          <Heart size={80} color="white" fill="white" />
        </Animated.View>

        <TouchableOpacity 
          style={styles.vaultBtn}
          onPress={() => {
            Haptics.selectionAsync();
            onToggleWishlist(item.id);
          }}
        >
          <BlurView intensity={25} tint="dark" style={styles.vaultBlur}>
            <Bookmark 
              size={20} 
              color={isSaved ? Colors.brand.emerald : "white"} 
              fill={isSaved ? Colors.brand.emerald : "transparent"} 
              strokeWidth={2.5}
            />
          </BlurView>
        </TouchableOpacity>

        {/* 🏝️ CONTROLS */}
        <BlurView intensity={Platform.OS === 'ios' ? 45 : 90} tint="dark" style={styles.actionIsland}>
            <View style={styles.islandRow}>
              <View style={styles.utilityGroup}>
                <TouchableOpacity onPress={() => { setLocalLiked(!localLiked); onToggleLike?.(item.id); }}>
                  <Heart 
                    size={22} 
                    color={localLiked ? "#EF4444" : "white"} 
                    fill={localLiked ? "#EF4444" : "transparent"} 
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={onOpenComments}>
                  <MessageCircle size={22} color="white" strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shareProductDrop(item.id, item.name, merchant?.display_name)}>
                  <Share2 size={22} color="white" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.plusBtn, { backgroundColor: Colors.brand.emerald }]} 
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onAddToCart(item);
                }}
              >
                  <Plus size={26} color="white" strokeWidth={3} />
              </TouchableOpacity>
            </View>
        </BlurView>

        <View style={styles.pagination}>
          {item.image_urls?.length > 1 && item.image_urls.map((_: any, i: number) => (
            <View key={i} style={[styles.dot, activeImageIndex === i && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* 📊 PRODUCT DETAILS */}
      <View style={[styles.intel, { backgroundColor: 'transparent' }]}>
        <View style={[styles.priceRow, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.priceText, { color: theme.text }]}>₦{item.price?.toLocaleString()}</Text>
          {item.stock_quantity <= 3 && item.stock_quantity > 0 && (
            <Text style={styles.lowStockText}>LOW STOCK</Text>
          )}
        </View>
        
        <Text style={[styles.description, { color: theme.subtext }]} numberOfLines={2}>
          <Text style={[styles.brandTag, { color: theme.text }]}>{merchant?.display_name?.toUpperCase()} </Text>
          {item.description}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: 35 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15 
  },
  merchantNode: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F3F4F6' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  merchantName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  categoryLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  flashBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  flashText: { fontSize: 9, fontWeight: '900' },
  
  mediaContainer: { width: width, height: IMAGE_HEIGHT },
  mainImage: { width: width, height: IMAGE_HEIGHT, resizeMode: 'cover' },
  centerHeart: { position: 'absolute', top: '40%', alignSelf: 'center', zIndex: 10 },
  
  vaultBtn: { position: 'absolute', top: 20, right: 20, borderRadius: 16, overflow: 'hidden' },
  vaultBlur: { padding: 10, borderRadius: 16 },

  actionIsland: { 
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center', 
    borderRadius: 28, 
    width: width * 0.88, 
    paddingVertical: 12, 
    paddingHorizontal: 22, 
    overflow: 'hidden' 
  },
  islandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' },
  utilityGroup: { flexDirection: 'row', gap: 28, backgroundColor: 'transparent' },
  plusBtn: { 
    width: 46, height: 46, borderRadius: 23, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 10
  },
  
  pagination: { position: 'absolute', top: 20, left: 20, flexDirection: 'row', gap: 5, backgroundColor: 'transparent' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 15, backgroundColor: 'white' },
  
  intel: { paddingHorizontal: 20, paddingTop: 18 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  priceText: { fontSize: 26, fontWeight: '900', letterSpacing: -1.2 },
  lowStockText: { fontSize: 10, fontWeight: '900', color: '#EF4444', letterSpacing: 1 },
  description: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  brandTag: { fontWeight: '900', letterSpacing: 0.5 }
});