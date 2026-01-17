import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Image, RefreshControl, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Package, ChevronRight, CheckCircle2, 
  Clock, PackageCheck, Zap 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 ORDER HISTORY HUB v107.1 (Pure Build)
 * Audited: Section IV Commercial Registry & Section I Identity Prestige.
 */
export default function OrderHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile: currentUser } = useUserStore();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyOrders = async () => {
    try {
      if (!currentUser?.id) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          merchant:seller_id (
            display_name,
            logo_url,
            prestige_weight
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error("Order Sync Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchMyOrders(); 
  }, [currentUser?.id]);

  const handleConfirmReceipt = async (orderId: string) => {
    Alert.alert(
      "Confirm Delivery",
      "Are you sure you have received your items in good condition? This will finalize the payment.",
      [
        { text: "Not Yet", style: "cancel" },
        { 
          text: "YES, RECEIVED", 
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const { error } = await supabase
              .from('orders')
              .update({ status: 'completed' })
              .eq('id', orderId);
            
            if (!error) fetchMyOrders();
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyOrders();
  }, []);

  const renderOrder = ({ item }: { item: any }) => {
    const isPending = item.status === 'pending';
    const isConfirmed = item.status === 'confirmed';
    const merchant = item.merchant;
    const isDiamond = merchant?.prestige_weight === 3;

    return (
      <View style={[styles.orderCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push(`/orders/${item.id}`)}
          style={[styles.cardHeader, { borderBottomColor: theme.surface }]}
        >
          <View style={[styles.merchantAvatar, { backgroundColor: theme.surface }]}>
            {merchant?.logo_url ? (
              <Image source={{ uri: merchant.logo_url }} style={styles.logo} />
            ) : (
              <Package size={20} color={theme.subtext} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12, backgroundColor: 'transparent' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'transparent' }}>
              <Text style={[styles.merchantName, { color: theme.text }]}>
                {merchant?.display_name || 'Merchant'}
              </Text>
              {isDiamond && <Zap size={12} color="#8B5CF6" fill="#8B5CF6" />}
            </View>
            <Text style={[styles.orderDate, { color: theme.subtext }]}>
              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <View style={{ backgroundColor: 'transparent' }}>
            <Text style={styles.priceLabel}>TOTAL AMOUNT</Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>₦{item.total_amount.toLocaleString()}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.receiptBtn, { backgroundColor: theme.surface }]}
            onPress={() => router.push(`/orders/${item.id}`)}
          >
            <Text style={[styles.receiptText, { color: theme.text }]}>VIEW DETAILS</Text>
            <ChevronRight size={14} color={theme.text} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {isConfirmed && (
          <TouchableOpacity 
            style={[styles.completeBtn, { backgroundColor: theme.text }]} 
            onPress={() => handleConfirmReceipt(item.id)}
          >
            <PackageCheck size={18} color={theme.background} />
            <Text style={[styles.completeText, { color: theme.background }]}>I HAVE RECEIVED THIS ORDER</Text>
          </TouchableOpacity>
        )}

        {isPending && (
          <View style={[styles.waitingNotice, { backgroundColor: '#FFFBEB' }]}>
            <Clock size={14} color="#F59E0B" />
            <Text style={styles.waitingText}>Waiting for merchant to confirm...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>ORDER HISTORY</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.brand.emerald} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Package size={48} color={theme.border} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>NO ORDERS YET</Text>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>Your purchases will appear here once you place an order.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const stylesMap: any = {
    pending: { bg: '#FFFBEB', text: '#F59E0B', label: 'PENDING' },
    confirmed: { bg: '#EFF6FF', text: '#3B82F6', label: 'PREPARING' },
    completed: { bg: '#ECFDF5', text: '#10B981', label: 'DELIVERED' },
    cancelled: { bg: '#FEF2F2', text: '#EF4444', label: 'CANCELLED' }
  };
  const current = stylesMap[status] || stylesMap.pending;
  return (
    <View style={[badgeStyles.container, { backgroundColor: current.bg }]}>
      <Text style={[badgeStyles.text, { color: current.text }]}>{current.label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  container: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  text: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 60, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', backgroundColor: 'transparent' },
  list: { padding: 20, paddingBottom: 100, backgroundColor: 'transparent' },
  orderCard: { borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1 },
  merchantAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  merchantName: { fontSize: 14, fontWeight: '900' },
  orderDate: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 5, backgroundColor: 'transparent' },
  priceLabel: { fontSize: 8, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1 },
  priceValue: { fontSize: 22, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  receiptText: { fontSize: 10, fontWeight: '900' },
  completeBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 20, marginTop: 20, gap: 10 },
  completeText: { fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  waitingNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 12, borderRadius: 14 },
  waitingText: { fontSize: 11, color: '#B45309', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', marginTop: 120, backgroundColor: 'transparent' },
  emptyTitle: { fontSize: 14, fontWeight: '900', marginTop: 20, letterSpacing: 1 },
  emptyText: { marginTop: 8, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }
});