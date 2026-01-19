import React, { useState, useRef, memo, useCallback, useEffect } from 'react';
import { 
  StyleSheet, FlatList, Dimensions, 
  TouchableOpacity, ActivityIndicator, ViewToken, 
  Platform, Share, View as RNView, TextInput
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

const { width, height } = Dimensions.get('window');

/**
 * 🏰 VIDEO FEED v103.0
 * Purpose: A fast, full-screen video experience for discovering products.
 * Visual: Floating glass search bar and vertical interaction sidebar.
 */
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useUserStore();
  const tabBarHeight = useBottomTabBarHeight(); 
  const REEL_HEIGHT = height; 

  const [searchQuery, setSearchQuery] = useState('');
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const commentSheetRef = useRef<any>(null);
  const queryClient = useQueryClient();

  /** 🛡️ VIDEO SYNC */
  const { 
    data: reels = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['explore-reels', searchQuery, profile?.location_city],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weighted_personalized_reels', {
        p_user_id: profile?.id || null,
        p_search: searchQuery.trim() !== '' ? searchQuery : null,
        p_location_state: profile?.location_state || 'Lagos',
        p_location_city: profile?.location_city || null
      });

      if (error) throw error;
      
      // Preparing feed: pre-load images for speed
      data?.slice(0, 5).forEach((r: any) => {
        if (r.seller?.logo_url) Image.prefetch(r.seller.logo_url);
        if (r.product?.image_urls?.[0]) Image.prefetch(r.product.image_urls[0]);
      });

      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveReelIndex(viewableItems[0].index);
    }
  }).current;

  if (isLoading && reels.length === 0) return (
    <RNView style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={styles.loaderText}>LOADING VIDEOS...</Text>
    </RNView>
  );

  return (
    <RNView style={styles.container}>
      {/* 🔍 SEARCH BAR: Floating Glass Effect */}
      <RNView style={[styles.searchWrapper, { top: insets.top + 10 }]} pointerEvents="box-none">
        <BlurView intensity={45} tint="dark" style={styles.searchBlur}>
          <Search size={18} color="white" style={{ opacity: 0.6 }} strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores..."
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
        viewabilityConfig={{ itemVisiblePercentThreshold: 85 }}
        getItemLayout={(_, index) => ({ length: REEL_HEIGHT, offset: REEL_HEIGHT * index, index })}
        keyExtractor={(item) => `reel-${item.id}`}
        
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}

        renderItem={({ item, index }) => (
          <ReelItem 
            item={item} 
            isActive={index === activeReelIndex} 
            reelHeight={REEL_HEIGHT}
            tabBarHeight={tabBarHeight}
            onOpenComments={(prod: any) => {
              setSelectedProduct(prod);
              commentSheetRef.current?.expand();
            }}
          />
        )}
      />
      <CommentSheet product={selectedProduct} sheetRef={commentSheetRef} />
    </RNView>
  );
}

