import React, { useCallback, useState } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Gem, TrendingUp, 
  TrendingDown, History, ShieldCheck,
  Zap, Receipt, Wallet as WalletIcon, ArrowUpRight
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics'; // 🛠️ FIXED IMPORT
import { LinearGradient } from 'expo-linear-gradient';

// 💎 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

// 🛠️ ADDED MISSING COMPONENT
const EmptyHistory = ({ theme }: { theme: any }) => (
  <View style={styles.emptyContainer}>
    <History size={48} color={theme.border} />
    <Text style={[styles.emptyText, { color: theme.subtext }]}>NO TRANSACTIONS YET</Text>
  </View>
);

/**
 * 🏰 UNIFIED WALLET v85.0
 * Purpose: Secure tracking of both Cash (Escrow/Refunds) and Store Coins.
 */
export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  // Toggle between viewing 'CASH' and 'COINS'
  const [activeType, setActiveType] = useState<'CASH' | 'COINS'>('CASH');

  /** 📡 TRANSACTION SYNC: Fetches both Cash and Coin movements */
  const { 
    data: transactions = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['wallet-history', profile?.id, activeType],
    queryFn: async () => {
      if (!profile?.id) return [];
      const table = activeType === 'COINS' ? 'coin_transactions' : 'cash_transactions';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshUserData();
    refetch();
  }, [refetch, refreshUserData]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MY WALLET</Text>
        <View style={{ width: 34 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => `tx-${item.id}`}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
        ListHeaderComponent={() => (
          <View style={styles.topSection}>
            {/* 💳 DUAL BALANCE CARD */}
            <LinearGradient
              colors={activeType === 'CASH' ? ['#065F46', '#064E3B'] : ['#111827', '#1F2937']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceHeader}>
                <View style={[styles.halo, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  {activeType === 'CASH' ? (
                    <WalletIcon size={18} color="white" />
                  ) : (
                    <Gem size={18} color="#8B5CF6" fill="#8B5CF6" />
                  )}
                </View>
                <Text style={styles.balanceLabel}>
                  {activeType === 'CASH' ? 'AVAILABLE CASH' : 'STORE COINS'}
                </Text>
              </View>
              
              <Text style={styles.balanceValue}>
                {activeType === 'CASH' ? '₦' : ''}
                {activeType === 'CASH' 
                  ? (profile?.escrow_balance || 0).toLocaleString() 
                  : (profile?.coin_balance || 0).toLocaleString()}
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.integrityBadge}>
                  <ShieldCheck size={14} color="#10B981" strokeWidth={3} />
                  <Text style={styles.integrityText}>SECURE BALANCE</Text>
                </View>
                {activeType === 'CASH' && (
                  <TouchableOpacity 
                    style={styles.withdrawBtn}
                    onPress={() => router.push('/wallet/withdraw')}
                  >
                    <Text style={styles.withdrawText}>WITHDRAW</Text>
                    <ArrowUpRight size={14} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>

            {/* 🔀 TYPE SWITCHER */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                onPress={() => setActiveType('CASH')} // 🛠️ FIXED: activeType
                style={[styles.tab, activeType === 'CASH' && { backgroundColor: theme.text, borderColor: theme.text }]}
              >
                <Text style={[styles.tabText, { color: activeType === 'CASH' ? theme.background : theme.subtext }]}>CASH</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setActiveType('COINS')} // 🛠️ FIXED: activeType
                style={[styles.tab, activeType === 'COINS' && { backgroundColor: theme.text, borderColor: theme.text }]}
              >
                <Text style={[styles.tabText, { color: activeType === 'COINS' ? theme.background : theme.subtext }]}>COINS</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.sectionHeader}>
               <Receipt size={14} color={theme.subtext} />
               <Text style={[styles.sectionTitle, { color: theme.subtext }]}>PAYMENT HISTORY</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow item={item} theme={theme} activeType={activeType} />
        )}
        ListEmptyComponent={<EmptyHistory theme={theme} />}
      />
    </View>
  );
}

const TransactionRow = ({ item, theme, activeType }: any) => {
  const isEarn = item.type === 'EARN' || item.type === 'REFUND' || item.type === 'PAYOUT' || item.type === 'ESCROW_RELEASE';
  return (
    <View style={[styles.transactionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: isEarn ? '#ECFDF5' : '#FEF2F2' }]}>
        {isEarn ? <TrendingUp size={18} color="#10B981" strokeWidth={3} /> : <TrendingDown size={18} color="#EF4444" strokeWidth={3} />}
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txType, { color: theme.text }]}>{item.type.replace('_', ' ').toUpperCase()}</Text>
        <Text style={[styles.txHash, { color: theme.subtext }]}>ID: {item.id.slice(0, 8).toUpperCase()}</Text>
      </View>
      <View style={styles.txAmount}>
        <Text style={[styles.amountText, { color: isEarn ? '#10B981' : theme.text }]}>
          {isEarn ? '+' : '-'} {activeType === 'CASH' ? '₦' : ''}{item.amount.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { padding: 8 },
  
  scrollContent: { paddingHorizontal: 20 },
  topSection: { marginBottom: 10 },
  
  balanceCard: { padding: 30, borderRadius: 36, marginBottom: 25 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  halo: { width: 36, height: 36, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  balanceLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  balanceValue: { fontSize: 42, fontWeight: '900', marginTop: 15, color: 'white', letterSpacing: -1 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 },
  integrityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  integrityText: { fontSize: 9, fontWeight: '900', color: '#10B981', letterSpacing: 0.5 },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  withdrawText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  tabContainer: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  tab: { flex: 1, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)' },
  tabText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  transactionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  txInfo: { flex: 1 },
  txType: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  txHash: { fontSize: 10, fontWeight: '600' },
  txAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 14, fontWeight: '900' },
  
  emptyContainer: { padding: 40, alignItems: 'center', opacity: 0.6 },
  emptyText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 }
});