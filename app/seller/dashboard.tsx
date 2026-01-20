import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Dimensions, RefreshControl, Platform, View as RNView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ShoppingBag, ShieldCheck, 
  Settings, ArrowLeft, PlusCircle, 
  Zap, ChevronRight, Gem,
  BarChart3, Store, User, Sparkles, Package
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 SELLER DASHBOARD v105.0
 * Purpose: Central command for merchants with Unified Subscription routing.
 * Logic: Real-time stats, inventory management, and financial overview.
 */
export default function SellerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ revenue: 0, productCount: 0, activeOrders: 0 });

  const isDiamond = profile?.subscription_plan === 'diamond';
  const isTrial = profile?.subscription_status === 'trial';

  useEffect(() => {
    fetchStoreData();
  }, [profile?.id]);

  /** 📡 DATA SYNC: Updating store stats */
  const fetchStoreData = async () => {
    if (!profile?.id) return;
    try {
      const [products, sales, active] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', profile.id).eq('is_active', true),
        // ⚠️ Optim: In a real app, use an RPC or edge function for sum to avoid fetching all rows
        supabase.from('orders').select('total_amount').eq('seller_id', profile.id).eq('status', 'completed'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', profile.id).in('status', ['pending', 'confirmed', 'processing'])
      ]);

      const revenue = sales.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setStats({
        revenue,
        productCount: products.count || 0,
        activeOrders: active.count || 0
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
    fetchStoreData();
  }, [profile?.id]);

  if (loading && !refreshing) return (
    <View style={styles.centered}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 🏛️ HEADER: Store Identity */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ArrowLeft size={24} color={theme.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.identityContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
                {profile?.display_name?.toUpperCase() || 'MY STORE'}
              </Text>
              {isDiamond && <Gem size={12} color="#8B5CF6" fill="#8B5CF6" style={{ marginLeft: 4 }} />}
            </View>
            <View style={styles.slugRow}>
              <Text style={[styles.headerSlug, { color: theme.subtext }]}>@{profile?.slug || 'merchant'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
            onPress={() => router.push('/seller/post-product')}
            style={[styles.plusBtn, { backgroundColor: theme.surface }]}
        >
          <PlusCircle size={24} color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
      >
        
        {/* 📉 STORE STATS */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push('/seller/earnings')}
            activeOpacity={0.7}
          >
            <View style={styles.statHeader}>
              <BarChart3 size={14} color={theme.subtext} />
              <Text style={styles.statSub}>TOTAL SALES</Text>
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>₦{stats.revenue.toLocaleString()}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/subscription')} 
            activeOpacity={0.8}
            style={[
                styles.statCard, 
                isDiamond && styles.diamondCard, 
                { backgroundColor: isDiamond ? '#F5F3FF' : theme.surface, borderColor: isDiamond ? '#8B5CF6' : theme.border }
            ]}
          >
            <View style={styles.statHeader}>
              {isDiamond ? <Sparkles size={14} color="#8B5CF6" /> : <Store size={14} color={theme.subtext} />}
              <Text style={[styles.statSub, isDiamond && { color: '#8B5CF6' }]}>STORE PLAN</Text>
            </View>
            <Text style={[styles.statValue, { color: isDiamond ? '#8B5CF6' : theme.text }]}>
              {isTrial ? 'TRIAL' : (profile?.subscription_plan?.toUpperCase() || 'BASIC')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🛠️ STORE TOOLS */}
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Store Controls</Text>
        <View style={styles.menuList}>
          
          <NavTile 
            icon={ShoppingBag} 
            label="Manage Orders" 
            sub={`${stats.activeOrders} Active Order${stats.activeOrders !== 1 ? 's' : ''}`} 
            color="#3B82F6" 
            badge={stats.activeOrders}
            onPress={() => router.push('/seller/orders')} 
            theme={theme}
          />

          <NavTile 
            icon={Package} 
            label="Inventory" 
            sub={`${stats.productCount} Product${stats.productCount !== 1 ? 's' : ''} Listed`} 
            color="#10B981" 
            badge={0}
            onPress={() => router.push('/seller/inventory')} 
            theme={theme}
          />

          <NavTile 
            icon={Zap} 
            label="Store Rewards" 
            sub="Manage coin rewards for buyers" 
            color="#F59E0B" 
            badge={0}
            onPress={() => router.push('/seller/loyalty')} 
            theme={theme}
          />

          <NavTile 
            icon={ShieldCheck} 
            label="Verification" 
            sub="Get your verified badge" 
            color={Colors.brand.emerald} 
            badge={0}
            onPress={() => router.push('/seller/verification')} 
            theme={theme}
          />

          <NavTile 
            icon={Settings} 
            label="Edit Shop Profile" 
            sub="Update logo, name, and bio" 
            color="#6B7280" 
            badge={0}
            onPress={() => router.push('/profile/edit')} 
            theme={theme}
          />
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.visitBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push(`/profile/${profile?.id}` as any)}
        >
          <User size={18} color={theme.subtext} />
          <Text style={[styles.visitText, { color: theme.subtext }]}>PREVIEW MY STORE</Text>
          <ChevronRight size={16} color={theme.border} strokeWidth={3} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// 🧩 OPTIMIZED COMPONENT
const NavTile = React.memo(({ icon: Icon, label, sub, onPress, color, badge, theme }: any) => (
  <TouchableOpacity 
    activeOpacity={0.7}
    style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]} 
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
  >
    <View style={[styles.tileIcon, { backgroundColor: `${color}15` }]}>
      <Icon size={22} color={color} strokeWidth={2.5} />
    </View>
    <View style={styles.tileText}>
      <View style={styles.labelRow}>
        <Text style={[styles.tileLabel, { color: theme.text }]}>{label}</Text>
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tileSub, { color: theme.subtext }]}>{sub}</Text>
    </View>
    <ChevronRight size={14} color={theme.border} strokeWidth={3} />
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
  identityContainer: { justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  slugRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, maxWidth: 200 },
  headerSlug: { fontSize: 10, fontWeight: '700', opacity: 0.5 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  plusBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { padding: 25 },
  
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 40 },
  statCard: { flex: 1, padding: 22, borderRadius: 28, borderWidth: 1.5, minHeight: 110, justifyContent: 'space-between' },
  diamondCard: { shadowColor: '#8B5CF6', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statSub: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5 },
  statValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  
  sectionTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase', opacity: 0.6 },
  menuList: { gap: 12 },
  
  tile: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 26, borderWidth: 1.5 },
  tileIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  tileText: { flex: 1, marginLeft: 15 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tileLabel: { fontSize: 15, fontWeight: '900' },
  tileSub: { fontSize: 11, fontWeight: '600', marginTop: 3, opacity: 0.6 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '900' },
  
  visitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 50, padding: 22, borderRadius: 28, borderWidth: 1.5 },
  visitText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});