import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Switch, RefreshControl, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 💰 REWARDS SETTINGS v79.0
 * Purpose: Allows sellers to manage their customer reward program.
 * Language: Simple English so every shop owner understands their stats.
 */
export default function LoyaltyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ issued: 0, redeemed: 0, customers: 0 });

  useEffect(() => { 
    fetchRewardData(); 
  }, [profile?.id]);

  /**
   * 📡 Load reward info
   * This pulls the total coins you've given out and how many customers have used them.
   */
  const fetchRewardData = async () => {
    if (!profile?.id) return;
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("total_amount, coin_redeemed, user_id")
        .eq("seller_id", profile.id)
        .eq("status", "confirmed"); 

      if (error) throw error;

      if (orders) {
        const redeemed = orders.reduce((sum, o) => sum + (Number(o.coin_redeemed) || 0), 0);
        const currentRate = (profile?.loyalty_percentage || 0) / 100;
        const issued = orders.reduce((sum, o) => sum + (o.total_amount * currentRate), 0);
        const uniqueCustomers = new Set(orders.map(o => o.user_id)).size;
        
        setStats({ redeemed, issued, customers: uniqueCustomers });
      }
    } catch (e) {
      console.error("Could not load rewards:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggle = async (val: boolean) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ loyalty_enabled: val })
        .eq('id', profile?.id);
      
      if (error) throw error;
      await refreshUserData();
    } catch (e) {
      console.error("Update error:", e);
    } finally {
      setSaving(false);
    }
  };

  const updatePercentage = async (percent: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ loyalty_percentage: percent })
        .eq('id', profile?.id);
      
      if (error) throw error;
      await refreshUserData();
      fetchRewardData();
    } catch (e) {
      console.error("Rate update error:", e);
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRewardData();
  }, [profile?.id]);

  if (loading && !refreshing) return (
    <View style={styles.centered}>
      <ActivityIndicator color="#F59E0B" size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER - Safe Area Protected */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top || 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>STORE REWARDS</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
      >
        {/* REWARD STATS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>₦{stats.issued.toLocaleString()}</Text>
            <Text style={styles.statLabel}>COINS GIVEN</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statValue, { color: Colors.brand.emerald }]}>₦{stats.redeemed.toLocaleString()}</Text>
            <Text style={styles.statLabel}>COINS USED</Text>
          </View>
        </View>

        {/* SETTINGS CARD */}
        <View style={[styles.mainCard, { backgroundColor: theme.surface, borderColor: theme.border }, profile?.loyalty_enabled && { borderColor: '#F59E0B' }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Reward Program</Text>
              <Text style={[styles.cardSub, { color: theme.subtext }]}>
                Give customers coins they can use as a discount on their next order from your shop.
              </Text>
            </View>
            <Switch 
              value={profile?.loyalty_enabled} 
              onValueChange={handleToggle}
              disabled={saving}
              trackColor={{ true: '#F59E0B', false: theme.border }}
              thumbColor={Platform.OS === 'ios' ? undefined : profile?.loyalty_enabled ? '#FFF' : '#F4F3F4'}
            />
          </View>

          {profile?.loyalty_enabled && (
            <View style={[styles.percentageSection, { borderTopColor: theme.border }]}>
              <Text style={[styles.sectionLabel, { color: theme.subtext }]}>CHOOSE REWARD PERCENTAGE</Text>
              <View style={styles.btnRow}>
                {[1, 2, 5].map((p) => (
                  <TouchableOpacity 
                    key={p} 
                    onPress={() => updatePercentage(p)}
                    disabled={saving}
                    style={[
                      styles.pBtn, 
                      { backgroundColor: theme.background, borderColor: theme.border }, 
                      profile?.loyalty_percentage === p && { backgroundColor: theme.text, borderColor: theme.text }
                    ]}
                  >
                    <Text style={[
                      styles.pBtnText, 
                      { color: theme.subtext }, 
                      profile?.loyalty_percentage === p && { color: theme.background }
                    ]}>{p}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.yieldNote}>
                <Zap size={10} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.yieldText}>Customers get {profile?.loyalty_percentage}% of their total order back in coins.</Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.infoBox, { backgroundColor: Colors.brand.emerald + '15' }]}>
           <ShieldCheck color={Colors.brand.emerald} size={20} strokeWidth={2.5} />
           <Text style={[styles.infoText, { color: theme.text }]}>
             Shops that offer rewards usually see more repeat customers.
           </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    alignItems: 'center', 
    borderBottomWidth: 1.5 
  },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  scrollContent: { padding: 25 },
  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 30, backgroundColor: 'transparent' },
  statCard: { flex: 1, padding: 22, borderRadius: 28, borderWidth: 1.5 },
  statValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 8, fontWeight: '900', color: '#9CA3AF', marginTop: 8, letterSpacing: 1.2 },
  mainCard: { padding: 30, borderRadius: 36, borderWidth: 1.5 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  cardSub: { fontSize: 13, marginTop: 6, fontWeight: '500', lineHeight: 20 },
  percentageSection: { marginTop: 35, borderTopWidth: 1, paddingTop: 30, backgroundColor: 'transparent' },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 12 },
  pBtn: { flex: 1, height: 64, borderRadius: 22, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  pBtnText: { fontSize: 18, fontWeight: '900' },
  yieldNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 },
  yieldText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  infoBox: { flexDirection: 'row', gap: 15, padding: 22, borderRadius: 28, marginTop: 35, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20 }
});