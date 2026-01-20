import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, RefreshControl, Platform, Dimensions, StatusBar, View as RNView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Crown, Check, Clock, 
  ShieldCheck, Gem, AlertTriangle, Zap, TrendingUp, Sparkles
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { PaystackTerminal } from '../../src/components/PaystackTerminal';

const { width } = Dimensions.get('window');

/**
 * 🏰 STORE PLANS v112.0
 * Purpose: Helping sellers choose between Standard and Diamond plans.
 * Logic: Clear comparison of features with simple language.
 */
export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  const queryClient = useQueryClient();

  const [selectedMonths, setSelectedMonths] = useState(1);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [activeSelection, setActiveSelection] = useState<{plan: 'standard' | 'diamond', price: number} | null>(null);

  // PRICING DATA
  const BASE_PRICES = { standard: 2500, diamond: 4500 };
  const DURATIONS = [
    { months: 1, label: '1 Month', discount: 0 },
    { months: 3, label: '3 Months', discount: 0.03 },
    { months: 6, label: '6 Months', discount: 0.08 },
    { months: 12, label: '1 Year', discount: 0.15 },
  ];

  const { isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['account-subscription', profile?.id],
    queryFn: async () => {
      await refreshUserData();
      return profile;
    },
  });

  const calculatePrice = (plan: 'standard' | 'diamond', months: number) => {
    const base = BASE_PRICES[plan] * months;
    const config = DURATIONS.find(d => d.months === months);
    const discount = config ? config.discount : 0;
    return Math.round(base * (1 - discount));
  };

  const openPaymentGateway = (plan: 'standard' | 'diamond') => {
    const finalPrice = calculatePrice(plan, selectedMonths);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActiveSelection({ plan, price: finalPrice });
    setIsPaystackOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setIsPaystackOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await refetch();
    Alert.alert("Payment Successful", `Your shop has been upgraded to ${activeSelection?.plan.toUpperCase()} for ${selectedMonths} months.`);
    setActiveSelection(null);
  };

  const expiryDate = profile?.subscription_expiry ? new Date(profile.subscription_expiry) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;
  const isPlanActive = (profile?.subscription_plan === 'standard' || profile?.subscription_plan === 'diamond') && !isExpired;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>CHOOSE A PLAN</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.emerald} />}
      >
        {/* ACCOUNT STATUS */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }, !isPlanActive && styles.offlineCard]}>
          <View style={{backgroundColor: 'transparent'}}>
            <Text style={[styles.statusLabel, !isPlanActive && { color: '#EF4444' }]}>
               {!isPlanActive ? 'SUBSCRIPTION EXPIRED' : 'SUBSCRIPTION ACTIVE'}
            </Text>
            <Text style={[styles.planName, { color: theme.text }]}>{(profile?.subscription_plan || 'BASIC').toUpperCase()}</Text>
          </View>
          {isPlanActive && expiryDate ? (
            <View style={[styles.activeBadge, { backgroundColor: `${Colors.brand.emerald}15` }]}>
               <Clock size={12} color={Colors.brand.emerald} strokeWidth={2.5} />
               <Text style={[styles.activeText, { color: Colors.brand.emerald }]}>Ends {expiryDate.toLocaleDateString()}</Text>
            </View>
          ) : (
            <View style={styles.offlineBadge}>
               <AlertTriangle size={14} color="#EF4444" strokeWidth={2.5} />
               <Text style={styles.offlineText}>INACTIVE</Text>
            </View>
          )}
        </View>

        {/* SUBSCRIPTION LENGTH */}
        <Text style={[styles.sectionTitle, { color: theme.subtext }]}>HOW LONG DO YOU WANT TO SUBSCRIBE?</Text>
        <View style={[styles.durationPicker, { backgroundColor: theme.surface }]}>
          {DURATIONS.map((d) => (
            <TouchableOpacity 
              key={d.months}
              onPress={() => { setSelectedMonths(d.months); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.durationTab, selectedMonths === d.months && { backgroundColor: theme.background, elevation: 4 }]}
            >
              <Text style={[styles.durationLabel, { color: selectedMonths === d.months ? theme.text : theme.subtext }]}>{d.label}</Text>
              {d.discount > 0 && <View style={styles.discountBadge}><Text style={styles.discountText}>-{d.discount * 100}%</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.subtext, marginTop: 30 }]}>SELECT A SHOP TIER</Text>

        {/* STANDARD PLAN */}
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }, profile?.subscription_plan === 'standard' && isPlanActive && { borderColor: Colors.brand.emerald, borderWidth: 2.5 }]}
          onPress={() => openPaymentGateway('standard')}
        >
          <View style={[styles.planHeader, { padding: 25, paddingBottom: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: `${Colors.brand.emerald}15` }]}><Crown color={Colors.brand.emerald} size={28} strokeWidth={2.5} /></View>
            <View style={{flex: 1, backgroundColor: 'transparent'}}>
              <Text style={[styles.planTier, { color: Colors.brand.emerald }]}>STANDARD SHOP</Text>
              <Text style={[styles.planPrice, { color: theme.text }]}>₦{calculatePrice('standard', selectedMonths).toLocaleString()}</Text>
            </View>
          </View>
          <View style={[styles.benefitList, { padding: 25 }]}>
            <Benefit item="Add unlimited products to your shop" color={Colors.brand.emerald} theme={theme} />
            <Benefit item="Get a verified badge for your profile" color={Colors.brand.emerald} theme={theme} />
            <Benefit item="Show up in regular search results" color={Colors.brand.emerald} theme={theme} />
          </View>
        </TouchableOpacity>

        {/* DIAMOND PLAN */}
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.planCard, styles.diamondCard]}
          onPress={() => openPaymentGateway('diamond')}
        >
          <LinearGradient colors={['#111827', '#1F2937']} style={styles.diamondGradient}>
            <View style={styles.diamondTag}>
               <Sparkles size={10} color="white" />
               <Text style={styles.diamondTagText}>MOST POPULAR FOR SELLERS</Text>
            </View>
            <View style={styles.planHeader}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}><Gem color="#A78BFA" fill="#A78BFA" size={28} /></View>
              <View style={{flex: 1, backgroundColor: 'transparent'}}>
                <Text style={[styles.planTier, { color: '#A78BFA' }]}>DIAMOND PREMIUM</Text>
                <Text style={[styles.planPrice, { color: 'white' }]}>₦{calculatePrice('diamond', selectedMonths).toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.benefitList}>
              <Benefit item="Appear at the very top of search results" isDark color="#A78BFA" theme={theme} />
              <Benefit item="Stand out with a premium purple badge" isDark color="#A78BFA" theme={theme} />
              <Benefit item="Advanced tools to create better photos/videos" isDark color="#A78BFA" theme={theme} />
              <Benefit item="Keep 100% of your sales (no fees)" isDark color="#A78BFA" theme={theme} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {activeSelection && (
        <PaystackTerminal 
          isOpen={isPaystackOpen}
          email={profile?.email || ""}
          amount={activeSelection.price}
          metadata={{
            profile_id: profile?.id,
            plan_type: activeSelection.plan,
            duration_months: selectedMonths
          }}
          onClose={() => setIsPaystackOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </View>
  );
}

const Benefit = ({ item, isDark, color, theme }: { item: string, isDark?: boolean, color: string, theme: any }) => (
  <View style={styles.benefitRow}>
    <Check size={14} color={color} strokeWidth={3} />
    <Text style={[styles.benefitText, { color: isDark ? 'rgba(255,255,255,0.7)' : theme.text }]}>{item}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  scrollContent: { padding: 25 },
  
  statusCard: { padding: 25, borderRadius: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35, borderWidth: 1.5 },
  offlineCard: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  statusLabel: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5 },
  planName: { fontSize: 22, fontWeight: '900', marginTop: 5, letterSpacing: -0.5 },
  
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  activeText: { fontSize: 9, fontWeight: '900' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  offlineText: { fontSize: 10, fontWeight: '900', color: '#EF4444' },
  
  sectionTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 15, opacity: 0.6 },
  
  durationPicker: { flexDirection: 'row', padding: 6, borderRadius: 20, gap: 4 },
  durationTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, position: 'relative' },
  durationLabel: { fontSize: 10, fontWeight: '900' },
  discountBadge: { position: 'absolute', top: -5, right: -2, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountText: { color: 'white', fontSize: 7, fontWeight: '900' },
  
  planCard: { borderRadius: 32, borderWidth: 1.5, marginBottom: 20, overflow: 'hidden' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 25, backgroundColor: 'transparent' },
  
  diamondCard: { borderWidth: 0, elevation: 12, shadowColor: '#8B5CF6', shadowOpacity: 0.2, shadowRadius: 20 },
  diamondGradient: { padding: 30 },
  
  iconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  planTier: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  planPrice: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  
  benefitList: { gap: 14, backgroundColor: 'transparent' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' },
  benefitText: { fontSize: 13, fontWeight: '700' },
  
  diamondTag: { alignSelf: 'flex-start', backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  diamondTagText: { color: 'white', fontSize: 8, fontWeight: '900', letterSpacing: 1 }
});