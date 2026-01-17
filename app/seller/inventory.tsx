import React, { useEffect, useState, useMemo } from 'react';
import { 
  StyleSheet, FlatList, Image, 
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Trash2, Zap, Package, 
  DollarSign, Search, X 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 INVENTORY MANAGER v103.1 (Pure Build)
 * Audited: Section II Asset Registry & Section V Cinematic Cascade.
 */
export default function InventoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [profile?.id]);

  const fetchInventory = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  const handleUpdate = async (id: string, updates: any) => {
    setUpdatingId(id);
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (!error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
    setUpdatingId(null);
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Product?",
      "This will permanently remove this product and all its videos from the marketplace.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "DELETE", style: "destructive", onPress: () => handleDelete(id) }
      ]
    );
  };

  const handleDelete = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const renderProduct = ({ item }: { item: any }) => (
    <View style={[styles.productCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Image source={{ uri: item.image_urls[0] }} style={styles.prodImg} />
      
      <View style={[styles.prodInfo, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.prodName, { color: theme.text }]}>{item.name.toUpperCase()}</Text>
        
        <View style={[styles.editRow, { backgroundColor: 'transparent' }]}>
          <View style={[styles.inputWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <DollarSign size={10} color={theme.subtext} />
            <TextInput
              style={[styles.smallInput, { color: theme.text }]}
              keyboardType="numeric"
              defaultValue={item.price.toString()}
              onEndEditing={(e) => handleUpdate(item.id, { price: parseFloat(e.nativeEvent.text) || 0 })}
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Package size={10} color={theme.subtext} />
            <TextInput
              style={[styles.smallInput, { color: theme.text }]}
              keyboardType="numeric"
              defaultValue={item.stock_quantity.toString()}
              onEndEditing={(e) => handleUpdate(item.id, { stock_quantity: parseInt(e.nativeEvent.text) || 0 })}
            />
          </View>
        </View>

        <View style={[styles.actionRow, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity 
            style={[styles.flashBtn, item.is_flash_drop && { backgroundColor: theme.text, borderColor: theme.text }]}
            onPress={() => handleUpdate(item.id, { is_flash_drop: !item.is_flash_drop })}
          >
            <Zap size={12} color={item.is_flash_drop ? theme.background : "#F59E0B"} fill={item.is_flash_drop ? theme.background : "transparent"} />
            <Text style={[styles.flashText, { color: item.is_flash_drop ? theme.background : "#F59E0B" }]}>
              {item.is_flash_drop ? "FLASH ACTIVE" : "SET FLASH"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.trashBtn}>
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      {updatingId === item.id && <View style={[styles.loaderOverlay, { backgroundColor: theme.surface + 'B3' }]}><ActivityIndicator color={Colors.brand.emerald} /></View>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MY INVENTORY</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={18} color={theme.subtext} />
        <TextInput 
          placeholder="Search your products..."
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
            <X size={18} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.brand.emerald} /></View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.empty, { color: theme.subtext }]}>
                {searchQuery ? "No products found." : "Your inventory is empty."}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 10 : 45, alignItems: 'center', borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', backgroundColor: 'transparent' },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 20, paddingHorizontal: 15, height: 52, borderRadius: 18, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 40, backgroundColor: 'transparent' },
  productCard: { flexDirection: 'row', borderRadius: 24, padding: 12, marginBottom: 15, position: 'relative', overflow: 'hidden', borderWidth: 1 },
  prodImg: { width: 85, height: 105, borderRadius: 16, backgroundColor: '#EEE' },
  prodInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  prodName: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  editRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 38, borderRadius: 12, borderWidth: 1 },
  smallInput: { flex: 1, marginLeft: 4, fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  flashBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: '#F59E0B' },
  flashText: { fontSize: 9, fontWeight: '900' },
  trashBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#FEF2F2' },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { marginTop: 100, alignItems: 'center', backgroundColor: 'transparent' },
  empty: { textAlign: 'center', fontWeight: '800', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }
});