const ReelItem = memo(({ item, isActive, reelHeight, tabBarHeight, onOpenComments }: any) => {
  const router = useRouter();
  const { profile } = useUserStore();
  const { addToCart } = useCartStore();
  
  const [localLiked, setLocalLiked] = useState(item.is_liked || false);
  const [localSaved, setLocalSaved] = useState(item.is_saved || false);
  const [localLikeCount, setLocalLikeCount] = useState(Number(item.likes_count) || 0);

  const player = useVideoPlayer(item.video_url, (p) => {
    p.loop = true;
    p.muted = false;
    if (isActive) p.play();
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive]);

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = !localLiked;
    setLocalLiked(newState);
    setLocalLikeCount(prev => newState ? prev + 1 : Math.max(0, prev - 1));
    await supabase.rpc('toggle_product_like', { p_user_id: profile?.id, p_product_id: item.product_id });
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !localSaved;
    setLocalSaved(newState);
    if (newState) {
      await supabase.from('wishlists').upsert({ user_id: profile?.id, product_id: item.product_id });
    } else {
      await supabase.from('wishlists').delete().eq('user_id', profile?.id).eq('product_id', item.product_id);
    }
  };

  const handleAddToCart = () => {
    if (item.product && item.seller) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addToCart(item.product, item.seller as any);
    }
  };

  const seller = item.seller;
  const isDiamond = seller?.subscription_plan === 'diamond';

  return (
    <RNView style={{ height: reelHeight, width: width, backgroundColor: 'black' }}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      
      <LinearGradient 
        colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']} 
        style={StyleSheet.absoluteFill} 
      />

      {/* 🛡️ INTERACTION SIDEBAR */}
      <RNView style={styles.sidebar}>
        <TouchableOpacity style={styles.sideAction} onPress={handleLike}>
          <RNView style={styles.iconShadow}>
            <Heart size={28} color={localLiked ? Colors.brand.emerald : "white"} fill={localLiked ? Colors.brand.emerald : "transparent"} strokeWidth={2.5} />
          </RNView>
          <Text style={[styles.metricText, localLiked && { color: Colors.brand.emerald }]}>{localLikeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => onOpenComments(item.product)}>
          <RNView style={styles.iconShadow}><MessageCircle size={28} color="white" strokeWidth={2.5} /></RNView>
          <Text style={styles.metricText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={handleAddToCart}>
          <RNView style={[styles.iconShadow, styles.bagCircle]}>
            <ShoppingBag size={22} color="black" strokeWidth={3} />
          </RNView>
          <Text style={styles.metricText}>BAG</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => Share.share({ message: `Check out ${item.product?.name} on StoreLink!` })}>
          <RNView style={styles.iconShadow}><Share2 size={26} color="white" strokeWidth={2.5} /></RNView>
          <Text style={styles.metricText}>SHARE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={handleSave}>
          <RNView style={styles.iconShadow}>
            <Bookmark size={26} color={localSaved ? Colors.brand.emerald : "white"} fill={localSaved ? Colors.brand.emerald : "transparent"} strokeWidth={2.5} />
          </RNView>
        </TouchableOpacity>
      </RNView>

      {/* 🛡️ BOTTOM PRODUCT INFO */}
      <RNView style={[styles.bottomInfo, { paddingBottom: tabBarHeight + 25 }]}>
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
              <RNView style={styles.handleRow}>
                <Text style={styles.slugText}>@{seller?.slug}</Text>
                {isDiamond && <Gem size={8} color="#A78BFA" fill="#A78BFA" style={{marginLeft: 4}} />}
              </RNView>
            </RNView>
            <TouchableOpacity style={[styles.followBtn, isDiamond && { borderColor: '#8B5CF6' }]}>
              <Text style={[styles.followText, isDiamond && { color: '#8B5CF6' }]}>FOLLOW</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
          
          {item.product && (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => router.push(`/product/${item.product.id}` as any)} 
              style={[styles.productPill, isDiamond && styles.diamondBorder]}
            >
              <Image source={item.product.image_urls?.[0]} style={styles.productThumb} contentFit="cover" transition={300} />
              <RNView style={styles.productMeta}>
                <Text style={styles.productName} numberOfLines={1}>{item.product.name.toUpperCase()}</Text>
                <RNView style={styles.priceRow}>
                  <Text style={styles.priceText}>₦{item.product.price.toLocaleString()}</Text>
                  <RNView style={styles.dot} />
                  <Text style={styles.stockText}>{item.product.stock_quantity} IN STOCK</Text>
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
  loaderText: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  searchWrapper: { position: 'absolute', left: 20, right: 20, zIndex: 100 },
  searchBlur: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  searchInput: { flex: 1, color: 'white', fontWeight: '700', fontSize: 14, marginLeft: 12 },
  sidebar: { position: 'absolute', right: 15, bottom: height * 0.25, gap: 22, alignItems: 'center', zIndex: 10 },
  sideAction: { alignItems: 'center', gap: 5 },
  iconShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 },
  bagCircle: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  metricText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: -0.2, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  bottomInfo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  infoInner: { paddingHorizontal: 20 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarBox: { width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  diamondHalo: { borderColor: '#8B5CF6', borderWidth: 2 },
  avatar: { width: '100%', height: '100%' },
  nameStack: { marginLeft: 12, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  handleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  displayName: { color: 'white', fontWeight: '900', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  slugText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
  followBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: 'white' },
  followText: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  caption: { color: 'white', fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  productPill: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)' },
  diamondBorder: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  productThumb: { width: 50, height: 50, borderRadius: 12 },
  productMeta: { flex: 1, marginLeft: 15 },
  productName: { color: 'white', fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  priceText: { color: 'white', fontWeight: '900', fontSize: 16 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  stockText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800' }
});