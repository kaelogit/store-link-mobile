import React, { useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Gem, TrendingUp, 
  TrendingDown, History, ShieldCheck,
  Zap, Receipt
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 WALLET SCREEN v79.0
 * Purpose: Secure and clear tracking of coins and transactions.
 * Visual: High-fidelity transaction list with clear money flow indicators.
 */
export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  const queryClient = useQueryClient();

  /** 📡 TRANSACTION SYNC */
  const { 
    data: transactions = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['wallet-transactions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('coin_transactions')
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

  const renderTransaction = ({ item }: { item: any }) => {
    const isEarn = item.type === 'EARN' || item.type === 'REFUND';
    
    return (
      <View style={[styles.transactionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.iconBox, { backgroundColor: isEarn ? '#ECFDF5' : '#FEF2F2' }]}>
          {isEarn ? (
            <TrendingUp size={18} color="#10B981" strokeWidth={3} />
          ) : (
            <TrendingDown size={18} color="#EF4444" strokeWidth={3} />
          )}
        </View>
        
        <View style={styles.txInfo}>
          <Text style={[styles.txType, { color: theme.text }]}>
            {item.type.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={[styles.txHash, { color: theme.subtext }]}>
            TRANSACTION ID: {item.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>

        <View style={styles.txAmount}>
          <Text style={[styles.amountText, { color: isEarn ? '#10B981' : theme.text }]}>
            {isEarn ? '+' : '-'} ₦{item.amount.toLocaleString()}
          </Text>
          <Text style={[styles.txDate, { color: theme.subtext }]}>
            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading && transactions.length === 0) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={styles.loaderText}>UPDATING BALANCE...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={28} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MY WALLET</Text>
        <View style={{ width: 44 }} />
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
            <LinearGradient
              colors={['#111827', '#1F2937']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceHeader}>
                <View style={styles.gemHalo}>
                   <Gem size={18} color="#8B5CF6" fill="#8B5CF6" />
                </View>
                <Text style={styles.balanceLabel}>STORE COINS</Text>
              </View>
              
              <Text style={styles.balanceValue}>
                ₦{profile?.coin_balance?.toLocaleString() || 0}
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.integrityBadge}>
                  <ShieldCheck size={14} color="#10B981" strokeWidth={3} />
                  <Text style={styles.integrityText}>SECURE BALANCE</Text>
                </View>
                <Zap size={16} color="rgba(255,255,255,0.2)" />
              </View>
            </LinearGradient>
            
            <View style={styles.sectionHeader}>
               <Receipt size={14} color={theme.subtext} />
               <Text style={[styles.sectionTitle, { color: theme.subtext }]}>PAST TRANSACTIONS</Text>
            </View>
          </View>
        )}
        renderItem={renderTransaction}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.surface }]}>
               <History size={40} color={theme.border} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyText, { color: theme.subtext }]}>NO TRANSACTIONS YET</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  scrollContent: { paddingBottom: 100 },
  topSection: { padding: 25 },
  balanceCard: { padding: 35, borderRadius: 40, marginBottom: 40, elevation: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gemHalo: { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center' },
  balanceLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: 'rgba(255,255,255,0.6)' },
  balanceValue: { fontSize: 48, fontWeight: '900', marginTop: 15, letterSpacing: -1.5, color: 'white' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 },
  integrityBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  integrityText: { fontSize: 9, fontWeight: '900', color: '#10B981', letterSpacing: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', padding: 20, marginHorizontal: 25, borderRadius: 28, marginBottom: 15, borderWidth: 1.5 },
  iconBox: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, marginLeft: 15 },
  txType: { fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  txHash: { fontSize: 8, fontWeight: '800', marginTop: 4, letterSpacing: 0.5, opacity: 0.4 },
  txAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  txDate: { fontSize: 10, fontWeight: '800', marginTop: 4, opacity: 0.5 },
  empty: { flex: 1, alignItems: 'center', marginTop: 80, gap: 20 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.5 }
});