import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router'; // 🛠️ Added useFocusEffect
import { useScrollToTop } from '@react-navigation/native'; 
import * as Haptics from 'expo-haptics';

// Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore'; 
import { useUserStore } from '../../src/store/useUserStore'; 
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

// Components
import { View, Text } from '../../src/components/Themed';
import { StoryRow } from '../../src/components/StoryRow'; 
import { ProductCard } from '../../src/components/ProductCard'; 
import { CommentSheet } from '../../src/components/CommentSheet';
import { FloatingCart } from '../../src/components/FloatingCart';
import { SearchProtocol } from '../../src/components/SearchProtocol';
import { CategoryPulse } from '../../src/components/CategoryPulse';

// UI Assets
import { PlusSquare, Bell, Zap, TrendingUp, Sparkles } from 'lucide-react-native';

/**
 * 🏰 STORELINK HOME v85.0
 * Fixed: Auto-sync on focus (useFocusEffect) for identity/location changes.
 * Audited: High-fidelity header stability and weighted discovery.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const flatListRef = useRef<FlatList>(null); 
  const { profile, loading: userLoading, refreshUserData } = useUserStore();
  const { addToCart } = useCartStore();

  const [products, setProducts] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [followedSellers, setFollowedSellers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFlashMode, setIsFlashMode] = useState(false);
  const [hasNewDrops, setHasNewDrops] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const commentSheetRef = useRef<any>(null);

  useScrollToTop(flatListRef);

  /** 🛠️ AUTO-SYNC: Refreshes feed when user navigates back to Home */
  useFocusEffect(
    useCallback(() => {
      if (!userLoading && profile?.id) {
        initDiscoveryFeed();
      }
      return () => {};
    }, [profile?.location, profile?.id])
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (!userLoading && profile?.id) {
      initDiscoveryFeed();
      cleanup = subscribeToFeed();
    }
    return () => { if (cleanup) cleanup(); };
  }, [userLoading, profile?.id]);

  const initDiscoveryFeed = async (query = searchQuery, cat = activeCategory, flash = isFlashMode) => {
    try {
      if (!refreshing) setLoading(true);
      
      const { data, error } = await supabase.rpc('get_weighted_personalized_feed', { 
        p_user_id: profile?.id || null,
        p_search: query || null,
        p_category: cat === 'All' ? null : cat,
        p_flash_only: flash,
        p_location_preference: profile?.location || 'Lagos'
      });

      if (error) throw error;
      setProducts(data || []);
      
      if (profile?.id) {
        const [wishRes, followRes] = await Promise.all([
          supabase.from('product_likes').select('product_id').eq('user_id', profile.id),
          supabase.from('follows').select('seller_id').eq('follower_id', profile.id)
        ]);
        setWishlistIds(wishRes.data?.map((w: any) => w.product_id) || []);
        setFollowedSellers(followRes.data?.map((f: any) => f.seller_id) || []);
      }
      
      setHasNewDrops(false);
    } catch (e: any) {
      console.error("Feed Sync Error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToFeed = () => {
    const channel = supabase.channel('feed_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, 
      async (payload) => {
        const { data: seller } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', payload.new.seller_id)
          .single();

        if (seller?.subscription_plan === 'diamond') {
          setHasNewDrops(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  };

  const handleToggleWishlist = async (productId: string) => {
    if (!profile?.id) return;
    const isSaved = wishlistIds.includes(productId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setWishlistIds(prev => isSaved ? prev.filter(id => id !== productId) : [...prev, productId]);

    try {
      if (isSaved) {
        await supabase.from('product_likes').delete().eq('user_id', profile.id).eq('product_id', productId);
      } else {
        await supabase.from('product_likes').insert({ user_id: profile.id, product_id: productId });
      }
    } catch (e) { initDiscoveryFeed(); }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshUserData();
    initDiscoveryFeed();
  }, [searchQuery, activeCategory, isFlashMode, profile?.location]);

  const renderItem = useCallback(({ item, index }: any) => (
    <ProductCard 
      item={item}
      index={index}
      isSaved={wishlistIds.includes(item.id)}
      followedVendors={followedSellers}
      onToggleWishlist={handleToggleWishlist}
      onAddToCart={(it: any) => {
        addToCart(it, it.seller);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
      onOpenComments={() => {
        setSelectedProduct(item);
        commentSheetRef.current?.expand();
      }}
    />
  ), [wishlistIds, followedSellers, addToCart]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 🏛️ HEADER */}
      <View style={[styles.header, { paddingTop: insets.top || 15 }]}>
        <View style={styles.headerSide}>
          <TouchableOpacity 
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/post');
            }}
          >
            <PlusSquare size={26} color={theme.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoRow}>
          <Text style={[styles.headerLogo, { color: theme.text }]}>STORELINK</Text>
          <View style={styles.onlinePulse} />
        </View>

        <View style={styles.headerSide}>
          <TouchableOpacity onPress={() => router.push('/activity')} style={styles.bellWrapper}>
            <Bell size={26} color={theme.text} strokeWidth={2.2} />
            <View style={[styles.notifDot, { borderColor: theme.background }]} />
          </TouchableOpacity>
        </View>
      </View>

      {hasNewDrops && (
        <TouchableOpacity 
          activeOpacity={0.9}
          style={styles.dropPill} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            initDiscoveryFeed();
          }}
        >
          <Sparkles size={14} color="white" fill={Colors.brand.emerald} />
          <Text style={styles.dropPillText}>NEW DROPS AVAILABLE</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <StoryRow />
            <View style={styles.discoveryModule}>
               <SearchProtocol 
                 value={searchQuery} 
                 isFlashMode={isFlashMode}
                 onToggleFlash={() => {
                    const next = !isFlashMode;
                    setIsFlashMode(next);
                    initDiscoveryFeed(searchQuery, activeCategory, next);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                 }}
                 onChange={(text: string) => {
                   setSearchQuery(text);
                   if (text === "") initDiscoveryFeed("", activeCategory);
                 }} 
                 onSearch={() => initDiscoveryFeed(searchQuery, activeCategory)}
               />
               <CategoryPulse 
                 active={activeCategory} 
                 onSelect={(slug: string) => {
                    setActiveCategory(slug);
                    initDiscoveryFeed(searchQuery, slug);
                 }} 
               />
            </View>
          </View>
        )}
        ListEmptyComponent={() => !loading && (
          <View style={styles.emptyState}>
            <Zap size={32} color={theme.subtext} strokeWidth={1} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>FEED IS EMPTY</Text>
          </View>
        )}
        ListFooterComponent={() => loading ? (
          <ActivityIndicator style={{ padding: 60 }} color={Colors.brand.emerald} />
        ) : (
          <View style={styles.footer}>
            <TrendingUp size={20} color={theme.border} />
            <Text style={[styles.footerText, { color: theme.border }]}>UP TO DATE</Text>
          </View>
        )}
      />

      <FloatingCart onPress={() => router.push('/checkout')} /> 
      <CommentSheet product={selectedProduct} sheetRef={commentSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerSide: { width: 40, alignItems: 'flex-start' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { fontSize: 22, fontWeight: '900', letterSpacing: -1.2 },
  onlinePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginLeft: 4, marginTop: -8 },
  bellWrapper: { position: 'relative', alignSelf: 'flex-end' },
  notifDot: { position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#EF4444', borderWidth: 2 },
  dropPill: { 
    position: 'absolute', top: 140, alignSelf: 'center', zIndex: 1000, 
    backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 30, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8
  },
  dropPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  listHeader: { paddingBottom: 15 },
  discoveryModule: { paddingHorizontal: 20, marginTop: 10, backgroundColor: 'transparent' },
  emptyState: { padding: 100, alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  footer: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  footerText: { fontSize: 8, fontWeight: '900', letterSpacing: 2.5 }
});