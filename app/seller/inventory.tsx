import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  StyleSheet, FlatList, 
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Trash2, Zap, Package, 
  DollarSign, Search, X, AlertTriangle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image'; // 🛡️ Hardware Accelerated

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 📦 PRODUCT MANAGER v105.0
 * Purpose: Allows shop owners to edit prices, stock, and featured items.
 * Language: Simple English for everyday shop management.
 */
export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [profile?.id]);

  /**
   * 📡 Load my items
   */
  const loadProducts = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });
      setProducts(data || []);
    } catch (e) {
      console.error("Could not load products:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  const updateProduct = async (id: string, updates: any) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (!error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      }
    } catch (e) {
      console.error("Update failed:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Remove Item?",
      "This will permanently delete this product from your shop.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "DELETE", 
          style: "destructive", 
          onPress: () => removeProduct(id) 
        }
      ]
    );
  };

  const removeProduct = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const renderProduct = ({ item }: { item: any }) => {
    const isLowStock = item.stock_quantity > 0 && item.stock_quantity <= 3;
    const isOutOfStock = item.stock_quantity === 0;

    return (
      <View style={[styles.productCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Image 
          source={item.image_urls?.[0]} 
          style={styles.prodImg} 
          contentFit="cover"
          transition={200}
        />
        
        <View style={styles.prodInfo}>
          <Text style={[styles.prodName, { color: theme.text }]} numberOfLines={1}>
            {item.name.toUpperCase()}
          </Text>
          
          <View style={styles.editRow}>
            {/* PRICE EDIT */}
            <View style={[styles.inputWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <DollarSign size={12} color={theme.subtext} strokeWidth={2.5} />
              <TextInput
                style={[styles.smallInput, { color: theme.text }]}
                keyboardType="numeric"
                defaultValue={item.price.toString()}
                onEndEditing={(e) => updateProduct(item.id, { price: parseFloat(e.nativeEvent.text) || 0 })}
              />
            </View>

            {/* STOCK EDIT */}
            <View style={[
              styles.inputWrap, 
              { backgroundColor: theme.background, borderColor: theme.border },
              isLowStock && { borderColor: '#F59E0B' },
              isOutOfStock && { borderColor: '#EF4444' }
            ]}>
              <Package size={12} color={isOutOfStock ? '#EF4444' : theme.subtext} strokeWidth={2.5} />
              <TextInput
                style={[styles.smallInput, { color: isOutOfStock ? '#EF4444' : theme.text }]}
                keyboardType="numeric"
                defaultValue={item.stock_quantity.toString()}
                onEndEditing={(e) => updateProduct(item.id, { stock_quantity: parseInt(e.nativeEvent.text) || 0 })}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.flashBtn, item.is_flash_drop && { backgroundColor: theme.text, borderColor: theme.text }]}
              onPress={() => updateProduct(item.id, { is_flash_drop: !item.is_flash_drop })}
            >
              <Zap size={12} color={item.is_flash_drop ? theme.background : "#F59E0B"} fill={item.is_flash_drop ? theme.background : "transparent"} />
              <Text style={[styles.flashText, { color: item.is_flash_drop ? theme.background : "#F59E0B" }]}>
                {item.is_flash_drop ? "FEATURED ACTIVE" : "FEATURE ITEM"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.trashBtn}>
              <Trash2 size={18} color="#EF4444" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {updatingId === item.id && (
          <View style={[styles.loaderOverlay, { backgroundColor: `${theme.background}BB` }]}>
            <ActivityIndicator color={Colors.brand.emerald} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MY PRODUCTS</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* SEARCH */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={18} color={theme.subtext} strokeWidth={2.5} />
        <TextInput 
          placeholder="Search items by name..."
          placeholderTextColor={theme.subtext}
          style={[styles.searchInput, { color: theme.text }]}
          value={searchQuery}
          onChangeText={(txt) => {
            setSearchQuery(txt);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={theme.text} strokeWidth={3} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.brand.emerald} size="large" /></View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Package size={40} color={theme.border} style={{ marginBottom: 15 }} />
              <Text style={[styles.empty, { color: theme.subtext }]}>
                {searchQuery ? "No products found." : "You haven't added any products yet."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, alignItems: 'center', borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 20, paddingHorizontal: 15, height: 56, borderRadius: 20, borderWidth: 1.5 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '700' },
  
  list: { paddingHorizontal: 20 },
  
  productCard: { flexDirection: 'row', borderRadius: 28, padding: 12, marginBottom: 18, position: 'relative', overflow: 'hidden', borderWidth: 1.5 },
  prodImg: { width: 90, height: 110, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  prodInfo: { flex: 1, marginLeft: 15, justifyContent: 'center', backgroundColor: 'transparent' },
  prodName: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  
  editRow: { flexDirection: 'row', gap: 10, marginTop: 12, backgroundColor: 'transparent' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 42, borderRadius: 14, borderWidth: 1.5 },
  smallInput: { flex: 1, marginLeft: 6, fontSize: 13, fontWeight: '800' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, backgroundColor: 'transparent' },
  flashBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#F59E0B' },
  flashText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  trashBtn: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#FEF2F2' },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  emptyWrap: { marginTop: 120, alignItems: 'center', backgroundColor: 'transparent' },
  empty: { textAlign: 'center', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }
});