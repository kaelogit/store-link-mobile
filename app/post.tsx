import React, { useEffect, useState } from 'react';
import { 
  Dimensions, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { 
  ArrowRight, 
  Camera, 
  Play, 
  ShoppingBag, 
  X, 
  Zap, 
  ShieldCheck, 
  TrendingUp,
  UserCheck
} from 'lucide-react-native';

// App Connection
import { useUserStore } from '../src/store/useUserStore';
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

const { width, height } = Dimensions.get('window');

/**
 * 🏰 POST SCREEN v97.0
 * Purpose: Central hub for sellers to post products, videos, or stories.
 * Security: Checks account status, subscription, and verification before allowing posts.
 */
export default function PostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, loading: userLoading, refreshUserData } = useUserStore();
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const checkAccountStatus = async () => {
      setIsSyncing(true);
      await refreshUserData();
      setIsSyncing(false);
    };
    checkAccountStatus();
  }, []);

  if (userLoading || isSyncing) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
        <Text style={styles.syncText}>CHECKING ACCOUNT STATUS...</Text>
      </View>
    );
  }

  // 🛡️ SECURITY CHECKS
  const isMerchant = profile?.is_seller === true;
  const isIdentityVerified = profile?.verification_status === 'verified';
  
  // TRIAL CHECK: 14-day free window
  let isTrialActive = false;
  if (profile?.trial_ends_at) {
    try {
      const trialExpiry = new Date(profile.trial_ends_at);
      isTrialActive = trialExpiry > new Date() && !isNaN(trialExpiry.getTime());
    } catch (error) {
      isTrialActive = false;
    }
  }
  
  // SUBSCRIPTION CHECK
  const plan = profile?.subscription_plan?.toLowerCase() || 'none';
  const isExpired = profile?.subscription_expiry ? new Date(profile.subscription_expiry) < new Date() : false;
  
  const hasActivePlan = (plan === 'standard' || plan === 'diamond') && !isExpired;
  const hasSellerAccess = isTrialActive || hasActivePlan;

  /**
   * 🎭 GATE 1: UPGRADE TO SELLER
   * Shown if the user is only a customer.
   */
  if (!isMerchant) {
    return (
      <GateScreen 
        icon={<TrendingUp size={42} color={Colors.brand.emerald} />}
        title="START YOUR BRAND"
        description={"You're currently browsing as a customer, but you can start selling today. Activate your seller profile to list products and reach shoppers.\n\nOpening your shop allows you to:\n1. Build a professional online storefront\n2. Post videos and story updates"}        
        btnText="OPEN MY SHOP"
        onPress={() => router.push('/onboarding/role-setup')}
        router={router}
        theme={theme}
        accentColor={Colors.brand.emerald}
        insets={insets}
      />
    );
  }

  /**
   * 💰 GATE 2: RENEW SUBSCRIPTION
   * Shown if the trial or plan has expired.
   */
  if (!hasSellerAccess) {
    return (
      <GateScreen 
        icon={<Zap size={42} color={Colors.brand.emerald} fill={Colors.brand.emerald} />}
        title="RENEW ACCESS"
        description="Your subscription has ended. Your shop is currently in view-only mode. To resume posting new products and videos, please renew your plan.\n\nRenewing allows you to:\n1. Keep items visible in the marketplace\n2. Share new products to the local feed."
        btnText="SEE PLANS"
        onPress={() => router.push('/seller/subscription')}
        router={router}
        theme={theme}
        accentColor={Colors.brand.emerald}
        insets={insets}
      />
    );
  }

  /**
   * 🛡️ GATE 3: VERIFICATION
   * Safety check before the first post.
   */
  if (!isIdentityVerified) {
    return (
      <GateScreen 
        icon={<UserCheck size={42} color="#3B82F6" />}
        title="IDENTITY CHECK"
        description={"To keep our community safe, we require all sellers to verify their identity. Verified sellers build more trust and sell items faster.\n\nProceed to:\n1. Upload your identity documents\n2. Complete a quick photo scan\n3. Start posting once approved."}        
        btnText="START VERIFICATION"
        onPress={() => router.push('/seller/verification')}
        router={router}
        theme={theme}
        accentColor="#3B82F6"
        insets={insets}
      />
    );
  }

  return (
    <View style={[styles.creatorContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={[styles.creatorHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X color={theme.text} size={28} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.creatorTitle, { color: theme.text }]}>NEW POST</Text>
          <View style={{ width: 28 }} />
      </View>

      <View style={styles.optionsList}>
          <Text style={[styles.instruction, { color: theme.subtext }]}>WHAT ARE YOU SHARING?</Text>

          <ActionItem 
            title="PRODUCT LISTING"
            sub="Add a new item to your store"
            icon={<ShoppingBag color={theme.text} size={26} strokeWidth={2.2} />}
            onPress={() => router.push('/seller/post-product')}
            theme={theme}
          />

          <ActionItem 
            title="VIDEO REEL"
            sub="Share a short video to the feed"
            icon={<Play color={Colors.brand.emerald} fill={Colors.brand.emerald} size={26} />}
            onPress={() => router.push('/seller/post-reel')}
            activeColor={Colors.brand.emerald + '15'}
            theme={theme}
          />

          <ActionItem 
            title="STORY DROP"
            sub="Share a temporary 12-hour update"
            icon={<Camera color={Colors.brand.gold} fill={Colors.brand.gold} size={26} />}
            onPress={() => router.push('/seller/post-story')}
            activeColor={Colors.brand.gold + '15'}
            theme={theme}
          />
      </View>

      <View style={[styles.creatorFooter, { paddingBottom: insets.bottom + 20 }]}>
          <ShieldCheck size={14} color={Colors.brand.emerald} />
          <Text style={[styles.footerNote, { color: Colors.brand.emerald }]}> ACCOUNT VERIFIED & ACTIVE </Text>
      </View>
    </View>
  );
}

const GateScreen = ({ 
  icon, 
  title, 
  description, 
  btnText, 
  onPress, 
  router, 
  accentColor,
  theme,
  insets
}: any) => {
  return (
    <View style={[
      styles.gateContainer, 
      { 
        backgroundColor: theme.background,
        borderColor: accentColor + '30',
        borderWidth: 2,
        marginTop: insets.top + 10,
        marginBottom: insets.bottom + 10
      }
    ]}>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={[styles.closeBtnCircle, { 
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
        }]}
        activeOpacity={0.7}
      >
        <X color={theme.text} size={24} strokeWidth={3} />
      </TouchableOpacity>
      
      <View style={styles.gateContent}>
        <View style={[
          styles.iconPill, 
          { 
            backgroundColor: accentColor + '10',
            borderColor: accentColor + '30',
            borderWidth: 2,
          }
        ]}>
          {icon}
        </View>
        
        <View style={styles.messageContent}>
          <Text style={[styles.gateTitle, { color: theme.text }]}>
            {title}
          </Text>
          
          <View style={[styles.divider, { backgroundColor: accentColor }]} />
          
          <Text style={[styles.gateDescription, { color: theme.subtext }]}>
            {description}
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.actionBtn, 
              { 
                backgroundColor: accentColor,
                shadowColor: accentColor,
              }
            ]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onPress();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              {btnText.toUpperCase()}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.cancelBtn}
            activeOpacity={0.6}
          >
            <Text style={[styles.cancelText, { color: theme.subtext }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.bottomAccent, { backgroundColor: accentColor + '40' }]} />
    </View>
  );
};

