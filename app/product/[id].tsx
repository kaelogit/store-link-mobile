import React, { useState, useRef } from 'react';
import { 
  StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Dimensions, Share, FlatList, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Heart, MessageCircle, Share2, 
  ShieldCheck, ShoppingBag, Truck, Gem, 
  BadgeCheck, ChevronRight, Play, Film, Sparkles
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore'; 
import { useUserStore } from '../../src/store/useUserStore'; 
import { CommentSheet } from '../../src/components/CommentSheet';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 PRODUCT DETAIL v102.0
 * Purpose: A high-performance view for inspecting products and viewing store details.
 * Logic: Synchronizes product data, linked videos, and other items from the same store.
 * Fix: Corrected Reel Linking & Navigation Safety.
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const colorScheme = useColorScheme();
  const queryClient = useQueryClient();
  
  const { addToCart } = useCartStore();
  const { profile: currentUser } = useUserStore();

  const [activeImg, setActiveImg] = useState(0);
  const commentSheetRef = useRef<any>(null);

  /** 🛡️ PRODUCT LOADING: Fetching item details */
  const { data: product, isLoading: prodLoading } = useQuery({
    queryKey: ['product-detail', id],
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const { data, error } = await supabase
        .from('products')
        .select(`*, seller:seller_id (*)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      
      // Prepare images for instant viewing
      if (data.image_urls) {
        data.image_urls.forEach((url: string) => Image.prefetch(url));
      }
      return data;
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!id,
  });

  /** 🛡️ VIDEO SYNC: Finding related videos */
  const { data: linkedReel } = useQuery({
    queryKey: ['product-reel', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reels')
        .select('*')
        .eq('product_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!product,
  });

  /** 🛡️ STOREFRONT SYNC: Loading more items from this seller */
  const { data: moreFromStore = [] } = useQuery({
    queryKey: ['more-from-store', product?.seller_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', product.seller_id)
        .neq('id', id)
        .limit(6);
      return data || [];
    },
    enabled: !!product,
  });

  /** 🛡️ INSTANT LIKE: Smooth feedback for favorites */
  const { data: isLiked } = useQuery({
    queryKey: ['is-liked', id],
    queryFn: async () => {
      const { data } = await supabase.from('product_likes').select('id').eq('user_id', currentUser?.id).eq('product_id', id).maybeSingle();
      return !!data;
    },
    enabled: !!currentUser?.id,
  });

  const handleToggleLike = async () => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = !isLiked;
    queryClient.setQueryData(['is-liked', id], newState);
    
    try {
      if (newState) await supabase.from('product_likes').insert({ user_id: currentUser.id, product_id: id });
      else await supabase.from('product_likes').delete().eq('user_id', currentUser.id).eq('product_id', id);
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: ['is-liked', id] });
    }
  };

  const handleShare = async () => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `Check out ${product.name} on StoreLink!`,
        url: `https://storelink.app/product/${product.id}`
      });
    } catch (e) {}
  };

  if (prodLoading || !product) return (
    <View style={styles.centered}><ActivityIndicator color={Colors.brand.emerald} size="large" /></View>
  );

  const seller = product.seller;
  const isDiamond = seller?.subscription_plan === 'diamond';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 📱 HEADER */}
      <View style={[styles.headerNav, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <TouchableOpacity style={[styles.circleBtn, { backgroundColor: theme.background }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={3} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.circleBtn, { backgroundColor: theme.background }]} onPress={handleShare}>
          <Share2 size={20} color={theme.text} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        
        {/* 🎞️ IMAGE GALLERY */}
        <View style={styles.galleryContainer}>
          <FlatList
            data={product.image_urls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width))}
            keyExtractor={(_, i) => `img-${i}`}
            renderItem={({ item }) => (
              <Image 
                source={item} 
                style={styles.heroImg} 
                contentFit="cover" 
                transition={300}
                cachePolicy="memory-disk"
              />
            )}
          />
          {product.image_urls?.length > 1 && (
            <View style={styles.pagination}>
              {product.image_urls.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, activeImg === i ? styles.activeDot : null, { backgroundColor: activeImg === i ? 'white' : 'rgba(255,255,255,0.4)' }]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.mainInfo}>
          {/* 🏛️ STORE DETAILS */}
          <View style={styles.vendorHeader}>
            <TouchableOpacity style={styles.vendorCard} onPress={() => router.push(`/profile/${seller?.id}` as any)}>
              <View style={[styles.avatarFrame, isDiamond && styles.diamondHalo]}>
                <Image source={seller?.logo_url} style={styles.storeLogo} contentFit="cover" transition={200} />
              </View>
              <View style={{backgroundColor: 'transparent'}}>
                <View style={styles.nameRow}>
                  <Text style={[styles.storeName, { color: theme.text }]}>{seller?.display_name?.toUpperCase()}</Text>
                  {isDiamond ? <Gem size={12} color="#8B5CF6" fill="#8B5CF6" /> : (seller?.is_verified && <BadgeCheck size={14} color="#3B82F6" fill="#3B82F6" />)}
                </View>
                <Text style={[styles.storeTier, { color: isDiamond ? '#8B5CF6' : theme.subtext }]}>{isDiamond ? 'PREMIUM STORE' : 'VERIFIED STORE'}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleToggleLike} style={styles.likeBtn}>
              <Heart size={28} color={isLiked ? Colors.brand.emerald : theme.text} fill={isLiked ? Colors.brand.emerald : "transparent"} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.productName, { color: theme.text }]}>{product.name.toUpperCase()}</Text>
          <Text style={styles.priceMain}>₦{product.price.toLocaleString()}</Text>

          {/* 🛡️ PRODUCT VIDEO LINK */}
          {linkedReel && (
            <TouchableOpacity 
              activeOpacity={0.9}
              style={[styles.reelCard, { borderColor: isDiamond ? '#8B5CF6' : theme.border }]}
              // 🛠️ FIXED: Link to the specific story viewer, not just explore feed
              onPress={() => router.push(`/story-viewer/${linkedReel.id}` as any)}
            >
              <BlurView intensity={30} tint="dark" style={styles.reelBlur}>
                <View style={styles.reelContent}>
                  <View style={styles.reelPlayCircle}>
                    <Play size={20} color="white" fill="white" style={{marginLeft: 3}} />
                  </View>
                  <View style={{flex: 1}}>
                    <View style={styles.row}>
                        <Sparkles size={12} color="#A78BFA" fill="#A78BFA" />
                        <Text style={styles.reelTitle}>WATCH PRODUCT VIDEO</Text>
                    </View>
                    <Text style={styles.reelSub}>See this item in action</Text>
                  </View>
                  <Film size={20} color="white" style={{opacity: 0.5}} />
                </View>
              </BlurView>
            </TouchableOpacity>
          )}

          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <ShieldCheck size={16} color={Colors.brand.emerald} strokeWidth={2.5} />
              <Text style={[styles.trustText, { color: theme.subtext }]}>Secure Purchase</Text>
            </View>
            <View style={styles.trustItem}>
              <Truck size={16} color={Colors.brand.emerald} strokeWidth={2.5} />
              <Text style={[styles.trustText, { color: theme.subtext }]}>Fast Delivery</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.surface }]} />
          <Text style={[styles.sectionLabel, { color: theme.subtext }]}>PRODUCT DESCRIPTION</Text>
          <Text style={[styles.description, { color: theme.text }]}>{product.description}</Text>

          {/* 💬 REVIEWS */}
          <TouchableOpacity style={[styles.commentBar, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => commentSheetRef.current?.expand()}>
            <View style={styles.commentInfo}>
               <MessageCircle size={18} color={theme.text} strokeWidth={2.5} />
               <Text style={[styles.commentLabel, { color: theme.text }]}>Reviews ({product.comments_count || 0})</Text>
            </View>
            <ChevronRight size={16} color={theme.subtext} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {/* 🛍️ MORE ITEMS FROM STORE */}
        {moreFromStore.length > 0 && (
          <View style={styles.moreSection}>
            <View style={styles.moreHeader}>
              <Text style={[styles.sectionLabel, { color: theme.subtext }]}>EXPLORE THE STORE</Text>
              <TouchableOpacity onPress={() => router.push(`/profile/${seller?.id}` as any)}>
                <Text style={{ color: Colors.brand.emerald, fontWeight: '900', fontSize: 11 }}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
              {moreFromStore.map((item: any) => (
                <TouchableOpacity key={item.id} style={styles.gridCard} onPress={() => router.push(`/product/${item.id}` as any)}>
                  <Image source={item.image_urls?.[0]} style={styles.gridImage} contentFit="cover" transition={200} />
                  <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>{item.name.toUpperCase()}</Text>
                  <Text style={{ color: Colors.brand.emerald, fontWeight: '900', fontSize: 13, marginTop: 4 }}>₦{item.price.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* 🚀 CHECKOUT FOOTER */}
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.footer}>
        <View style={styles.footerPriceBox}>
          <Text style={[styles.footerLabel, { color: theme.subtext }]}>TOTAL PRICE</Text>
          <Text style={[styles.footerPrice, { color: theme.text }]}>₦{product.price.toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.primaryAction, { backgroundColor: theme.text }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            addToCart(product, seller);
          }}
        >
          <ShoppingBag size={20} color={theme.background} strokeWidth={3} />
          <Text style={[styles.actionText, { color: theme.background }]}>ADD TO BAG</Text>
        </TouchableOpacity>
      </BlurView>

      <CommentSheet product={product} sheetRef={commentSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerNav: { position: 'absolute', top: 0, width: '100%', zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  galleryContainer: { width: width, height: width * 1.25 }, 
  heroImg: { width: width, height: '100%' },
  pagination: { position: 'absolute', bottom: 25, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  activeDot: { width: 22 },
  mainInfo: { padding: 25 },
  vendorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  vendorCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarFrame: { padding: 2, borderRadius: 16 },
  diamondHalo: { borderWidth: 2, borderColor: '#8B5CF6' },
  storeLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeName: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  storeTier: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  likeBtn: { padding: 10 },
  productName: { fontSize: 28, fontWeight: '900', letterSpacing: -1, lineHeight: 32 },
  priceMain: { fontSize: 26, fontWeight: '900', color: Colors.brand.emerald, marginTop: 10, letterSpacing: -1 },
  reelCard: { marginTop: 25, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5 },
  reelBlur: { padding: 18 },
  reelContent: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  reelPlayCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  reelTitle: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  reelSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustGrid: { flexDirection: 'row', gap: 20, marginTop: 25 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  divider: { height: 1.5, marginVertical: 35, opacity: 0.5 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  description: { fontSize: 16, lineHeight: 26, fontWeight: '500', opacity: 0.9 },
  commentBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderRadius: 26, marginTop: 40, borderWidth: 1.5 },
  commentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  commentLabel: { fontSize: 14, fontWeight: '900' },
  moreSection: { marginTop: 40, paddingVertical: 20 },
  moreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 20 },
  horizontalGrid: { paddingLeft: 25, gap: 18 },
  gridCard: { width: 170 },
  gridImage: { width: 170, height: 210, borderRadius: 28, backgroundColor: '#F9FAFB' },
  gridTitle: { fontSize: 12, fontWeight: '900', marginTop: 12, letterSpacing: 0.2 },
  footer: { position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 25, paddingVertical: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 45 : 30, borderTopWidth: 1.5, borderTopColor: 'rgba(0,0,0,0.05)' },
  footerPriceBox: { flex: 1 },
  footerLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  footerPrice: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  primaryAction: { flex: 1.3, height: 68, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  actionText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 }
});