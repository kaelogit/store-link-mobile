import React, { useState, useRef, memo, useCallback, useEffect } from 'react';
import { 
  StyleSheet, FlatList, Dimensions, 
  TouchableOpacity, ActivityIndicator, ViewToken, 
  Platform, Share, View as RNView, TextInput, StatusBar,
  useWindowDimensions
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter } from 'expo-router'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Heart, MessageCircle, 
  Gem, Search, X, Share2, Bookmark, ChevronRight,
  ShoppingBag, Sparkles
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore';
import { useUserStore } from '../../src/store/useUserStore';
import { CommentSheet } from '../../src/components/CommentSheet';
import { Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { Reel } from '../../src/types';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 100,
};

/**
 * 🏰 VIDEO FEED v111.0
 * Purpose: Mirroring the 40/25/15/10/10 Home Logic for Video Discovery.
 * Features: High-Rel Fallback, TypeScript Strict Safety, and Optimistic UI.
 */
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useUserStore();
  const tabBarHeight = useBottomTabBarHeight(); 
  const queryClient = useQueryClient();
  
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const REEL_HEIGHT = Platform.OS === 'android' ? windowHeight + (StatusBar.currentHeight || 0) : windowHeight;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const commentSheetRef = useRef<any>(null);

  /** 🛡️ VIDEO SYNC: MIRRORING 40/25/15/10/10 LOGIC */
  const { 
    data: reels = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['explore-reels', searchQuery, profile?.location_city, profile?.location_state],
    queryFn: async () => {
      try {
        // 1. Attempt High-Fidelity RPC Algorithm (City/State/Engagement Weighting)
        const { data: algoData, error: algoError } = await supabase.rpc('get_weighted_personalized_reels', {
          p_user_id: profile?.id || null,
          p_search: searchQuery.trim() !== '' ? searchQuery : null,
          p_location_state: profile?.location_state || 'Lagos',
          p_location_city: profile?.location_city || null
        });

        if (!algoError && algoData && algoData.length > 0) {
          algoData.slice(0, 3).forEach((r: any) => {
            if (r.seller?.logo_url) Image.prefetch(r.seller.logo_url);
            if (r.product?.image_urls?.[0]) Image.prefetch(r.product.image_urls[0]);
          });
          return algoData;
        }

        // 2. 🚀 VERIFICATION FALLBACK: Fixes ambiguous product relationship and ensures visibility
        const { data: globalData, error: globalError } = await supabase
          .from('reels')
          .select(`
            *,
            seller:seller_id (id, slug, display_name, logo_url, subscription_plan),
            product:product_id!fk_reel_product (id, name, price, description, image_urls, stock_quantity)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (globalError) throw globalError;
        return globalData || [];

      } catch (err) {
        console.error("Explore Fetch Error:", err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveReelIndex(viewableItems[0].index);
    }
  }).current;

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: REEL_HEIGHT,
    offset: REEL_HEIGHT * index,
    index,
  }), [REEL_HEIGHT]);

  const handleOpenComments = useCallback((product: any) => {
    if (!product) return;
    setSelectedProduct(product);
    commentSheetRef.current?.expand();
  }, []);

  if (isLoading && reels.length === 0) return (
    <RNView style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={styles.loaderText}>SCANNING MARKET...</Text>
    </RNView>
  );

  return (
    <RNView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 🔍 SEARCH PROTOCOL */}
      <RNView style={[styles.searchWrapper, { top: Math.max(insets.top, 20) + 10 }]} pointerEvents="box-none">
        <BlurView intensity={45} tint="dark" style={styles.searchBlur}>
          <Search size={18} color="white" style={{ opacity: 0.6 }} strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores or items..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              refetch();
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => refetch(), 0); }}>
              <X size={18} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </BlurView>
      </RNView>

      <FlatList
        data={reels}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        getItemLayout={getItemLayout}
        keyExtractor={(item) => `reel-${item.id}`}
        removeClippedSubviews={false}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        renderItem={({ item, index }) => (
          <ReelItem 
            item={item} 
            isActive={index === activeReelIndex} 
            reelHeight={REEL_HEIGHT}
            reelWidth={windowWidth}
            tabBarHeight={tabBarHeight}
            onOpenComments={handleOpenComments}
            queryKey={['explore-reels', searchQuery, profile?.location_city, profile?.location_state]}
          />
        )}
      />
      <CommentSheet product={selectedProduct} sheetRef={commentSheetRef} />
    </RNView>
  );
}

// 🎬 MEMOIZED REEL ITEM
const ReelItem = memo(({ item, isActive, reelHeight, reelWidth, tabBarHeight, onOpenComments, queryKey }: any) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useUserStore();
  const { addToCart } = useCartStore();
  
  const [localLiked, setLocalLiked] = useState(item.is_liked || false);
  const [localLikeCount, setLocalLikeCount] = useState(Number(item.likes_count) || 0);

  const player = useVideoPlayer(item.video_url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive) { player.play(); } 
    else { player.pause(); player.currentTime = 0; }
  }, [isActive, player]);

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = !localLiked;
    setLocalLiked(newState);
    setLocalLikeCount((prev: number) => newState ? prev + 1 : Math.max(0, prev - 1));

    // ⚡ OPTIMISTIC CACHE UPDATE
    queryClient.setQueryData(queryKey, (old: any) => 
      old?.map((r: any) => r.id === item.id ? { ...r, is_liked: newState, likes_count: newState ? (r.likes_count || 0) + 1 : Math.max(0, (r.likes_count || 0) - 1) } : r)
    );

    await supabase.rpc('toggle_product_like', { p_user_id: profile?.id, p_product_id: item.product_id });
  };

  const seller = item.seller;
  const isDiamond = seller?.subscription_plan === 'diamond';

  return (
    <RNView style={{ height: reelHeight, width: reelWidth, backgroundColor: 'black' }}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />

      {/* SIDEBAR */}
      <RNView style={[styles.interactionContainer, { paddingBottom: tabBarHeight + 120 }]}>
        <TouchableOpacity style={styles.sideAction} onPress={handleLike} hitSlop={10}>
          <RNView style={styles.iconShadow}>
            <Heart size={32} color={localLiked ? Colors.brand.emerald : "white"} fill={localLiked ? Colors.brand.emerald : "transparent"} strokeWidth={2.5} />
          </RNView>
          <Text style={[styles.metricText, localLiked && { color: Colors.brand.emerald }]}>{localLikeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => onOpenComments(item.product)} hitSlop={10}>
          <RNView style={styles.iconShadow}><MessageCircle size={32} color="white" strokeWidth={2.5} /></RNView>
          <Text style={styles.metricText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => { addToCart(item.product, item.seller); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}>
          <RNView style={[styles.iconShadow, styles.bagCircle]}><ShoppingBag size={22} color="black" strokeWidth={3} /></RNView>
          <Text style={styles.metricText}>BUY</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => Share.share({ message: `Check out ${item.product?.name} on StoreLink!` })}>
          <RNView style={styles.iconShadow}><Share2 size={28} color="white" strokeWidth={2.5} /></RNView>
          <Text style={styles.metricText}>SHARE</Text>
        </TouchableOpacity>
      </RNView>

      {/* OVERLAY INFO */}
      <RNView style={[styles.bottomInfo, { paddingBottom: tabBarHeight + 20 }]}>
        <RNView style={styles.infoInner}>
          <TouchableOpacity onPress={() => router.push(`/profile/${item.seller_id}` as any)} style={styles.profileHeader}>
            <RNView style={[styles.avatarBox, isDiamond && styles.diamondHalo]}>
              <Image source={seller?.logo_url} style={styles.avatar} contentFit="cover" transition={200} />
            </RNView>
            <RNView style={styles.nameStack}>
              <RNView style={styles.nameRow}>
                <Text style={styles.displayName}>{(seller?.display_name || 'STORE').toUpperCase()}</Text>
                {isDiamond && <Gem size={12} color="#8B5CF6" fill="#8B5CF6" />}
              </RNView>
              <Text style={styles.slugText}>@{seller?.slug}</Text>
            </RNView>
          </TouchableOpacity>

          <Text style={styles.caption} numberOfLines={2}>{item.caption || item.product?.description}</Text>
          
          {item.product && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/product/${item.product?.id}` as any)} style={[styles.productPill, isDiamond && styles.diamondBorder]}>
              <Image source={item.product?.image_urls?.[0]} style={styles.productThumb} contentFit="cover" transition={300} />
              <RNView style={styles.productMeta}>
                {/* 🛡️ TYPE-SAFE ACCESS */}
                <Text style={styles.productName} numberOfLines={1}>{(item.product?.name ?? 'PRODUCT').toUpperCase()}</Text>
                <RNView style={styles.priceRow}>
                  <Text style={styles.priceText}>₦{(item.product?.price ?? 0).toLocaleString()}</Text>
                  <RNView style={styles.dot} />
                  <Text style={styles.stockText}>{(item.product?.stock_quantity ?? 0) > 0 ? 'IN STOCK' : 'SOLD OUT'}</Text>
                </RNView>
              </RNView>
              <ChevronRight size={20} color="white" style={{ opacity: 0.6 }} strokeWidth={3} />
            </TouchableOpacity>
          )}
        </RNView>
      </RNView>
    </RNView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  loaderText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  searchWrapper: { position: 'absolute', left: 15, right: 15, zIndex: 100 },
  searchBlur: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 52, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  searchInput: { flex: 1, color: 'white', fontWeight: '700', fontSize: 14, marginLeft: 12 },
  interactionContainer: { position: 'absolute', right: 10, bottom: 0, gap: 24, alignItems: 'center', zIndex: 10 },
  sideAction: { alignItems: 'center', gap: 5 },
  iconShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 },
  bagCircle: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  metricText: { color: 'white', fontSize: 12, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  bottomInfo: { position: 'absolute', left: 0, right: 60, bottom: 0 },
  infoInner: { paddingHorizontal: 15 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarBox: { width: 42, height: 42, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  diamondHalo: { borderColor: '#8B5CF6', borderWidth: 2 },
  avatar: { width: '100%', height: '100%' },
  nameStack: { marginLeft: 12, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { color: 'white', fontWeight: '900', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  slugText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
  caption: { color: 'white', fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 15, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 6 },
  productPill: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.4)' },
  diamondBorder: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.2)' },
  productThumb: { width: 44, height: 44, borderRadius: 10 },
  productMeta: { flex: 1, marginLeft: 12 },
  productName: { color: 'white', fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  priceText: { color: 'white', fontWeight: '900', fontSize: 16 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  stockText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800' }
});