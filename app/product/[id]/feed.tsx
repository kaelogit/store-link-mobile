import React, { useEffect, useState, useRef } from 'react';
import { 
  View, FlatList, ActivityIndicator, StyleSheet, 
  TouchableOpacity, Dimensions, Platform, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../../src/lib/supabase';
import { useCartStore } from '../../../src/store/useCartStore';
import { useUserStore } from '../../../src/store/useUserStore';
import { ProductCard } from '../../../src/components/ProductCard';
import { CommentSheet } from '../../../src/components/CommentSheet';
import { Text } from '../../../src/components/Themed';
import Colors from '../../../src/constants/Colors';
import { useColorScheme } from '../../../src/components/useColorScheme';

const { height: screenHeight } = Dimensions.get('window');
// 🏛️ SCREEN LAYOUT: Matches the height for vertical snapping
const CARD_HEIGHT = screenHeight * 0.82; 

/**
 * 🏰 STORE FEED v102.0
 * Purpose: A high-speed, vertical scrolling feed of a specific store's products.
 * Features: Fast image loading, smooth vertical snapping, and instant interaction.
 */
export default function StoreFeedScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const queryClient = useQueryClient();
  
  const { id: sellerId, initialId } = useLocalSearchParams();
  const { addToCart } = useCartStore();
  const { profile: currentUser } = useUserStore();

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const commentSheetRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  /** 🛡️ STORE UPDATE: Fetching the full product list */
  const { 
    data: products = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['store-catalog', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, seller:seller_id(*)') 
        .eq('seller_id', sellerId)
        .eq('is_active', true) // Ensure we only show active items
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Prepare images for instant viewing
      data?.forEach((p: any) => {
        if (p.image_urls?.[0]) Image.prefetch(p.image_urls[0]);
      });

      return data || [];
    },
    staleTime: 1000 * 60 * 10, 
  });

  /** 🛡️ WISHLIST SYNC: Checking which items are saved */
  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist-ids', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { data } = await supabase.from('wishlists').select('product_id').eq('user_id', currentUser.id);
      return data?.map(w => w.product_id) || [];
    },
    enabled: !!currentUser?.id
  });

  // SCROLL LOGIC: Jump to the item clicked from the profile grid
  useEffect(() => {
    if (!isLoading && products.length > 0 && initialId) {
      const index = products.findIndex((p: any) => p.id === initialId);
      if (index !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: false });
        }, 100);
      }
    }
  }, [isLoading, products, initialId]);

  // ⚡ OPTIMISTIC UPDATE: Like
  const handleToggleLike = async (productId: string) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Instant UI update
    queryClient.setQueryData(['store-catalog', sellerId], (old: any) => {
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
      await supabase.rpc('toggle_product_like', { p_user_id: currentUser.id, p_product_id: productId });
    } catch (e) {
      refetch(); // Revert on error
    }
  };

  // ⚡ OPTIMISTIC UPDATE: Wishlist
  const handleToggleSave = async (productId: string) => {
    if (!currentUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update local cache for immediate feedback
    queryClient.setQueryData(['wishlist-ids', currentUser.id], (old: string[] = []) => {
      if (old.includes(productId)) return old.filter(id => id !== productId);
      return [...old, productId];
    });

    try {
        const isSaved = wishlistIds.includes(productId);
        if (isSaved) {
            await supabase.from('wishlists').delete().eq('user_id', currentUser.id).eq('product_id', productId);
        } else {
            await supabase.from('wishlists').insert({ user_id: currentUser.id, product_id: productId });
        }
    } catch (e) {
        queryClient.invalidateQueries({ queryKey: ['wishlist-ids'] });
    }
  };

  if (isLoading && products.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
        <Text style={[styles.loaderText, { color: theme.subtext }]}>LOADING STORE...</Text>
      </View>
    );
  }

  const storeName = products[0]?.seller?.display_name?.toUpperCase() || 'STORE';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* 🏛️ NAVIGATION */}
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={3} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {storeName}
          </Text>
          <Text style={[styles.headerSub, { color: theme.subtext }]}>{products.length} ITEMS AVAILABLE</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <Zap size={20} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={products}
        keyExtractor={(item) => `showroom-${item.id}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={CARD_HEIGHT}
        snapToAlignment="center" // Centering ensures the card isn't cut off
        decelerationRate="fast"
        
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        
        contentContainerStyle={{ paddingVertical: (screenHeight - CARD_HEIGHT) / 4 }} // Center first item vertically

        getItemLayout={(_, index) => ({ length: CARD_HEIGHT, offset: CARD_HEIGHT * index, index })}
        renderItem={({ item }) => (
          <View style={{ height: CARD_HEIGHT, justifyContent: 'center' }}>
            <ProductCard 
              item={item}
              isSaved={wishlistIds.includes(item.id)}
              onToggleWishlist={handleToggleSave} 
              onAddToCart={() => {
                addToCart(item, item.seller);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              onToggleLike={handleToggleLike}
              onOpenComments={() => {
                setSelectedProduct(item);
                commentSheetRef.current?.expand();
              }}
            />
          </View>
        )}
      />

      <CommentSheet product={selectedProduct} sheetRef={commentSheetRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.4 },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1.5,
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerSub: { fontSize: 8, fontWeight: '800', marginTop: 2, letterSpacing: 1 },
  backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  headerTitle: { 
    fontSize: 12, 
    fontWeight: '900', 
    letterSpacing: 1.5,
  }
});