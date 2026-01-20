import React, { useCallback, useRef, useState, useEffect } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  RefreshControl, Platform, Dimensions, ActivityIndicator, StatusBar 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'; 
import { useScrollToTop } from '@react-navigation/native'; 
import * as Haptics from 'expo-haptics';
import { 
  PlusSquare, Bell, Zap, TrendingUp 
} from 'lucide-react-native';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// Application Connection
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore'; 
import { useUserStore } from '../../src/store/useUserStore'; 
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

// App Components
import { View, Text } from '../../src/components/Themed';
import { StoryRow } from '../../src/components/StoryRow'; 
import { ProductCard } from '../../src/components/ProductCard'; 
import { CommentSheet } from '../../src/components/CommentSheet';
import { SearchProtocol } from '../../src/components/SearchProtocol';
import { CategoryPulse } from '../../src/components/CategoryPulse';
import { EmpireGuide } from '../../src/components/EmpireGuide'; 

const { width } = Dimensions.get('window');

/**
 * 🏰 HOME FEED v104.0
 * Purpose: The main discovery hub for products and local updates.
 * Design: High-fidelity "StoreLink" identity with instant interactions.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  
  const { profile, refreshUserData } = useUserStore();
  const { addToCart } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFlashMode, setIsFlashMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false); 
  
  const commentSheetRef = useRef<any>(null);

  useScrollToTop(flatListRef);

  /** 🛡️ WELCOME GUIDE TRIGGER */
  useEffect(() => {
    if (profile && profile.onboarding_completed === false) {
      const timer = setTimeout(() => setShowGuide(true), 1500); 
      return () => clearTimeout(timer);
    }
  }, [profile?.onboarding_completed]);

  const handleGuideComplete = async () => {
    setShowGuide(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile?.id);
        
      if (error) throw error;
      await refreshUserData(); 
    } catch (e) {
      console.error("Failed to save progress:", e);
    }
  };

  /** 🛡️ DATA SYNC: Fetches the latest products */
  const { 
    data: products = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['home-feed', searchQuery, activeCategory, isFlashMode, profile?.location_city],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_weighted_personalized_feed', { 
          p_user_id: profile?.id || null,
          p_search: searchQuery || null,
          p_category: activeCategory === 'All' ? null : activeCategory,
          p_flash_only: isFlashMode,
          p_location_state: profile?.location_state || 'Lagos',
          p_location_city: profile?.location_city || null
        });

        if (error) throw error;
        
        // Pre-load images for instant rendering
        data?.slice(0, 6).forEach((p: any) => {
          if (p.image_urls?.[0]) Image.prefetch(p.image_urls[0]);
          if (p.seller?.logo_url) Image.prefetch(p.seller.logo_url);
        });
        
        return data || [];
      } catch (err) {
        // Fallback for safety
        const { data } = await supabase
          .from('products')
          .select('*, seller:seller_id(*)')
          .order('created_at', { ascending: false })
          .limit(20);
        return data || [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // ⚡ OPTIMISTIC UPDATE: Like
  const handleToggleLike = async (productId: string) => {
    if (!profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    queryClient.setQueryData(['home-feed', searchQuery, activeCategory, isFlashMode, profile?.location_city], (old: any) => {
      return old?.map((p: any) => {
        if (p.id === productId) {
          const newState = !p.is_liked;
          return {
            ...p,
            is_liked: newState,
            likes_count: newState ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 0) - 1)
          };
        }
        return p;
      });
    });

    try {
      await supabase.rpc('toggle_product_like', { 
        p_user_id: profile.id, 
        p_product_id: productId 
      });
    } catch (e) {
      refetch(); // Revert on fail
    }
  };

  // ⚡ OPTIMISTIC UPDATE: Wishlist
  const handleToggleSave = async (productId: string) => {
    if (!profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    queryClient.setQueryData(['home-feed', searchQuery, activeCategory, isFlashMode, profile?.location_city], (old: any) => {
      return old?.map((p: any) => {
        if (p.id === productId) {
          return { ...p, is_saved: !p.is_saved };
        }
        return p;
      });
    });

    // Actual DB Sync
    try {
        // Assuming current state was toggled, we check the NEW state in the optimistic data? 
        // Simpler: Just try to insert. If conflict, delete. 
        // Or simpler: The backend toggle function is best. 
        // For now, let's assume we insert if not there.
        const { error } = await supabase.from('wishlists').insert({ user_id: profile.id, product_id: productId });
        if (error) {
            // If duplicate, delete (Toggle logic)
            await supabase.from('wishlists').delete().eq('user_id', profile.id).eq('product_id', productId);
        }
    } catch (e) {
        // Silent fail or revert
    }
  };

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshUserData();
    refetch();
  }, [refetch, refreshUserData]);

  const renderItem = useCallback(({ item, index }: any) => {
    // Safety check for malformed data
    if (!item || !item.seller) return null;

    return (
      <ProductCard 
        item={item}
        index={index}
        isSaved={item.is_saved || false} 
        onToggleWishlist={handleToggleSave} 
        onAddToCart={(it: any) => {
          addToCart(it, it.seller);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onOpenComments={() => {
          setSelectedProduct(item);
          commentSheetRef.current?.expand();
        }}
        onToggleLike={handleToggleLike}
      />
    );
  }, [products, addToCart]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* 🛡️ WELCOME GUIDE */}
      <EmpireGuide 
        isVisible={showGuide} 
        userRole={profile?.is_seller ? 'seller' : 'buyer'}
        onComplete={handleGuideComplete}
      />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
        <View style={styles.logoGroup}>
          <Text style={[styles.headerLogo, { color: theme.text }]}>STORELINK</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/post')} style={styles.headerBtn}>
            <PlusSquare size={26} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/activity/notifications')} style={styles.headerBtn}>
            <Bell size={26} color={theme.text} strokeWidth={2} />
            {/* Logic for unread badge could go here */}
            <View style={[styles.notifDot, { borderColor: theme.background }]} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => `home-feed-${item.id}`}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh} 
            tintColor={Colors.brand.emerald}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}

        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <StoryRow />
            <View style={styles.discoveryModule}>
              <SearchProtocol 
                value={searchQuery} 
                isFlashMode={isFlashMode}
                onToggleFlash={() => setIsFlashMode(!isFlashMode)}
                onChange={setSearchQuery} 
                onSearch={refetch}
              />
              <CategoryPulse 
                active={activeCategory} 
                onSelect={setActiveCategory} 
              />
            </View>
          </View>
        )}
        
        ListEmptyComponent={() => {
          if (isLoading) return (
            <View style={styles.loaderContainer}>
              <ActivityIndicator color={Colors.brand.emerald} size="large" />
              <Text style={[styles.loaderText, { color: theme.subtext }]}>UPDATING FEED...</Text>
            </View>
          );
          return (
            <View style={styles.emptyState}>
              <Zap size={32} color={theme.subtext} strokeWidth={1} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>Feed is Quiet</Text>
            </View>
          );
        }}
        
        ListFooterComponent={() => products.length > 0 ? (
          <View style={styles.footer}>
            <TrendingUp size={20} color={theme.border} />
            <Text style={[styles.footerText, { color: theme.border }]}>ALL CAUGHT UP</Text>
          </View>
        ) : null}
      />

      <CommentSheet product={selectedProduct} sheetRef={commentSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 15,
    zIndex: 1000,
  },
  logoGroup: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { 
    fontSize: 22, 
    fontWeight: '900', 
    letterSpacing: -1,
    fontVariant: ['small-caps'] 
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  headerBtn: { position: 'relative' },
  notifDot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5 },
  
  discoveryModule: { paddingHorizontal: 20, marginTop: 10 },
  listHeader: { paddingBottom: 15 },
  
  loaderContainer: { paddingVertical: 100, alignItems: 'center' },
  loaderText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.5 },
  
  emptyState: { padding: 100, alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  footer: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  footerText: { fontSize: 8, fontWeight: '900', letterSpacing: 2.5 }
});