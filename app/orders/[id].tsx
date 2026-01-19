import React, { useCallback } from 'react';
import { 
  StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, Linking, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Package, Truck, CheckCircle2, 
  XCircle, MessageSquare, Phone, MapPin, 
  ShieldCheck, Clock, Gem, PackageCheck
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 ORDER DETAIL v101.0
 * Purpose: A clear, high-speed view for tracking and managing specific orders.
 * Logic: Synchronizes order status with chat conversations automatically.
 */
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();
  const queryClient = useQueryClient();

  /** 🛡️ DATA SYNC: Fetching latest order info */
  const { 
    data: order, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*, product:product_id(name, image_urls)),
          merchant:seller_id (id, display_name, slug, logo_url, phone_number, location, subscription_plan),
          buyer:user_id (id, display_name, slug, phone_number, location)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  /** 🛡️ STATUS UPDATE PROCESS */
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (orderError) throw orderError;

      // Automatically sync the status in the chat room
      if (order?.conversation_id) {
        await supabase
          .from('conversations')
          .update({ deal_status: newStatus })
          .eq('id', order.conversation_id);
      }
    },
    onMutate: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onSuccess: (_, newStatus) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
      Alert.alert("Status Updated", `Order is now ${newStatus.toUpperCase()}`);
    },
    onError: () => {
      Alert.alert("Update Error", "Could not update the order status.");
    }
  });

  if (isLoading && !order) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={styles.loaderText}>UPDATING ORDER...</Text>
    </View>
  );

  if (!order) return null;

  const isMerchant = profile?.id === order.seller_id;
  const partner = isMerchant ? order.buyer : order.merchant;
  const isDiamond = order.merchant?.subscription_plan === 'diamond';
  const currentStatus = order.status || 'pending';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 📱 HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>ORDER DETAILS</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        
        {/* 📦 STATUS BAR */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
          <View style={styles.statusRow}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald + '15' }]}>
              {currentStatus === 'completed' ? <CheckCircle2 color={Colors.brand.emerald} /> : <Clock color={Colors.brand.emerald} />}
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.statusLabel}>CURRENT STATUS</Text>
              <Text style={[styles.statusValue, { color: theme.text }]}>{currentStatus.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* 🛍️ ITEMS LIST */}
        <Text style={styles.sectionLabel}>ITEMS IN THIS ORDER</Text>
        {order.order_items.map((item: any) => (
          <View key={item.id} style={[styles.productCard, { borderBottomColor: theme.border }]}>
            <Image 
              source={item.product.image_urls[0]} 
              style={styles.productImg} 
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={[styles.productName, { color: theme.text }]}>{item.product.name.toUpperCase()}</Text>
              <Text style={[styles.productMeta, { color: theme.subtext }]}>QTY: {item.quantity} • ₦{item.unit_price.toLocaleString()}</Text>
            </View>
          </View>
        ))}

        {/* 💰 PAYMENT SUMMARY */}
        <View style={[styles.summaryBox, { backgroundColor: theme.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: theme.subtext, fontWeight: '700' }}>SUBTOTAL</Text>
            <Text style={{ color: theme.text, fontWeight: '900' }}>₦{order.total_amount.toLocaleString()}</Text>
          </View>
          {order.coin_redeemed > 0 && (
            <View style={styles.summaryRow}>
              <Text style={{ color: Colors.brand.emerald, fontWeight: '700' }}>STORE COINS USED</Text>
              <Text style={{ color: Colors.brand.emerald, fontWeight: '900' }}>- ₦{order.coin_redeemed.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>TOTAL PRICE</Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>₦{(order.total_amount - (order.coin_redeemed || 0)).toLocaleString()}</Text>
          </View>
        </View>

        {/* 👤 BUYER/STORE DETAILS */}
        <Text style={styles.sectionLabel}>{isMerchant ? 'BUYER DETAILS' : 'STORE DETAILS'}</Text>
        <View style={[styles.contactCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.partnerHeader}>
            <Text style={[styles.contactName, { color: theme.text }]}>{partner.display_name?.toUpperCase()}</Text>
            {isDiamond && !isMerchant && <Gem size={14} color="#8B5CF6" fill="#8B5CF6" />}
          </View>
          <View style={styles.contactRow}>
            <MapPin size={14} color={theme.subtext} />
            <Text style={[styles.contactText, { color: theme.subtext }]}>@{partner.slug} • {partner.location || 'Lagos'}</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.miniBtn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => Linking.openURL(`tel:${partner.phone_number}`)}
            >
              <Phone size={18} color={theme.text} />
              <Text style={[styles.miniBtnText, { color: theme.text }]}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.miniBtn, { backgroundColor: theme.text }]}
              onPress={() => router.push(`/chat/${id}` as any)}
            >
              <MessageSquare size={18} color={theme.background} />
              <Text style={[styles.miniBtnText, { color: theme.background }]}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ⚙️ MANAGE ORDER */}
        <View style={styles.controls}>
          {currentStatus === 'pending' && isMerchant && (
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: theme.text }]}
              onPress={() => statusMutation.mutate('confirmed')}
              disabled={statusMutation.isPending}
            >
              <PackageCheck color={theme.background} size={20} strokeWidth={2.5} />
              <Text style={[styles.mainBtnText, { color: theme.background }]}>CONFIRM & PREPARE</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'confirmed' && isMerchant && (
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: Colors.brand.emerald }]}
              onPress={() => statusMutation.mutate('delivered')}
              disabled={statusMutation.isPending}
            >
              <Truck color="#FFF" size={20} strokeWidth={2.5} />
              <Text style={[styles.mainBtnText, { color: "#FFF" }]}>MARK AS SENT</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'delivered' && !isMerchant && (
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: Colors.brand.emerald }]}
              onPress={() => statusMutation.mutate('completed')}
              disabled={statusMutation.isPending}
            >
              <CheckCircle2 color="#FFF" size={20} strokeWidth={2.5} />
              <Text style={[styles.mainBtnText, { color: "#FFF" }]}>CONFIRM DELIVERY</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'pending' && !isMerchant && (
            <TouchableOpacity 
              style={[styles.cancelBtn, { borderColor: '#EF4444' }]}
              onPress={() => statusMutation.mutate('cancelled')}
              disabled={statusMutation.isPending}
            >
              <XCircle color="#EF4444" size={20} />
              <Text style={styles.cancelBtnText}>CANCEL ORDER</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.securityNote}>
          <ShieldCheck size={14} color={theme.subtext} />
          <Text style={[styles.securityText, { color: theme.subtext }]}>
            Secure Transaction Protected by StoreLink
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { padding: 5 },
  scroll: { padding: 25 },
  statusCard: { padding: 20, borderRadius: 24, marginBottom: 25 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  statusLabel: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5 },
  statusValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 15 },
  productCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  productImg: { width: 60, height: 60, borderRadius: 15, backgroundColor: '#F3F4F6' },
  productName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  productMeta: { fontSize: 11, fontWeight: '700', marginTop: 4, opacity: 0.6 },
  summaryBox: { padding: 20, borderRadius: 24, marginVertical: 25 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  divider: { height: 1, marginVertical: 12 },
  totalLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  totalValue: { fontSize: 20, fontWeight: '900' },
  contactCard: { padding: 20, borderRadius: 24, borderWidth: 1.5, marginBottom: 25 },
  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  contactName: { fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  contactText: { fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10 },
  miniBtn: { flex: 1, height: 52, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  miniBtnText: { fontSize: 13, fontWeight: '900' },
  controls: { marginTop: 10, gap: 12 },
  mainBtn: { height: 75, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 4 },
  mainBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  cancelBtn: { height: 70, borderRadius: 24, borderWidth: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  cancelBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, opacity: 0.6 },
  securityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }
});