import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, TextInput, Share, RefreshControl, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { 
  ArrowLeft, Search, FileText, TrendingUp, 
  Clock, CheckCircle2, User, Truck, PackageCheck, AlertCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { OrderDetailsModal } from '../../src/components/OrderDetailsModal';

/**
 * 🏰 MERCHANT ORDERS v96.0
 * Logic: Triple-Lock Deal Synchronization (Pending -> Confirmed -> Delivered -> Completed).
 * Visual: Diamond Buyer recognition & Monthly Revenue Pulse.
 * Hardware: Full Safe-Area Top Padding for notched displays.
 */
export default function SellerOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    fetchMerchantOrders();
  }, [profile?.id]);

  const fetchMerchantOrders = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, buyer:user_id(slug, logo_url, prestige_weight)')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      calculateTotalSales(data || []);
    } catch (e) {
      console.error("Order load failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /** 📊 SALES CALCULATION - Monthly Economic Pulse */
  const calculateTotalSales = (allOrders: any[]) => {
    const now = new Date();
    const currentMonthOrders = allOrders.filter(o => {
      const d = new Date(o.created_at);
      return (o.status === 'confirmed' || o.status === 'delivered' || o.status === 'completed') && 
             d.getMonth() === now.getMonth() && 
             d.getFullYear() === now.getFullYear();
    });
    const revenue = currentMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    setTotalSales(revenue);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMerchantOrders();
  }, [profile?.id]);

  const exportSalesData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let csv = "Order ID,Buyer Handle,Amount,Status,Date\n";
    orders.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString();
      csv += `${o.id.slice(0,8)},@${o.buyer?.slug || 'customer'},${o.total_amount},${o.status},${date}\n`;
    });
    await Share.share({ 
      message: `StoreLink Commercial Report - ${new Date().toLocaleDateString()}\n\n${csv}` 
    });
  };

  const filteredOrders = orders.filter(o => 
    o.buyer?.slug?.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && !refreshing) return (
    <View style={styles.centered}><ActivityIndicator color={Colors.brand.emerald} size="large" /></View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 📱 HEADER - Hardware-Safe */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: theme.border }]}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>ORDER LEDGER</Text>
          <TouchableOpacity onPress={exportSalesData} style={styles.navBtn}>
            <FileText color={Colors.brand.emerald} size={22} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={18} color={theme.subtext} />
          <TextInput 
            placeholder="Search buyer handle or ID..." 
            style={[styles.input, { color: theme.text }]} 
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={theme.subtext}
          />
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
        ListHeaderComponent={() => (
          <View style={styles.statsContainer}>
            <View style={[styles.mainStat, { backgroundColor: theme.text }]}>
              <View style={{backgroundColor: 'transparent'}}>
                <Text style={styles.statLabel}>MONTHLY REVENUE</Text>
                <Text style={[styles.statValue, { color: theme.background }]}>₦{totalSales.toLocaleString()}</Text>
              </View>
              <View style={styles.iconCircle}><TrendingUp color={theme.text} size={22} strokeWidth={3} /></View>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <OrderRow 
            item={item} 
            theme={theme}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedOrder(item);
            }} 
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AlertCircle size={32} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.border }]}>NO DEALS RECORDED</Text>
          </View>
        }
      />

      <OrderDetailsModal 
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdate={fetchMerchantOrders}
        isMerchantView={true} 
      />
    </View>
  );
}

const OrderRow = ({ item, onPress, theme }: any) => {
  const isDiamondBuyer = item.buyer?.prestige_weight === 3;
  
  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'completed': return { bg: '#ECFDF5', text: '#10B981', label: 'COMPLETED', icon: CheckCircle2 };
      case 'delivered': return { bg: '#EFF6FF', text: '#3B82F6', label: 'DELIVERED', icon: Truck };
      case 'confirmed': return { bg: '#F5F3FF', text: '#8B5CF6', label: 'PAID', icon: PackageCheck };
      case 'pending': return { bg: '#FFFBEB', text: '#F59E0B', label: 'PENDING', icon: Clock };
      case 'cancelled': return { bg: '#FEF2F2', text: '#EF4444', label: 'CANCELLED', icon: AlertCircle };
      default: return { bg: theme.surface, text: theme.subtext, label: status.toUpperCase(), icon: Clock };
    }
  };

  const style = getStatusStyle(item.status);
  const StatusIcon = style.icon;

  return (
    <TouchableOpacity 
        style={[styles.orderRow, { backgroundColor: theme.surface, borderColor: theme.border }]} 
        onPress={onPress} 
        activeOpacity={0.8}
    >
      <View style={[styles.orderLeft, { backgroundColor: 'transparent' }]}>
        <View style={[styles.orderAvatar, { backgroundColor: theme.background, borderColor: isDiamondBuyer ? '#8B5CF6' : theme.border }]}>
            {item.buyer?.logo_url ? (
              <Image source={{ uri: item.buyer.logo_url }} style={styles.avatarImg} />
            ) : (
              <User size={20} color={isDiamondBuyer ? '#8B5CF6' : theme.subtext} />
            )}
        </View>
        <View style={{backgroundColor: 'transparent'}}>
          <Text style={[styles.buyerName, { color: isDiamondBuyer ? '#8B5CF6' : theme.text }]}>@{item.buyer?.slug || 'customer'}</Text>
          <View style={[styles.idRow, { backgroundColor: 'transparent' }]}>
            <Clock size={10} color={theme.subtext} />
            <Text style={[styles.orderId, { color: theme.subtext }]}>{item.id.slice(0,8).toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.orderRight, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.orderPrice, { color: theme.text }]}>₦{item.total_amount.toLocaleString()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
          <StatusIcon size={10} color={style.text} style={{marginRight: 4}} />
          <Text style={[styles.statusText, { color: style.text }]}>{style.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1.5 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  navBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 52, borderRadius: 16, gap: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 14, fontWeight: '700' },
  list: { paddingBottom: 100 },
  statsContainer: { padding: 20 },
  mainStat: { padding: 25, borderRadius: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4, shadowOpacity: 0.1, shadowRadius: 10 },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  statValue: { fontSize: 24, fontWeight: '900', marginTop: 8, letterSpacing: -1 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, marginHorizontal: 15, borderRadius: 24, marginBottom: 12, borderWidth: 1 },
  orderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  buyerName: { fontSize: 13, fontWeight: '900' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  orderId: { fontSize: 9, fontWeight: '800' },
  orderRight: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 15, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 6, flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  empty: { padding: 100, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 }
});