const ActionItem = ({ title, sub, icon, onPress, activeColor, theme }: any) => (
  <TouchableOpacity 
    style={[styles.optionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} 
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
    activeOpacity={0.7}
  >
    <View style={[
      styles.iconBox, 
      { backgroundColor: theme.background }, 
      activeColor && { backgroundColor: activeColor }
    ]}>
      {icon}
    </View>
    <View style={{ flex: 1, marginLeft: 18 }}>
      <Text style={[styles.optionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.optionSub, { color: theme.subtext }]}>{sub}</Text>
    </View>
    <ArrowRight color={theme.border} size={18} strokeWidth={3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  syncText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: '#999' },
  gateContainer: { flex: 1, borderRadius: 32, margin: 16, overflow: 'hidden', elevation: 8 },
  gateContent: { flex: 1, paddingHorizontal: 25, alignItems: 'center', paddingTop: 30 },
  iconPill: { width: 90, height: 90, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  closeBtnCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 20, right: 20, zIndex: 10 },
  messageContent: { width: '100%', alignItems: 'center' },
  gateTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  divider: { width: 50, height: 4, borderRadius: 2, marginVertical: 20 },
  gateDescription: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center', marginBottom: 40, paddingHorizontal: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 20, borderRadius: 24, width: '100%', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  actionBtnText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  cancelBtn: { marginTop: 25, padding: 10 },
  cancelText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, opacity: 0.6 },
  bottomAccent: { height: 6, width: '100%' },
  creatorContainer: { flex: 1 },
  creatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  creatorTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  optionsList: { padding: 25, gap: 16 },
  instruction: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 32, borderWidth: 1.5 },
  iconBox: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  optionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  optionSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  creatorFooter: { marginTop: 'auto', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footerNote: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }
});