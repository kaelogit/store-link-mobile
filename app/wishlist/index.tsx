import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, 
  TouchableOpacity, ActivityIndicator, Dimensions, Alert, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Trash2, ArrowLeft, 
  BookmarkX, Zap, ShoppingCart
} from 'lucide-react-native';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useCartStore } from '../../src/store/useCartStore';
import { useUserStore } from '../../src/store/useUserStore';
import * as Haptics from 'expo-haptics';
import { SellerMinimal, Product } from '../../src/types';

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const COLUMN_GAP = 15;
const COLUMN_WIDTH = (width - (GRID_PADDING * 2) - COLUMN_GAP) / 2;
const IMAGE_HEIGHT = COLUMN_WIDTH * 1.25; // 🏛️ 4:5 CINEMATIC RATIO

/**
 * 🏰 WISHLIST TERMINAL v78.6 (Pure Build)
 * Audited: Section IV Commercial Handshake & Section II Asset Geometry.
 * Resolved: TS2554 addToCart multi-argument requirement.
 */
export default function WishlistScreen() {
  const router = useRouter();
  const { addToCart } = useCartStore();
  const { profile } = useUserStore();
  
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    if (!profile?.id) return;
    
    try {
      // 📡 REGISTRY SYNC: Pulling saved drops with full Merchant DNA
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          products:product_id (
            *,
            seller:seller_id (
              id, display_name, logo_url, whatsapp_number
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const flatProducts = data
          .filter((d: any) => d.products !== null)
          .map((d: any) => ({
            ...d.products,
            wishlist_entry_id: d.id
          }));
          
        setItems(flatProducts);
      }
    } catch (e: any) {
      console.error("Wishlist Sync Error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchWishlist(true);
  };

  const removeItem = async (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // 🛡️ OPTIMISTIC PURGE
    const backupItems = [...items];
    setItems(prev => prev.filter(item => item.id !== productId));

    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', profile?.id)
        .eq('product_id', productId);

      if (error) throw error;
    } catch (e) {
      setItems(backupItems);
      Alert.alert("Registry Failure", "Could not remove item from monitoring.");
    }
  };

  /**
   * 🛡️ COMMERCIAL HANDSHAKE (Section IV)
   * Restores the required Seller context for sovereign logistics negotiation.
   */
  const handleQuickAdd = (item: Product) => {
    if (!item.seller) return;

    const sellerContext: SellerMinimal = {
      id: item.seller_id,
      display_name: item.seller.display_name || 'Merchant',
      logo_url: item.seller.logo_url || '',
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart(item, sellerContext);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 🏛️ HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2.5} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>WISHLIST</Text>
          <Text style={styles.subtitle}>{items.length} DROPS MONITORED</Text>
        </View>
      </View>

      <FlatList
        data={items}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyCircle}>
               <BookmarkX size={40} color="#D1D5DB" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Registry Empty</Text>
            <Text style={styles.emptySub}>Save elite drops from the feed to monitor availability and stock urgency.</Text>
            <TouchableOpacity 
               style={styles.shopBtn} 
               onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.shopBtnText}>BROWSE VORTEX</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.wishItem}>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => router.push(`/product/${item.id}`)}
              style={styles.imageBox}
            >
              <Image source={{ uri: item.image_urls?.[0] }} style={styles.itemImage} />
              
              <TouchableOpacity 
                style={styles.removeBtn} 
                onPress={() => removeItem(item.id)}
              >
                <Trash2 size={16} color="#EF4444" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* ⚡ STOCK INTELLIGENCE */}
              {item.stock_quantity > 0 && item.stock_quantity < 5 && (
                <View style={styles.lowStockBadge}>
                  <Zap size={10} color="white" fill="white" />
                  <Text style={styles.lowStockText}>LOW STOCK</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.details}>
              <Text style={styles.vendorName} numberOfLines={1}>
                {item.seller?.display_name?.toUpperCase() || 'MERCHANT'}
              </Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>
              
              <TouchableOpacity style={styles.addBtn} onPress={() => handleQuickAdd(item)}>
                <ShoppingCart size={14} color="white" strokeWidth={3} />
                <Text style={styles.addBtnText}>ADD TO BAG</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20, gap: 15, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 10, fontWeight: '900', color: '#10B981', letterSpacing: 1.5, marginTop: 2 },
  gridContent: { padding: 20, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between' },
  wishItem: { width: COLUMN_WIDTH, marginBottom: 35 },
  imageBox: { width: COLUMN_WIDTH, height: IMAGE_HEIGHT, borderRadius: 28, overflow: 'hidden', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F3F4F6' },
  itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center' },
  lowStockBadge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  lowStockText: { color: 'white', fontSize: 8, fontWeight: '900' },
  details: { marginTop: 15, gap: 4 },
  vendorName: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1 },
  itemName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  itemPrice: { fontSize: 13, fontWeight: '900', color: '#10B981', marginBottom: 8 },
  addBtn: { backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 18 },
  addBtnText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  emptyState: { alignItems: 'center', marginTop: 120, paddingHorizontal: 40 },
  emptyCircle: { width: 100, height: 100, borderRadius: 40, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  emptySub: { textAlign: 'center', color: '#9CA3AF', marginTop: 12, lineHeight: 22, fontSize: 13, fontWeight: '600' },
  shopBtn: { backgroundColor: '#111827', paddingHorizontal: 35, paddingVertical: 20, borderRadius: 24, marginTop: 40 },
  shopBtnText: { color: 'white', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }
});