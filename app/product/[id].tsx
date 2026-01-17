import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, BadgeCheck, ChevronRight, Heart, 
  MessageCircle, Share2, ShieldCheck, ShoppingBag,
  Truck, Zap, Gem
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Image,
  Platform, ScrollView, Share, StyleSheet, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { CommentSheet } from '../../src/components/CommentSheet';
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore';
import { useUserStore } from '../../src/store/useUserStore';

const { width } = Dimensions.get('window');

/**
 * 🏰 PRODUCT ARCHITECTURE v75.5 (Pure Build)
 * Audited: Section I Visual Immunity & Section II Asset Registry.
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const { addToCart } = useCartStore();
  const { profile: currentUser } = useUserStore();

  const [product, setProduct] = useState<any>(null);
  const [moreFromStore, setMoreFromStore] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  
  const commentSheetRef = useRef<any>(null);

  useEffect(() => { 
    fetchProductDetails(); 
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const { data: prodData, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:seller_id (
            id, 
            display_name, 
            logo_url, 
            is_verified, 
            prestige_weight
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (prodData) {
        setProduct(prodData);
        const [moreItems, likeStatus] = await Promise.all([
          supabase.from('products').select('*').eq('seller_id', prodData.seller_id).neq('id', id).limit(4),
          currentUser?.id ? supabase.from('product_likes').select('id').eq('user_id', currentUser.id).eq('product_id', id).maybeSingle() : Promise.resolve({ data: null })
        ]);
        setMoreFromStore(moreItems.data || []);
        setIsLiked(!!likeStatus.data);
      }
    } catch (e) {
      console.error("Product Sync Error:", e);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = !isLiked;
    setIsLiked(newState);
    try {
      if (newState) await supabase.from('product_likes').insert({ user_id: currentUser.id, product_id: id });
      else await supabase.from('product_likes').delete().eq('user_id', currentUser.id).eq('product_id', id);
    } catch (error) {
      setIsLiked(!newState);
    }
  };
  
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out ${product.name} at ${product.seller?.display_name} on StoreLink.`,
        url: `https://storelink.ng/product/${product.id}`
      });
    } catch (e) { console.log(e); }
  };

  if (loading || !product) return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  const seller = product.seller;
  const isDiamond = seller?.prestige_weight === 3;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.headerNav} edges={['top']}>
        <TouchableOpacity style={[styles.circleBtn, { backgroundColor: theme.background }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.circleBtn, { backgroundColor: theme.background }]} onPress={handleShare}>
          <Share2 size={20} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <View style={styles.galleryContainer}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {product.image_urls?.map((url: string, idx: number) => (
              <Image key={idx} source={{ uri: url }} style={styles.heroImg} />
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {product.image_urls?.map((_: any, i: number) => (
              <View key={i} style={[styles.dot, activeImg === i ? styles.activeDot : null]} />
            ))}
          </View>
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.vendorHeader}>
            <TouchableOpacity 
              style={styles.vendorCard}
              onPress={() => router.push(`/profile/${seller?.id}`)}
            >
              <View style={[styles.avatarFrame, { backgroundColor: theme.background }, isDiamond && styles.diamondHalo]}>
                <Image source={{ uri: seller?.logo_url }} style={styles.storeLogo} />
              </View>
              <View style={{backgroundColor: 'transparent'}}>
                <View style={styles.nameRow}>
                  <Text style={[styles.storeName, { color: theme.text }]}>{seller?.display_name?.toUpperCase()}</Text>
                  {isDiamond ? (
                    <Gem size={12} color="#8B5CF6" fill="#8B5CF6" />
                  ) : (
                    seller?.is_verified && <BadgeCheck size={14} color="#3B82F6" fill="#3B82F6" />
                  )}
                </View>
                <Text style={[styles.storeTier, { color: theme.subtext }]}>{isDiamond ? 'Diamond Merchant' : 'Verified Shop'}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleToggleLike} style={styles.likeBtn}>
              <Heart size={26} color={isLiked ? Colors.brand.emerald : theme.text} fill={isLiked ? Colors.brand.emerald : "transparent"} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.productName, { color: theme.text }]}>{product.name.toUpperCase()}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>₦{product.price.toLocaleString()}</Text>
            {product.is_flash_drop && (
              <View style={[styles.flashBadge, { backgroundColor: theme.text }]}>
                <Zap size={10} color={theme.background} fill={theme.background} />
                <Text style={[styles.flashLabel, { color: theme.background }]}>NEW DROP</Text>
              </View>
            )}
          </View>

          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <ShieldCheck size={16} color={Colors.brand.emerald} strokeWidth={2.5} />
              <Text style={[styles.trustText, { color: theme.subtext }]}>Secure Transaction</Text>
            </View>
            <View style={styles.trustItem}>
              <Truck size={16} color={Colors.brand.emerald} strokeWidth={2.5} />
              <Text style={[styles.trustText, { color: theme.subtext }]}>Standard Delivery</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.surface }]} />

          <Text style={[styles.sectionLabel, { color: theme.subtext }]}>PRODUCT DETAILS</Text>
          <Text style={[styles.description, { color: theme.text }]}>{product.description}</Text>

          <TouchableOpacity 
            style={[styles.commentBar, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={() => commentSheetRef.current?.expand()}
          >
            <View style={styles.commentInfo}>
               <MessageCircle size={18} color={theme.text} strokeWidth={2.5} />
               <Text style={[styles.commentLabel, { color: theme.text }]}>Reviews ({product.comments_count || 0})</Text>
            </View>
            <ChevronRight size={16} color={theme.subtext} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {moreFromStore.length > 0 && (
          <View style={[styles.moreSection, { borderTopColor: theme.surface }]}>
            <View style={styles.moreHeader}>
              <Text style={[styles.sectionLabel, { color: theme.subtext }]}>MORE FROM THIS SHOP</Text>
              <TouchableOpacity onPress={() => router.push(`/profile/${seller?.id}`)}>
                <Text style={[styles.viewAll, { color: Colors.brand.emerald }]}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
              {moreFromStore.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.gridCard}
                  onPress={() => router.push(`/product/${item.id}`)}
                >
                  <Image source={{ uri: item.image_urls?.[0] }} style={styles.gridImage} />
                  <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>{item.name.toUpperCase()}</Text>
                  <Text style={[styles.gridPrice, { color: Colors.brand.emerald }]}>₦{item.price.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.surface }]}>
        <View style={styles.footerPriceBox}>
          <Text style={[styles.footerLabel, { color: theme.subtext }]}>PRICE</Text>
          <Text style={[styles.footerPrice, { color: theme.text }]}>₦{product.price.toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.primaryAction, { backgroundColor: theme.text }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            addToCart(product, seller);
          }}
        >
          <ShoppingBag size={20} color={theme.background} strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: theme.background }]}>ADD TO CART</Text>
        </TouchableOpacity>
      </View>

      <CommentSheet product={product} sheetRef={commentSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerNav: { 
    position: 'absolute', top: 0, width: '100%', zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 45
  },
  circleBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 5 }}) },
  galleryContainer: { width: width, height: width * 1.35 },
  heroImg: { width: width, height: '100%', resizeMode: 'cover' },
  pagination: { position: 'absolute', bottom: 25, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  activeDot: { backgroundColor: 'white', width: 18 },
  mainInfo: { padding: 25 },
  vendorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, backgroundColor: 'transparent' },
  vendorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' },
  avatarFrame: { padding: 2, borderRadius: 18 },
  diamondHalo: { borderWidth: 2, borderColor: '#8B5CF6' },
  storeLogo: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#F3F4F6' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'transparent' },
  storeName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  storeTier: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  likeBtn: { padding: 5, backgroundColor: 'transparent' },
  productName: { fontSize: 28, fontWeight: '900', letterSpacing: -1, lineHeight: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: 'transparent' },
  priceMain: { fontSize: 26, fontWeight: '900', color: Colors.brand.emerald, letterSpacing: -0.5 },
  flashBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5 },
  flashLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  trustGrid: { flexDirection: 'row', gap: 20, marginTop: 20, backgroundColor: 'transparent' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent' },
  trustText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 1, marginVertical: 30 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  description: { fontSize: 15, lineHeight: 26, fontWeight: '500' },
  commentBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 24, marginTop: 35, borderWidth: 1 },
  commentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' },
  commentLabel: { fontSize: 14, fontWeight: '800' },
  moreSection: { marginTop: 25, paddingVertical: 25, borderTopWidth: 8 },
  moreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 20, backgroundColor: 'transparent' },
  viewAll: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  horizontalGrid: { paddingLeft: 25, gap: 15, backgroundColor: 'transparent' },
  gridCard: { width: 160, backgroundColor: 'transparent' },
  gridImage: { width: 160, height: 180, borderRadius: 26, backgroundColor: '#F9FAFB' },
  gridTitle: { fontSize: 11, fontWeight: '900', marginTop: 12, letterSpacing: 0.5 },
  gridPrice: { fontSize: 13, fontWeight: '900', marginTop: 4 },
  footer: { 
    position: 'absolute', bottom: 0, width: '100%',
    paddingHorizontal: 25, paddingVertical: 25, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1.5, paddingBottom: Platform.OS === 'ios' ? 40 : 25,
  },
  footerPriceBox: { flex: 1, backgroundColor: 'transparent' },
  footerLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  footerPrice: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  primaryAction: { flex: 1.4, height: 64, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 4 },
  actionText: { fontWeight: '900', fontSize: 14, letterSpacing: 1 }
});