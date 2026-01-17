import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, RefreshControl, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Crown, Check, Clock, 
  ShieldCheck, Gem, AlertTriangle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { PaystackTerminal } from '../../src/components/PaystackTerminal';

/**
 * 🏰 ACCOUNT PLANS v109.1 (Pure Build)
 * Audited: Section I Prestige Seeding & Section III 15/5 Protocol.
 */
export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [activeSelection, setActiveSelection] = useState<{plan: 'standard' | 'diamond', price: number} | null>(null);

  useEffect(() => { 
    if (profile) setLoading(false);
    fetchUserAuth();
  }, [profile]);

  const fetchUserAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserEmail(user.email);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUserData();
    setRefreshing(false);
  }, []);

  const openPaymentGateway = (plan: 'standard' | 'diamond', price: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActiveSelection({ plan, price });
    setIsPaystackOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setIsPaystackOpen(false);
    setIsProcessing(true);
    try {
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Plan Activated", `Your shop is now on the ${activeSelection?.plan.toUpperCase()} tier.`);
    } catch (e: any) {
      console.error("Registry Sync Error:", e.message);
    } finally {
      setIsProcessing(false);
      setActiveSelection(null);
    }
  };

  if (loading && !refreshing) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  const expiryDate = profile?.subscription_expiry ? new Date(profile.subscription_expiry) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;
  const isPlanActive = (profile?.subscription_plan === 'standard' || profile?.subscription_plan === 'diamond') && !isExpired;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>ACCOUNT PLAN</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
      >
        
        {/* 🛡️ CURRENT STATUS */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }, !isPlanActive && styles.offlineCard]}>
          <View style={{backgroundColor: 'transparent'}}>
            <Text style={[styles.statusLabel, !isPlanActive && { color: '#EF4444' }]}>
               {!isPlanActive ? 'ACCOUNT INACTIVE' : 'ACCOUNT ACTIVE'}
            </Text>
            <Text style={[styles.planName, { color: theme.text }]}>{(profile?.subscription_plan || 'NO PLAN').toUpperCase()}</Text>
          </View>
          {isPlanActive && expiryDate ? (
            <View style={[styles.activeBadge, { backgroundColor: Colors.brand.emerald + '20' }]}>
               <Clock size={12} color={Colors.brand.emerald} strokeWidth={2.5} />
               <Text style={[styles.activeText, { color: Colors.brand.emerald }]}>Renew {expiryDate.toLocaleDateString()}</Text>
            </View>
          ) : (
            <View style={styles.offlineBadge}>
               <AlertTriangle size={14} color="#EF4444" strokeWidth={2.5} />
               <Text style={styles.offlineText}>EXPIRED</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>SELECT MERCHANT TIER</Text>

        {/* STANDARD TIER */}
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.planCard, { backgroundColor: theme.background, borderColor: theme.border }, profile?.subscription_plan === 'standard' && isPlanActive && { borderColor: Colors.brand.emerald, borderWidth: 2.5 }]}
          onPress={() => openPaymentGateway('standard', 2500)}
        >
          <View style={styles.planHeader}>
            <View style={[styles.iconBox, { backgroundColor: Colors.brand.emerald + '15' }]}><Crown color={Colors.brand.emerald} size={26} strokeWidth={2.5} /></View>
            <View style={{backgroundColor: 'transparent'}}>
              <Text style={[styles.planTier, { color: Colors.brand.emerald }]}>STANDARD</Text>
              <Text style={[styles.planPrice, { color: theme.text }]}>₦2,500<Text style={styles.perMonth}> / MONTH</Text></Text>
            </View>
          </View>
          <View style={styles.benefitList}>
            <Benefit item="Unlimited Product Listings" color={Colors.brand.emerald} theme={theme} />
            <Benefit item="Verified Merchant Badge" color={Colors.brand.emerald} theme={theme} />
            <Benefit item="Sales Reports & Analytics" color={Colors.brand.emerald} theme={theme} />
          </View>
        </TouchableOpacity>

        {/* DIAMOND TIER (Weight 3) */}
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.planCard, styles.diamondCard, profile?.subscription_plan === 'diamond' && isPlanActive && styles.diamondActiveBorder]}
          onPress={() => openPaymentGateway('diamond', 4500)}
        >
          <LinearGradient colors={['#111827', '#1F2937']} style={styles.diamondGradient}>
            <View style={styles.diamondTag}><Text style={styles.diamondTagText}>TOP PRIORITY SEARCH</Text></View>
            <View style={styles.planHeader}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}><Gem color="#A78BFA" fill="#A78BFA" size={26} /></View>
              <View style={{backgroundColor: 'transparent'}}>
                <Text style={[styles.planTier, { color: '#A78BFA' }]}>DIAMOND</Text>
                <Text style={[styles.planPrice, { color: 'white' }]}>₦4,500<Text style={[styles.perMonth, { color: 'rgba(255,255,255,0.4)' }]}> / MONTH</Text></Text>
              </View>
            </View>
            <View style={styles.benefitList}>
              <Benefit item="Priority Search Discovery" isDark color="#A78BFA" theme={theme} />
              <Benefit item="Diamond Profile Frame" isDark color="#A78BFA" theme={theme} />
              <Benefit item="Zero Commission on Sales" isDark color="#A78BFA" theme={theme} />
              <Benefit item="Early Access to Features" isDark color="#A78BFA" theme={theme} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {activeSelection && (
        <PaystackTerminal 
          isOpen={isPaystackOpen}
          email={profile?.email || userEmail || ""}
          amount={activeSelection.price}
          metadata={{
            profile_id: profile?.id,
            plan_type: activeSelection.plan
          }}
          onClose={() => setIsPaystackOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {isProcessing && (
        <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={Colors.brand.emerald} />
            <Text style={[styles.processingText, { color: theme.text }]}>UPDATING ACCOUNT...</Text>
        </View>
      )}
    </View>
  );
}

const Benefit = ({ item, isDark, color, theme }: { item: string, isDark?: boolean, color: string, theme: any }) => (
  <View style={[styles.benefitRow, { backgroundColor: 'transparent' }]}>
    <Check size={14} color={color} strokeWidth={3} />
    <Text style={[styles.benefitText, { color: isDark ? 'rgba(255,255,255,0.7)' : theme.text }]}>{item}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 10 : 45, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', backgroundColor: 'transparent' },
  scrollContent: { padding: 25, backgroundColor: 'transparent' },
  statusCard: { padding: 25, borderRadius: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35, borderWidth: 1 },
  offlineCard: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  statusLabel: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5 },
  planName: { fontSize: 24, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  activeText: { fontSize: 10, fontWeight: '900' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  offlineText: { fontSize: 10, fontWeight: '900', color: '#EF4444' },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
  planCard: { borderRadius: 32, borderWidth: 1.5, marginBottom: 20, overflow: 'hidden' },
  diamondCard: { borderWidth: 0, elevation: 12, shadowColor: '#8B5CF6', shadowOpacity: 0.15, shadowRadius: 25 },
  diamondGradient: { padding: 30 },
  diamondActiveBorder: { borderWidth: 3, borderColor: '#A78BFA' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 25, backgroundColor: 'transparent' },
  iconBox: { width: 52, height: 52, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  planTier: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  planPrice: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  perMonth: { fontSize: 10, color: '#9CA3AF', fontWeight: '800' },
  benefitList: { gap: 12, backgroundColor: 'transparent' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 13, fontWeight: '700' },
  diamondTag: { alignSelf: 'flex-start', backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 20 },
  diamondTagText: { color: 'white', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  processingText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 }
});