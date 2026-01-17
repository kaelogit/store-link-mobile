import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Gem, TrendingUp, 
  TrendingDown, History, ShieldCheck 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 WALLET HUB v77.1 (Pure Build)
 * Audited: Section VI Economic Ledger & Ledger Supremacy.
 */
export default function WalletScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLedgerData();
  }, [profile?.id]);

  /**
   * 📡 LEDGER SYNC
   * Fetches the immutable transaction registry for this identity.
   */
  const fetchLedgerData = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (e) {
      console.error("Ledger Sync Failure:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    refreshUserData();
    fetchLedgerData();
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const isEarn = item.type === 'EARN' || item.type === 'REFUND';
    
    return (
      <View style={[styles.transactionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.iconBox, { backgroundColor: isEarn ? '#10B98115' : '#EF444415' }]}>
          {isEarn ? <TrendingUp size={18} color="#10B981" /> : <TrendingDown size={18} color="#EF4444" />}
        </View>
        
        <View style={styles.txInfo}>
          <Text style={[styles.txType, { color: theme.text }]}>{item.type}</Text>
          <Text style={[styles.txHash, { color: theme.subtext }]} numberOfLines={1}>
            HASH: {item.transaction_hash.slice(0, 16)}...
          </Text>
        </View>

        <View style={styles.txAmount}>
          <Text style={[styles.amountText, { color: isEarn ? '#10B981' : theme.text }]}>
            {isEarn ? '+' : ''}{item.amount}
          </Text>
          <Text style={[styles.txDate, { color: theme.subtext }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🛡️ HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>ECONOMIC LEDGER</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
        ListHeaderComponent={() => (
          <View style={styles.topSection}>
            <View style={[styles.balanceCard, { backgroundColor: theme.text }]}>
              <View style={styles.balanceHeader}>
                <Gem size={16} color={theme.background} />
                <Text style={[styles.balanceLabel, { color: theme.background }]}>STORELINK COINS</Text>
              </View>
              <Text style={[styles.balanceValue, { color: theme.background }]}>
                {profile?.coin_balance?.toLocaleString() || 0}
              </Text>
              <View style={styles.integrityBadge}>
                <ShieldCheck size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.integrityText}>LEDGER VERIFIED</Text>
              </View>
            </View>
            
            <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Transaction Registry</Text>
          </View>
        )}
        renderItem={renderTransaction}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <History size={40} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>NO TRANSACTIONS RECORDED</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 60 : 20, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },
  topSection: { padding: 25 },
  balanceCard: { padding: 30, borderRadius: 32, marginBottom: 35 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.8 },
  balanceLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  balanceValue: { fontSize: 42, fontWeight: '900', marginTop: 10, letterSpacing: -1 },
  integrityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, opacity: 0.6 },
  integrityText: { fontSize: 8, fontWeight: '900', color: 'white', letterSpacing: 1 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', padding: 18, marginHorizontal: 25, borderRadius: 24, marginBottom: 12, borderWidth: 1.5 },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, marginLeft: 15 },
  txType: { fontSize: 14, fontWeight: '900' },
  txHash: { fontSize: 9, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  txAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: '900' },
  txDate: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  empty: { padding: 100, alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }
});