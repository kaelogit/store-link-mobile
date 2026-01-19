import React, { useState, useRef, memo, useCallback } from 'react';
import { 
  StyleSheet, TouchableOpacity, 
  ScrollView, Animated, Platform, Pressable,
  useWindowDimensions 
} from 'react-native';
import { 
  Heart, MessageCircle, Share2, 
  Bookmark, MapPin, Package, 
  Gem, ShoppingBag, Sparkles
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image'; // 🛡️ High-Speed Image Caching

// App Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const SIDEBAR_WIDTH = 60;

interface ProductCardProps {
  item: {
    id: string;
    seller_id: string;
    name: string;
    price: number;
    description: string;
    stock_quantity: number;
    image_urls: string[];
    likes_count?: number;
    comments_count?: number;
    is_liked?: boolean; 
    seller?: {
      display_name: string;
      slug: string;
      location?: string;
      location_city?: string;
      location_state?: string;
      logo_url?: string;
      subscription_plan?: string;
    };
  };
  index?: number;
  isSaved: boolean;
  onAddToCart: (item: any) => void;
  onOpenComments: () => void;
  onToggleWishlist: (id: string) => void;
  onToggleLike: (id: string) => void;
}

/**
 * 🏰 PRODUCT CARD v102.0
 * Visual: Premium layout with interactive social actions.
 * Features: Double-tap to like, image carousel, and real-time stock alerts.
 */
export const ProductCard = memo<ProductCardProps>(({ 
  item, isSaved, onOpenComments, onToggleWishlist, onToggleLike, onAddToCart 
}) => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { width: screenWidth } = useWindowDimensions();
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const likeScale = useRef(new Animated.Value(0)).current;

  const contentWidth = screenWidth - SIDEBAR_WIDTH - 30;
  const imageHeight = screenWidth > 600 ? 580 : 440; 

  const isDiamond = item.seller?.subscription_plan === 'diamond';

  const handleLike = useCallback(() => {
    onToggleLike?.(item.id);
    if (!item.is_liked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Animated.sequence([
        Animated.spring(likeScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.spring(likeScale, { toValue: 0, friction: 5, useNativeDriver: true }),
      ]).start();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [item.id, item.is_liked, onToggleLike]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 🏛️ SELLER INFORMATION */}
      <View style={styles.topSection}>
        <View style={styles.sidebarColumn}>
          <TouchableOpacity 
            onPress={() => router.push(`/profile/${item.seller_id}` as any)} 
            style={[styles.logoBox, { borderColor: theme.border }, isDiamond && styles.diamondHalo]}
          >
            <Image 
              source={item.seller?.logo_url} 
              style={styles.logoImg} 
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.contentColumn}>
          <View style={styles.identityStack}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: theme.text }]} numberOfLines={1}>
                {(item.seller?.display_name || 'Store').toUpperCase()}
              </Text>
              {isDiamond && <Gem size={12} color="#8B5CF6" fill="#8B5CF6" />}
            </View>
            
            <View style={styles.handleRow}>
              <Text style={[styles.slugText, { color: theme.subtext }]}>
                @{item.seller?.slug || 'shop'}
              </Text>
              {isDiamond && <Sparkles size={10} color="#A78BFA" fill="#A78BFA" style={{ marginLeft: 4 }} />}
            </View>
          </View>

          <View style={styles.productPriceRow}>
            <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
              {item.name.toUpperCase()}
            </Text>
            <Text style={[styles.priceText, { color: Colors.brand.emerald }]}>
              ₦{item.price.toLocaleString()}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={10} color={theme.subtext} strokeWidth={3} />
              <Text style={[styles.metaText, { color: theme.subtext }]}>
                {item.seller?.location_city ? `${item.seller.location_city}, ${item.seller.location_state}`.toUpperCase() : "LAGOS"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Package size={10} color={theme.subtext} strokeWidth={3} />
              <Text style={[styles.metaText, { color: theme.subtext }]}>
                {item.stock_quantity > 0 ? `${item.stock_quantity} AVAILABLE` : "OUT OF STOCK"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 🏛️ SOCIAL ACTIONS & IMAGE */}
      <View style={styles.visualActionRow}>
        <View style={styles.sidebarColumn}>
          <View style={[styles.centeredActionStack, { height: imageHeight }]}>
            
            <TouchableOpacity style={styles.sideAction} onPress={handleLike}>
              <Heart 
                size={24} 
                color={item.is_liked ? "#EF4444" : theme.text} 
                fill={item.is_liked ? "#EF4444" : "transparent"} 
                strokeWidth={2.5} 
              />
              <Text style={[styles.metricCount, { color: theme.text }]}>{item.likes_count || 0}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sideAction} onPress={onOpenComments}>
              <MessageCircle size={24} color={theme.text} strokeWidth={2.5} />
              <Text style={[styles.metricCount, { color: theme.text }]}>{item.comments_count || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sideAction, styles.bagAction]} onPress={() => onAddToCart(item)}>
              <View style={[styles.bagCircle, { backgroundColor: theme.text }]}>
                <ShoppingBag size={18} color={theme.background} strokeWidth={3} />
              </View>
              <Text style={[styles.metricCount, { color: theme.text }]}>BUY</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideAction} onPress={() => {/* Share logic */}}>
              <Share2 size={24} color={theme.text} strokeWidth={2.5} />
              <Text style={[styles.metricCount, { color: theme.text }]}>SHARE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideAction} onPress={() => onToggleWishlist(item.id)}>
              <Bookmark 
                size={24} 
                color={isSaved ? Colors.brand.emerald : theme.text} 
                fill={isSaved ? Colors.brand.emerald : "transparent"} 
                strokeWidth={2.5} 
              />
              <Text style={[styles.metricCount, { color: theme.text }]}>{isSaved ? "SAVED" : "SAVE"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentColumn}>
          <Pressable onLongPress={handleLike} style={[styles.visualHub, { height: imageHeight }, isDiamond && styles.diamondBorder]}>
            <ScrollView 
              horizontal pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / contentWidth))}
              scrollEventThrottle={16}
              snapToInterval={contentWidth}
              decelerationRate="fast"
            >
              {item.image_urls.map((url, i) => (
                <Image 
                  key={i} 
                  source={url} 
                  style={[styles.mainImg, { width: contentWidth, height: imageHeight }]} 
                  contentFit="cover"
                  transition={300}
                />
              ))}
            </ScrollView>
            
            <Animated.View style={[styles.heartOverlay, { transform: [{ scale: likeScale }] }]}>
              <Heart size={80} color="white" fill="white" />
            </Animated.View>

            {item.image_urls.length > 1 && (
              <View style={styles.dotContainer}>
                {item.image_urls.map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: i === activeImageIndex ? 'white' : 'rgba(255,255,255,0.4)' }]} />
                ))}
              </View>
            )}
          </Pressable>
          
          <Text style={[styles.description, { color: theme.text }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  container: { paddingVertical: 20, paddingHorizontal: 15 },
  topSection: { flexDirection: 'row', marginBottom: 15 },
  sidebarColumn: { width: SIDEBAR_WIDTH, alignItems: 'center' },
  contentColumn: { flex: 1, marginLeft: 8 },
  logoBox: { width: 48, height: 48, borderRadius: 18, borderWidth: 1.5, overflow: 'hidden' },
  diamondHalo: { borderColor: '#8B5CF6' },
  logoImg: { width: '100%', height: '100%' },
  
  identityStack: { marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  handleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  displayName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  slugText: { fontSize: 11, fontWeight: '700', opacity: 0.5 },

  productPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  productName: { fontSize: 16, fontWeight: '900', flex: 1, letterSpacing: -0.5 },
  priceText: { fontSize: 17, fontWeight: '900' },

  metaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  description: { fontSize: 13, lineHeight: 19, marginTop: 12, fontWeight: '600', opacity: 0.7 },

  visualActionRow: { flexDirection: 'row' },
  centeredActionStack: { justifyContent: 'space-between', paddingVertical: 12, alignItems: 'center' },
  sideAction: { alignItems: 'center', gap: 6 },
  bagAction: { marginVertical: 4 },
  bagCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  metricCount: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

  visualHub: { borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)' },
  diamondBorder: { borderColor: '#8B5CF6' },
  mainImg: { backgroundColor: '#F9FAFB' },
  heartOverlay: { position: 'absolute', alignSelf: 'center', top: '40%', pointerEvents: 'none' },
  dotContainer: { position: 'absolute', bottom: 15, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 12 },
  dot: { width: 5, height: 5, borderRadius: 3 }
});