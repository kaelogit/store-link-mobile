import React, { useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  TouchableOpacity, ActivityIndicator, Dimensions, Alert, RefreshControl, Platform, StatusBar 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Trash2, ArrowLeft, BookmarkX, 
  Zap, ShoppingBag, Gem
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// 💎 SPEED ENGINE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore';
import { useUserStore } from '../../src/store/useUserStore';
import { SellerMinimal, Product } from '../../src/types';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2; // Adjusted spacing
const IMAGE_HEIGHT = COLUMN_WIDTH * 1.25; // 🏛️ 4:5 Aspect Ratio

/**
 * 🏰 WISHLIST v81.0
 * Purpose: A dedicated space for users to track items they want to buy.
 * Logic: Fast loading with real-time stock updates.
 * Features: One-tap "Add to Bag" and stock alerts for low inventory.
 */
export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const { addToCart } = useCartStore();
  const { profile } = useUserStore();

  /** 📡 DATA SYNC: Loading saved items */
  const { 
    data: items = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['wishlist-list', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          products:product_id (
            *,
            seller:seller_id (
              id, display_name, logo_url, whatsapp_number, subscription_plan
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data
        .filter((d: any) => d.products !== null)
        .map((d: any) => ({
          ...d.products,
          wishlist_entry_id: d.id
        })) as Product[];
    },
    staleTime: 1000 * 60 * 5,
  });

  /** 🛡️ REMOVE ITEM PROCESS */
  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', profile?.id)
        .eq('product_id', productId);
      if (error) throw error;
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist-list', profile?.id] });
      const previous = queryClient.getQueryData(['wishlist-list', profile?.id]);
      
      queryClient.setQueryData(['wishlist-list', profile?.id], (old: any) => 
        old?.filter((item: any) => item.id !== productId)
      );
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return { previous };
    },
    onError: (err, productId, context) => {
      queryClient.setQueryData(['wishlist-list', profile?.id], context?.previous);
      Alert.alert("Error", "Could not remove item.");
    }
  });

  const handleQuickAdd = (item: Product) => {
    if (!item.seller) return;
    const sellerContext: SellerMinimal = {
      id: item.seller_id,
      display_name: item.seller.display_name || 'Store',
      logo_url: item.seller.logo_url || '',
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart(item, sellerContext);
  };

  if (isLoading && items.length === 0) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={styles.loaderText}>LOADING WISHLIST...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), borderBottomColor: theme.surface }]}>
        <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backBtn, { backgroundColor: theme.surface }]}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <ArrowLeft size={24} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: theme.text }]}>WISHLIST</Text>
          <Text style={[styles.subtitle, { color: Colors.brand.emerald }]}>{items.length} ITEMS SAVED</Text>
        </View>
      </View>

      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item) => `wish-${item.id}`}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.emerald} />}
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 100 }]}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyCircle, { backgroundColor: theme.surface }]}>
               <BookmarkX size={44} color={theme.border} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your Wishlist is Empty</Text>
            <Text style={[styles.emptySub, { color: theme.subtext }]}>
                Save items you love from the feed to keep track of their price and availability.
            </Text>
            <TouchableOpacity style={[styles.shopBtn, { backgroundColor: theme.text }]} onPress={() => router.push('/(tabs)')}>
              <Text style={[styles.shopBtnText, { color: theme.background }]}>START SHOPPING</Text>
            </TouchableOpacity>
          </View>
        }
        
        renderItem={({ item }) => {
          const isDiamond = item.seller?.subscription_plan === 'diamond';
          const isLowStock = item.stock_quantity > 0 && item.stock_quantity < 5;
          
          return (
            <View style={styles.wishItem}>
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => router.push(`/product/${item.id}`)}
                style={[styles.imageBox, { borderColor: theme.border }]}
              >
                <Image 
                  source={item.image_urls?.[0]} 
                  style={styles.itemImage} 
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                
                <TouchableOpacity 
                  style={[styles.removeBtn, { backgroundColor: `${theme.background}CC` }]} 
                  onPress={() => removeMutation.mutate(item.id)}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Trash2 size={16} color="#EF4444" strokeWidth={2.5} />
                </TouchableOpacity>

                {isLowStock && (
                  <View style={styles.lowStockBadge}>
                    <Zap size={10} color="white" fill="white" />
                    <Text style={styles.lowStockText}>LOW STOCK</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.details}>
                <View style={styles.vendorRow}>
                  <Text style={[styles.vendorName, { color: theme.subtext }]} numberOfLines={1}>
                    {item.seller?.display_name?.toUpperCase()}
                  </Text>
                  {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />}
                </View>
                
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: Colors.brand.emerald }]}>₦{item.price.toLocaleString()}</Text>
                
                <TouchableOpacity 
                  style={[styles.addBtn, { backgroundColor: theme.text }]} 
                  onPress={() => handleQuickAdd(item)}
                >
                  <ShoppingBag size={14} color={theme.background} strokeWidth={3} />
                  <Text style={[styles.addBtnText, { color: theme.background }]}>ADD TO BAG</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.4 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, gap: 15, borderBottomWidth: 1.5 },
  headerInfo: { flex: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  
  gridContent: { padding: 20 },
  gridRow: { justifyContent: 'space-between' },
  
  wishItem: { width: COLUMN_WIDTH, marginBottom: 35 },
  imageBox: { width: COLUMN_WIDTH, height: IMAGE_HEIGHT, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  
  removeBtn: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  lowStockBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 4 },
  lowStockText: { color: 'white', fontSize: 8, fontWeight: '900' },
  
  details: { marginTop: 12, gap: 3 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vendorName: { fontSize: 8, fontWeight: '900', letterSpacing: 1, flex: 1 },
  itemName: { fontSize: 14, fontWeight: '800' },
  itemPrice: { fontSize: 13, fontWeight: '900', marginBottom: 6 },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, elevation: 4 },
  addBtnText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  emptyState: { flex: 1, alignItems: 'center', marginTop: 100, paddingHorizontal: 30 },
  emptyCircle: { width: 110, height: 110, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  emptyTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  emptySub: { textAlign: 'center', marginTop: 12, lineHeight: 22, fontSize: 14, fontWeight: '600', opacity: 0.6 },
  
  shopBtn: { paddingHorizontal: 35, paddingVertical: 20, borderRadius: 24, marginTop: 40, elevation: 6 },
  shopBtnText: { fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }
});