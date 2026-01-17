import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { 
  StyleSheet, FlatList, Dimensions, 
  TouchableOpacity, ActivityIndicator, ViewToken, 
  Platform, Image, TextInput
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter, useFocusEffect } from 'expo-router'; // 🛠️ Added useFocusEffect
import { 
  Heart, MessageCircle, 
  Plus, BadgeCheck,
  Gem, ArrowRight, Search, X, MapPin
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';

// Sovereign Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore';
import { useUserStore } from '../../src/store/useUserStore';
import { CommentSheet } from '../../src/components/CommentSheet';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { Product, SellerMinimal } from '../../src/types';

const { width, height } = Dimensions.get('window');

/**
 * 🏰 EXPLORE HUB v85.0
 * Fixed: Auto-sync on focus (useFocusEffect) for identity/location changes.
 * Audited: Balanced Discovery Hub weighting & handshakes.
 */
export default function ExploreScreen() {
  const router = useRouter();
  const { addToCart } = useCartStore();
  const { profile } = useUserStore();
  const tabBarHeight = useBottomTabBarHeight(); 
  const REEL_HEIGHT = height - tabBarHeight;

  // --- DATA REGISTRY ---
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const commentSheetRef = useRef<any>(null);

  /** 🛠️ AUTO-SYNC: Refreshes explore feed when user navigates back */
  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchExploreContent(searchQuery);
      }
      return () => {};
    }, [profile?.location, profile?.id])
  );

  const fetchExploreContent = async (search: string = '') => {
    try {
      if (reels.length === 0) setLoading(true);
      const { data, error } = await supabase.rpc('get_weighted_personalized_reels', {
        p_user_id: profile?.id || null,
        p_search: search.trim() !== '' ? search : null,
        p_location: profile?.location || 'Lagos'
      });
      
      if (error) throw error;
      setReels(data || []);
      // Only reset index if it's a new search or first load
      if (search !== '') setActiveReelIndex(0);
    } catch (e: any) {
      console.error("Content Sync Error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchTrigger = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchExploreContent(searchQuery);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveReelIndex(viewableItems[0].index);
      Haptics.selectionAsync(); 
    }
  }).current;

  if (loading && reels.length === 0) return (
    <View style={styles.centered} darkColor="#000">
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={styles.loadingText} darkColor="#FFF">SYNCHRONIZING FEED...</Text>
    </View>
  );

  return (
    <View style={styles.container} darkColor="#000">
      {/* 🔍 SEARCH OVERLAY */}
      <BlurView intensity={30} tint="dark" style={styles.searchHeader}>
        <View style={styles.searchInner}>
          <Search size={16} color="white" style={{ opacity: 0.6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for items..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchTrigger}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchExploreContent(); }}>
              <X size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </BlurView>

      <FlatList
        data={reels}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={(_, index) => ({
          length: REEL_HEIGHT,
          offset: REEL_HEIGHT * index,
          index,
        })}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ReelItem 
            item={item} 
            isActive={index === activeReelIndex} 
            reelHeight={REEL_HEIGHT}
            router={router}
            onAddToCart={addToCart}
            onOpenComments={(prod: Product) => {
              setSelectedProduct(prod);
              commentSheetRef.current?.expand();
            }}
          />
        )}
      />

      <CommentSheet 
        product={selectedProduct} 
        sheetRef={commentSheetRef} 
      />
    </View>
  );
}

const ReelItem = memo(({ item, isActive, reelHeight, router, onAddToCart, onOpenComments }: any) => {
  const [liked, setLiked] = useState(false);
  const { profile } = useUserStore();
  
  const player = useVideoPlayer(item.video_url, (p) => {
    p.loop = true;
    if (isActive) p.play();
  });

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked(!liked);
    await supabase.rpc('toggle_product_like', {
        p_user_id: profile?.id,
        p_product_id: item.product_id
    });
  };

  const seller = item.seller;
  const isDiamond = seller?.subscription_plan === 'diamond';

  const handleAddToCart = () => {
    if (!item.product || !seller) return;
    
    const sellerContext: SellerMinimal = {
      id: seller.id,
      display_name: seller.display_name || 'Merchant',
      logo_url: seller.logo_url || '',
    };

    onAddToCart(item.product, sellerContext);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ height: reelHeight, width: width }} darkColor="#000">
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.vendorRow} onPress={() => router.push(`/profile/${item.seller_id}`)}>
            <View style={[styles.avatarFrame, isDiamond && styles.diamondHalo]}>
                <Image source={{ uri: seller?.logo_url }} style={styles.avatar} />
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.vendorName}>{seller?.display_name?.toUpperCase()}</Text>
                {isDiamond ? <Gem size={12} color="#8B5CF6" fill="#8B5CF6" /> : seller?.is_verified && <BadgeCheck size={14} color="#3B82F6" fill="#3B82F6" />}
              </View>
              <View style={styles.locationRow}>
                <MapPin size={10} color={Colors.brand.emerald} />
                <Text style={styles.categoryText}>{seller?.location?.toUpperCase() || 'MARKETPLACE'}</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
          
          {item.product && (
            <BlurView intensity={45} tint="dark" style={styles.productTag}>
              <TouchableOpacity style={styles.tagContent} onPress={() => router.push(`/product/${item.product.id}`)}>
                <Image source={{ uri: item.product.image_urls?.[0] }} style={styles.tagImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tagLabel}>FEATURED DROP</Text>
                  <Text style={styles.productTagText} numberOfLines={1}>{item.product.name.toUpperCase()}</Text>
                  <Text style={styles.tagPrice}>₦{item.product.price.toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.buyCircle} onPress={handleAddToCart}>
                  <Plus size={20} color="white" strokeWidth={3} />
                </TouchableOpacity>
              </TouchableOpacity>
            </BlurView>
          )}
        </View>

        <View style={styles.sideActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <View style={styles.iconCircle}>
                <Heart size={26} color={liked ? "#EF4444" : "white"} fill={liked ? "#EF4444" : "transparent"} strokeWidth={2.5} />
            </View>
            <Text style={styles.actionLabel}>{liked ? (item.likes_count || 0) + 1 : (item.likes_count || 0)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenComments(item.product)}>
            <View style={styles.iconCircle}><MessageCircle size={26} color="white" strokeWidth={2.5} /></View>
            <Text style={styles.actionLabel}>{item.comments_count || '0'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/product/${item.product?.id}`)}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald }]}>
                <ArrowRight size={24} color="white" strokeWidth={3} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  searchHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 20, left: 20, right: 20, zIndex: 100, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  searchInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, height: 54, gap: 12 },
  searchInput: { flex: 1, color: 'white', fontWeight: '800', fontSize: 13, letterSpacing: -0.2 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 25, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bottomSection: { width: '78%' },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatarFrame: { padding: 2, borderRadius: 19 },
  diamondHalo: { borderWidth: 2, borderColor: '#8B5CF6' },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#222' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vendorName: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  categoryText: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  caption: { color: 'white', fontSize: 15, fontWeight: '600', lineHeight: 22, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  productTag: { marginTop: 22, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  tagContent: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  tagImg: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#333' },
  tagLabel: { color: '#10B981', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  productTagText: { color: 'white', fontSize: 13, fontWeight: '900' },
  tagPrice: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '800', marginTop: 2 },
  buyCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  sideActions: { gap: 24, alignItems: 'center', marginBottom: 10 },
  actionBtn: { alignItems: 'center', gap: 6 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionLabel: { color: 'white', fontSize: 10, fontWeight: '900' }
});