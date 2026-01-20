import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Clock, CheckCircle2, 
  ChevronRight, Headphones, CreditCard,
  ArrowUpRight
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

// 💎 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 EARNINGS DASHBOARD v1.2
 * Features: 1H Timer Monitoring + Fast-Track Support + Payout History.
 */
export default function EarningsDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  /** 📡 DATA SYNC: Wired to 1-hour timer and Lifetime Stats */
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['seller-earnings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { lifetime: 0, inWaitingRoom: 0, recentPayouts: [] };

      // 1. Get Paid Totals via RPC
      const { data: paid } = await supabase.rpc('get_seller_payout_stats', { 
        p_seller_id: profile.id 
      });

      // 2. Get Pending (The 1-Hour Waiting Room)
      const { data: pending } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('seller_id', profile.id)
        .eq('status', 'completed')
        .eq('payout_status', 'pending');

      // 3. Get Recent Payout History
      const { data: history } = await supabase
        .from('payouts') // Changed from 'cash_transactions' to match detail view
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const pendingSum = pending?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;
      
      return {
        lifetime: paid?.lifetime_earned || 0,
        inWaitingRoom: pendingSum,
        recentPayouts: history || []
      };
    },
    enabled: !!profile?.id
  });

  const handleSupportFastTrack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/activity/support-new',
      params: { 
        category: 'PAYMENT', 
        subject: 'PAYOUT DELAY: 1H TIMER EXCEEDED',
        refId: 'LATEST_PENDING_BATCH'
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* 📱 HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={28} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>EARNINGS</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.brand.emerald} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 🟢 LIFETIME CARD */}
        <View style={[styles.mainCard, { backgroundColor: theme.text }]}>
          <Text style={[styles.mainLabel, { color: theme.background, opacity: 0.7 }]}>LIFETIME EARNINGS</Text>
          <Text 
            style={[styles.mainAmount, { color: theme.background }]} 
            adjustsFontSizeToFit 
            numberOfLines={1}
          >
            ₦{stats?.lifetime.toLocaleString() || '0'}
          </Text>
          <View style={styles.badgeRow}>
             <View style={styles.verifiedBadge}>
                <CheckCircle2 size={12} color="#10B981" strokeWidth={3} />
                <Text style={styles.verifiedText}>AUDITED BY PAYSTACK</Text>
             </View>
          </View>
        </View>

        {/* 🟠 THE 1-HOUR WAITING ROOM (Fast-Track Wired) */}
        <Text style={styles.sectionLabel}>PROCESSING</Text>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={handleSupportFastTrack}
          style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.cardInfo}>
            <Clock size={24} color="#F59E0B" />
            <View>
              <Text style={[styles.statusLabel, { color: theme.subtext }]}>1H TIMER ACTIVE</Text>
              <Text style={[styles.statusValue, { color: theme.text }]}>₦{stats?.inWaitingRoom.toLocaleString() || '0'}</Text>
            </View>
          </View>
          
          <View style={styles.helpBadge}>
             <Headphones size={14} color={Colors.brand.emerald} />
             <Text style={[styles.helpText, { color: Colors.brand.emerald }]}>GET HELP</Text>
          </View>
        </TouchableOpacity>

        {/* 📋 RECENT PAYOUTS LIST */}
        <Text style={styles.sectionLabel}>RECENT PAYOUTS</Text>
        {stats?.recentPayouts.map((tx: any) => (
          <TouchableOpacity 
            key={tx.id} 
            style={[styles.payoutRow, { borderBottomColor: theme.border }]}
            onPress={() => router.push({ pathname: '/payout/[id]', params: { id: tx.id } })}
          >
            <View style={styles.payoutLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <ArrowUpRight size={18} color={theme.text} />
              </View>
              <View>
                <Text style={[styles.payoutAmount, { color: theme.text }]}>₦{tx.amount.toLocaleString()}</Text>
                <Text style={[styles.payoutDate, { color: theme.subtext }]}>
                  {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                </Text>
              </View>
            </View>
            <View style={styles.payoutRight}>
               <Text style={styles.paidLabel}>PAID</Text>
            </View>
          </TouchableOpacity>
        ))}

        {stats?.recentPayouts.length === 0 && (
          <View style={styles.emptyPayouts}>
            <CreditCard size={40} color={theme.border} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>No payouts sent yet</Text>
          </View>
        )}
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  scroll: { padding: 25 },
  
  mainCard: { padding: 30, borderRadius: 32, marginBottom: 35 },
  mainLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  mainAmount: { fontSize: 42, fontWeight: '900', marginTop: 10, letterSpacing: -1 },
  
  badgeRow: { flexDirection: 'row', marginTop: 20 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  verifiedText: { fontSize: 9, fontWeight: '900', color: '#10B981' },
  
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 24, borderWidth: 1.5, marginBottom: 35 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  statusLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statusValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  
  helpBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${Colors.brand.emerald}15`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  helpText: { fontSize: 9, fontWeight: '900' },
  
  payoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1 },
  payoutLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  payoutAmount: { fontSize: 15, fontWeight: '900' },
  payoutDate: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  
  payoutRight: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paidLabel: { fontSize: 9, fontWeight: '900', color: '#10B981' },
  
  emptyPayouts: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },
  emptyText: { fontSize: 12, fontWeight: '800', marginTop: 15 }
});