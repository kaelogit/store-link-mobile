import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  Alert, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../../src/lib/supabase';
import { useCartStore } from '../../../src/store/useCartStore';
import { useUserStore } from '../../../src/store/useUserStore';
import { ProductCard } from '../../../src/components/ProductCard';
import { CommentSheet } from '../../../src/components/CommentSheet';
import { Text } from '../../../src/components/Themed';
import Colors from '../../../src/constants/Colors';
import { useColorScheme } from '../../../src/components/useColorScheme';
import { SellerMinimal, Product } from '../../../src/types';

const { width } = Dimensions.get('window');
// 🏛️ CINEMATIC GEOMETRY: (Width * 1.25 Ratio) + Action Footer Padding
const CARD_HEIGHT = (width * 1.25) + 120; 

/**
 * 🏰 MERCHANT SHOWROOM FEED v78.6 (Pure Build)
 * Audited: Section II Cinematic Ratios & Section IV Commercial Handshake.
 * Resolved: TS2554 addToCart multi-argument requirement.
 */
export default function StoreFeedScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const { id: sellerId, initialId } = useLocalSearchParams();
  const { addToCart } = useCartStore();
  const { profile: currentUser } = useUserStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const commentSheetRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (sellerId) {
      fetchCatalog();
      fetchUserInteractions();
    }
  }, [sellerId]);

  /**
   * 📡 CATALOG SYNC
   * Pulls the Merchant Registry with full Identity context.
   */
  const fetchCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, seller:seller_id(*)') 
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProducts(data as Product[]);
        
        // 🎯 GEOMETRIC JUMP: Instant scroll to the specific drop
        if (initialId) {
          const index = data.findIndex(p => p.id === initialId);
          if (index !== -1) {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index, animated: false });
            }, 200);
          }
        }
      }
    } catch (e: any) {
      console.error("Catalog Sync Failure:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInteractions = async () => {
    if (!currentUser?.id) return;
    const { data: wish } = await supabase
      .from('wishlist')
      .select('product_id')
      .eq('user_id', currentUser.id);
    
    setWishlistIds(wish?.map(w => w.product_id) || []);
  };

  /**
   * 🛡️ COMMERCIAL HANDSHAKE (Section IV)
   * Constructs the mandatory SellerMinimal context for logistics negotiation.
   */
  const handleAddToCart = (product: Product) => {
    if (!product.seller) return;

    const sellerContext: SellerMinimal = {
      id: product.seller_id,
      display_name: product.seller.display_name || 'Merchant',
      logo_url: product.seller.logo_url || '',
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart(product, sellerContext);
  };

  const handleToggleLike = async (productId: string) => {
    if (!currentUser?.id) return Alert.alert("Join StoreLink", "Login to interact with products.");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await supabase.rpc('toggle_product_like', { 
        p_user_id: currentUser.id, 
        p_product_id: productId 
      });
    } catch (e) {
      console.error("Interaction Registry Error");
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    if (!currentUser?.id) return Alert.alert("Join StoreLink", "Login to save items.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (wishlistIds.includes(productId)) {
      setWishlistIds(prev => prev.filter(id => id !== productId));
      await supabase.from('wishlist').delete().eq('user_id', currentUser.id).eq('product_id', productId);
    } else {
      setWishlistIds(prev => [...prev, productId]);
      await supabase.from('wishlist').insert({ user_id: currentUser.id, product_id: productId });
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* 🏛️ NAVIGATION BAR */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {products[0]?.seller?.display_name?.toUpperCase() || 'SHOWROOM'}
        </Text>
        <View style={{ width: 45 }} /> 
      </View>

      <FlatList
        ref={flatListRef}
        data={products}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        snapToInterval={CARD_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: CARD_HEIGHT, offset: CARD_HEIGHT * index, index })}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
        }}
        renderItem={({ item }) => (
          <ProductCard 
            item={item}
            isSaved={wishlistIds.includes(item.id)}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={() => handleAddToCart(item)}
            onToggleLike={handleToggleLike}
            onOpenComments={() => {
              setSelectedProduct(item);
              commentSheetRef.current?.expand();
            }}
          />
        )}
      />

      <CommentSheet 
        product={selectedProduct} 
        sheetRef={commentSheetRef} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  headerTitle: { 
    fontSize: 10, 
    fontWeight: '900', 
    textTransform: 'uppercase',
    letterSpacing: 2,
    flex: 1,
    textAlign: 'center'
  }
});