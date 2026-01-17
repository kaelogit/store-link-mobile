import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Dimensions, RefreshControl, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ShoppingBag, ShieldCheck, 
  Settings, ArrowLeft, PlusCircle, 
  Zap, ChevronRight, CreditCard, Gem
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 MERCHANT DASHBOARD v101.3 (Pure Build)
 * Audited: Section IV Commercial Integrity & Section VI Economic Ledger.
 * Hardened: Sovereign Logistics Removal & TSC Platform Fix.
 */
export default function SellerDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ revenue: 0, productCount: 0, activeOrders: 0 });

  const isDiamond = profile?.prestige_weight === 3;

  useEffect(() => {
    fetchBusinessData();
  }, [profile?.id]);

  /**
   * 📡 BUSINESS DATA SYNC
   * Aggregates live registry data and verified revenue from completed handshakes.
   */
  const fetchBusinessData = async () => {
    if (!profile?.id) return;
    try {
      // 1. Live Product Count (Registry Section II)
      const { count: prodCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', profile.id)
        .eq('is_active', true);

      // 2. Verified Revenue (Manifest Section IV - Completed Only)
      const { data: completedOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('seller_id', profile.id)
        .eq('status', 'completed');

      // 3. Active Handshakes (Pending/Confirmed)
      const { count: activeCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', profile.id)
        .in('status', ['pending', 'confirmed']);

      const revenue = completedOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setStats({
        revenue,
        productCount: prodCount || 0,
        activeOrders: activeCount || 0
      });
    } catch (e) {
      console.error("Dashboard Sync Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshUserData();
    fetchBusinessData();
  }, [profile?.id]);

  const NavTile = ({ icon: Icon, label, sub, onPress, color, badge }: any) => (
    <TouchableOpacity 
      style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]} 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={[styles.tileIcon, { backgroundColor: color + '15' }]}>
        <Icon size={22} color={color} strokeWidth={2.5} />
      </View>
      <View style={styles.tileText}>
        <View style={styles.labelRow}>
          <Text style={[styles.tileLabel, { color: theme.text }]}>{label}</Text>
          {badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tileSub, { color: theme.subtext }]}>{sub}</Text>
      </View>
      <ChevronRight size={14} color={theme.border} strokeWidth={3} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) return (
    <View style={styles.centered}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🏛️ MERCHANT HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MERCHANT DASHBOARD</Text>
        <TouchableOpacity onPress={() => router.push('/seller/post-product')}>
          <PlusCircle size={26} color={Colors.brand.emerald} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
      >
        
        {/* 📉 PERFORMANCE SNAPSHOT */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.statSub}>VERIFIED SALES</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>₦{stats.revenue.toLocaleString()}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/seller/subscription')}
            style={[styles.statCard, { backgroundColor: isDiamond ? '#F5F3FF' : theme.surface, borderColor: isDiamond ? '#8B5CF6' : theme.border }]}
          >
            <View style={styles.row}>
              <Text style={[styles.statSub, isDiamond && { color: '#8B5CF6' }]}>PRESTIGE TIER</Text>
              {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />}
            </View>
            <Text style={[styles.statValue, { color: isDiamond ? '#8B5CF6' : theme.text }]}>
              {profile?.subscription_plan?.toUpperCase() || 'NONE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🛠️ STORE TOOLS */}
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Store Tools</Text>
        <View style={styles.menuList}>
          <NavTile 
            icon={ShoppingBag} 
            label="Order Processing" 
            sub="Fulfillment and tracking" 
            color="#3B82F6" 
            badge={stats.activeOrders}
            onPress={() => router.push('/seller/orders')} 
          />
          {/* 🛡️ LOGISTICS HUB REMOVED: Section IV Sovereign Negotiation Protocol */}
          <NavTile 
            icon={Zap} 
            label="Coin Incentives" 
            sub="Buyer reward protocol" 
            color="#F59E0B" 
            onPress={() => router.push('/seller/loyalty')} 
          />
          <NavTile 
            icon={CreditCard} 
            label="Account & Billing" 
            sub="Tier and prestige status" 
            color="#8B5CF6" 
            onPress={() => router.push('/seller/subscription')} 
          />
          <NavTile 
            icon={ShieldCheck} 
            label="Trust Verification" 
            sub="Identity verification" 
            color={Colors.brand.emerald} 
            onPress={() => router.push('/seller/verification')} 
          />
          <NavTile 
            icon={Settings} 
            label="Shop Configuration" 
            sub="Public brand profile" 
            color="#6B7280" 
            onPress={() => router.push('/seller/settings')} 
          />
        </View>

        <TouchableOpacity 
          style={[styles.visitBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push(`/profile/${profile?.id}`)}
        >
          <Text style={[styles.visitText, { color: theme.subtext }]}>PREVIEW PUBLIC SHOP</Text>
          <ChevronRight size={16} color={theme.border} strokeWidth={3} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 10 : 45, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { padding: 25 },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 35 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1.5 },
  statSub: { fontSize: 8, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5 },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase' },
  menuList: { gap: 12 },
  tile: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1.5 },
  tileIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  tileText: { flex: 1, marginLeft: 15, backgroundColor: 'transparent' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent' },
  tileLabel: { fontSize: 14, fontWeight: '800' },
  tileSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  badge: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
  visitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 45, padding: 22, borderRadius: 26, borderWidth: 1.5 },
  visitText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent' }
});