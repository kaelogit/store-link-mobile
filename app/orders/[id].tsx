import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, ScrollView, TouchableOpacity, 
  Image, ActivityIndicator, Alert, Linking, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, Package, Truck, CheckCircle2, 
  XCircle, MessageSquare, Phone, MapPin, 
  CreditCard, ShieldCheck, Clock
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 ORDER HANDSHAKE v75.3 (Pure Build)
 * Audited: Section IV Commercial Registry & Section VI Economic Ledger.
 */
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*, product:product_id(name, image_urls)),
          merchant:seller_id (id, display_name, logo_url, phone_number, location),
          buyer:user_id (id, display_name, phone_number, location)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (e: any) {
      Alert.alert("Registry Error", "Could not retrieve transaction details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    setUpdating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 🛡️ ATOMIC REFUND PROTOCOL (Manifest Section IV)
      // If cancelling, the database trigger handles the coin restoration via Ledger.
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchOrderDetails();
      Alert.alert("Success", `Order has been updated to ${newStatus.toLowerCase()}.`);
    } catch (e: any) {
      Alert.alert("Update Failed", "The ledger could not be updated at this time.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  const isMerchant = profile?.id === order.seller_id;
  const partner = isMerchant ? order.buyer : order.merchant;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ORDER DETAILS</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 📦 STATUS TRACKER */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
          <View style={styles.statusRow}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald + '20' }]}>
              {order.status === 'COMPLETED' ? <CheckCircle2 color={Colors.brand.emerald} /> : <Clock color={Colors.brand.emerald} />}
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.statusLabel}>CURRENT STATUS</Text>
              <Text style={[styles.statusValue, { color: theme.text }]}>{order.status}</Text>
            </View>
          </View>
        </View>

        {/* 🛍️ PRODUCT ITEMS */}
        <Text style={styles.sectionLabel}>PURCHASED ASSETS</Text>
        {order.order_items.map((item: any) => (
          <View key={item.id} style={[styles.productCard, { borderBottomColor: theme.border }]}>
            <Image source={{ uri: item.product.image_urls[0] }} style={styles.productImg} />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={[styles.productName, { color: theme.text }]}>{item.product.name}</Text>
              <Text style={[styles.productMeta, { color: theme.subtext }]}>Qty: {item.quantity} • ₦{item.unit_price.toLocaleString()}</Text>
            </View>
          </View>
        ))}

        {/* 💰 FINANCIAL SUMMARY */}
        <View style={[styles.summaryBox, { backgroundColor: theme.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: theme.subtext }}>Subtotal</Text>
            <Text style={{ color: theme.text, fontWeight: '700' }}>₦{order.total_amount.toLocaleString()}</Text>
          </View>
          {order.coin_redeemed > 0 && (
            <View style={styles.summaryRow}>
              <Text style={{ color: Colors.brand.emerald }}>Coins Redeemed</Text>
              <Text style={{ color: Colors.brand.emerald, fontWeight: '700' }}>- ₦{order.coin_redeemed.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>₦{(order.total_amount - order.coin_redeemed).toLocaleString()}</Text>
          </View>
        </View>

        {/* 👤 PARTNER CONTACT */}
        <Text style={styles.sectionLabel}>{isMerchant ? 'BUYER INFORMATION' : 'MERCHANT INFORMATION'}</Text>
        <View style={[styles.contactCard, { borderColor: theme.border }]}>
          <Text style={[styles.contactName, { color: theme.text }]}>{partner.display_name}</Text>
          <View style={styles.contactRow}>
            <MapPin size={16} color={theme.subtext} />
            <Text style={[styles.contactText, { color: theme.subtext }]}>{partner.location || 'Location not set'}</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.miniBtn, { backgroundColor: theme.surface }]}
              onPress={() => Linking.openURL(`tel:${partner.phone_number}`)}
            >
              <Phone size={18} color={theme.text} />
              <Text style={[styles.miniBtnText, { color: theme.text }]}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.miniBtn, { backgroundColor: theme.surface }]}
              onPress={() => router.push(`/chat/${order.id}`)}
            >
              <MessageSquare size={18} color={theme.text} />
              <Text style={[styles.miniBtnText, { color: theme.text }]}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ⚙️ TRANSACTION CONTROLS */}
        {order.status === 'PENDING' && (
          <View style={styles.controls}>
            {isMerchant ? (
              <TouchableOpacity 
                style={[styles.mainBtn, { backgroundColor: theme.text }]}
                onPress={() => updateOrderStatus('CONFIRMED')}
                disabled={updating}
              >
                <CheckCircle2 color={theme.background} size={20} />
                <Text style={[styles.mainBtnText, { color: theme.background }]}>CONFIRM PAYMENT</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.cancelBtn, { borderColor: '#EF4444' }]}
                onPress={() => updateOrderStatus('CANCELLED')}
                disabled={updating}
              >
                <XCircle color="#EF4444" size={20} />
                <Text style={styles.cancelBtnText}>CANCEL ORDER</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.securityNote}>
          <ShieldCheck size={14} color={theme.subtext} />
          <Text style={[styles.securityText, { color: theme.subtext }]}>
            Verified Transaction via StoreLink Economic Ledger
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 60, borderBottomWidth: 1 },
  headerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  backBtn: { padding: 5 },
  scroll: { padding: 25, paddingBottom: 60 },
  statusCard: { padding: 20, borderRadius: 24, marginBottom: 30 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  statusLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1 },
  statusValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 15 },
  productCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  productImg: { width: 60, height: 60, borderRadius: 15, backgroundColor: '#F3F4F6' },
  productName: { fontSize: 15, fontWeight: '700' },
  productMeta: { fontSize: 13, marginTop: 4 },
  summaryBox: { padding: 20, borderRadius: 24, marginVertical: 25 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  divider: { height: 1, marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 20, fontWeight: '900' },
  contactCard: { padding: 20, borderRadius: 24, borderWidth: 1.5, marginBottom: 30 },
  contactName: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  contactText: { fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12 },
  miniBtn: { flex: 1, height: 50, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  miniBtnText: { fontSize: 14, fontWeight: '700' },
  controls: { marginTop: 10 },
  mainBtn: { height: 70, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  mainBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  cancelBtn: { height: 70, borderRadius: 20, borderWidth: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  cancelBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40 },
  securityText: { fontSize: 11, fontWeight: '600' }
});