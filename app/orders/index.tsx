import React, { useCallback, useMemo } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Package, ChevronRight, CheckCircle2, 
  Clock, PackageCheck, Zap, Truck, AlertCircle
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
 * 🏰 ORDER HISTORY v110.0
 * Purpose: A high-speed list of all items the user has purchased.
 * Features: Real-time status tracking and simple confirmation for received items.
 */
export default function OrderHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser } = useUserStore();
  const queryClient = useQueryClient();

  /** 📡 DATA SYNC: Fetching your order history */
  const { 
    data: orders = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['my-orders', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          merchant:seller_id (
            display_name,
            logo_url,
            subscription_plan
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Pre-load logos for smoother scrolling
      data?.slice(0, 10).forEach(o => {
        if (o.merchant?.logo_url) Image.prefetch(o.merchant.logo_url);
      });

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  /** 🛡️ ORDER COMPLETION PROCESS */
  const confirmMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // 1. Update the official order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);
      
      if (orderError) throw orderError;

      // 2. Sync the status in the chat conversation
      await supabase
        .from('conversations')
        .update({ deal_status: 'completed' })
        .eq('order_id', orderId); 
    },
    onMutate: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });
    },
    onError: () => {
      Alert.alert("Error", "Could not confirm delivery. Please check your connection.");
    }
  });

  const handleConfirmReceipt = (orderId: string) => {
    Alert.alert(
      "Confirm Delivery",
      "By clicking confirm, you agree that you have received your items. This will complete the order.",
      [
        { text: "Not Yet", style: "cancel" },
        { text: "YES, RECEIVED", onPress: () => confirmMutation.mutate(orderId) }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const renderOrder = useCallback(({ item }: { item: any }) => {
    const isPending = item.status === 'pending';
    const isSent = item.status === 'delivered'; 
    const merchant = item.merchant;
    const isDiamond = merchant?.subscription_plan === 'diamond';

    return (
      <View style={[styles.orderCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => router.push(`/orders/${item.id}` as any)}
          style={[styles.cardHeader, { borderBottomColor: theme.surface }]}
        >
          <View style={[
            styles.merchantAvatar, 
            { backgroundColor: theme.surface },
            isDiamond && { borderColor: '#8B5CF6', borderWidth: 2 }
          ]}>
            <Image 
              source={merchant?.logo_url || 'https://via.placeholder.com/150'} 
              style={styles.logo} 
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12, backgroundColor: 'transparent' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'transparent' }}>
              <Text style={[styles.merchantName, { color: theme.text }]}>
                {merchant?.display_name?.toUpperCase() || 'STORE'}
              </Text>
              {isDiamond && <Zap size={10} color="#8B5CF6" fill="#8B5CF6" />}
            </View>
            <Text style={[styles.orderDate, { color: theme.subtext }]}>
              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <View style={{ backgroundColor: 'transparent' }}>
            <Text style={styles.priceLabel}>TOTAL PRICE</Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>₦{item.total_amount.toLocaleString()}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.receiptBtn, { backgroundColor: theme.surface }]}
            onPress={() => router.push(`/orders/${item.id}` as any)}
          >
            <Text style={[styles.receiptText, { color: theme.text }]}>VIEW DETAILS</Text>
            <ChevronRight size={14} color={theme.text} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {isSent && (
          <TouchableOpacity 
            style={[styles.completeBtn, { backgroundColor: theme.text }]} 
            onPress={() => handleConfirmReceipt(item.id)}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <>
                <PackageCheck size={18} color={theme.background} />
                <Text style={[styles.completeText, { color: theme.background }]}>I HAVE RECEIVED THIS ORDER</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isPending && (
          <View style={[styles.waitingNotice, { backgroundColor: theme.surface }]}>
            <Clock size={14} color="#F59E0B" />
            <Text style={[styles.waitingText, { color: theme.text }]}>Waiting for the store to confirm...</Text>
          </View>
        )}
      </View>
    );
  }, [theme, confirmMutation.isPending]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>ORDER HISTORY</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => `history-${item.id}`}
        renderItem={renderOrder}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh} 
            tintColor={Colors.brand.emerald} 
          />
        }
        
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}

        ListEmptyComponent={() => {
          if (isLoading) return null;
          return (
            <View style={styles.empty}>
              <Package size={48} color={theme.border} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>NO ORDERS YET</Text>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>All your purchases will appear here.</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const stylesMap: any = {
    pending: { bg: '#FFFBEB', text: '#F59E0B', label: 'PENDING', icon: Clock },
    confirmed: { bg: '#F5F3FF', text: '#8B5CF6', label: 'PREPARING', icon: PackageCheck },
    delivered: { bg: '#EFF6FF', text: '#3B82F6', label: 'SENT', icon: Truck },
    completed: { bg: '#ECFDF5', text: '#10B981', label: 'RECEIVED', icon: CheckCircle2 },
    cancelled: { bg: '#FEF2F2', text: '#EF4444', label: 'CANCELLED', icon: AlertCircle }
  };
  const current = stylesMap[status] || stylesMap.pending;
  const Icon = current.icon;

  return (
    <View style={[badgeStyles.container, { backgroundColor: current.bg }]}>
      <Icon size={10} color={current.text} style={{marginRight: 4}} />
      <Text style={[badgeStyles.text, { color: current.text }]}>{current.label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  container: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  text: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  list: { padding: 20 },
  orderCard: { borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1 },
  merchantAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  merchantName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  orderDate: { fontSize: 10, fontWeight: '700', marginTop: 2, opacity: 0.6 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 5, backgroundColor: 'transparent' },
  priceLabel: { fontSize: 8, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1 },
  priceValue: { fontSize: 22, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  receiptText: { fontSize: 10, fontWeight: '900' },
  completeBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 10 },
  completeText: { fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  waitingNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 12, borderRadius: 14 },
  waitingText: { fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', marginTop: 120 },
  emptyTitle: { fontSize: 14, fontWeight: '900', marginTop: 20, letterSpacing: 1 },
  emptyText: { marginTop: 8, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, opacity: 0.6 }
});