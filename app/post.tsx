import React, { useEffect } from 'react';
import { 
  Dimensions, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowRight, 
  Camera, 
  Play, 
  ShoppingBag, 
  Sparkles, 
  X, 
  Zap, 
  ShieldCheck, 
  BadgeCheck 
} from 'lucide-react-native';

// 🏛️ Sovereign Components
import { useUserStore } from '../src/store/useUserStore';
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

const { width, height } = Dimensions.get('window');

/**
 * 🏰 POST DISPATCHER v79.1 (Pure Build Hardened)
 * Audited: Section I Identity Gates & Section VI Economic Standing.
 * Logic: Strict funneling for Buyers, Expired Merchants, and Unverified Identities.
 */
export default function PostScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, loading: userLoading, refreshUserData } = useUserStore();

  useEffect(() => {
    refreshUserData(); 
  }, []);

  const handleAction = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push(path as any);
  };

  if (userLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.brand.emerald} />
      </View>
    );
  }

  // 🛡️ SECURITY REGISTRY PROBE (Manifest v79.1)
  const isMerchant = profile?.is_seller === true;
  const isVerified = profile?.is_verified === true;
  const isTrialActive = profile?.seller_trial_ends_at 
    ? new Date(profile.seller_trial_ends_at) > new Date() 
    : false;
  const hasActivePlan = profile?.subscription_plan && profile.subscription_plan !== 'none';
  const hasAccess = isTrialActive || hasActivePlan;

  /**
   * 🎭 GATE 1: BUYER CONVERSION
   * Logic: If not a merchant, encourage them to open a shop.
   */
  if (!isMerchant) {
    return (
      <UpsellGate 
        image="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2000"
        title="START YOUR"
        accent="BRAND."
        description="Only verified merchants can post. Open your shop to start selling and reach customers directly on WhatsApp."
        btnText="BECOME A MERCHANT"
        onPress={() => handleAction('/onboarding/role-setup')}
        router={router}
      />
    );
  }

  /**
   * 💰 GATE 2: ECONOMIC STANDING (Subscription)
   * Logic: If merchant is inactive (expired trial/no plan).
   */
  if (!hasAccess) {
    return (
      <UpsellGate 
        image="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000"
        title="RENEW YOUR"
        accent="ACCESS."
        description="Your commercial access has expired. Renew your subscription to keep deploying products to the marketplace."
        btnText="VIEW PLANS"
        onPress={() => handleAction('/seller/subscription')}
        router={router}
      />
    );
  }

  /**
   * 🛡️ GATE 3: IDENTITY VETTING (Verification)
   * Logic: Merchant is active but has not completed Face/ID scan.
   */
  if (!isVerified) {
    return (
      <View style={styles.upsellContainer}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1521334885634-95b210024ed4?q=80&w=2000' }} style={styles.upsellBg} />
        <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.upsellContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtnCircle}><X color="white" size={24} strokeWidth={3} /></TouchableOpacity>
          <View style={styles.upsellBody}>
            <View style={[styles.crownBadge, { backgroundColor: 'rgba(59, 130, 246, 0.25)' }]}><ShieldCheck size={32} color="#3B82F6" /></View>
            <Text style={styles.upsellTitle}>IDENTITY{"\n"}<Text style={{ color: '#3B82F6', fontStyle: 'italic' }}>REQUIRED.</Text></Text>
            <Text style={styles.upsellSub}>To keep StoreLink safe, you must verify your identity before you can post cinematic content or products.</Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => handleAction('/seller/verification')}>
              <Text style={styles.startBtnText}>GET VERIFIED</Text>
              <BadgeCheck size={18} color="#111827" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  /**
   * 🏛️ AUTHORIZED HUB (The Creation Center)
   */
  return (
    <View style={[styles.creatorContainer, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{backgroundColor: 'transparent'}}>
        <View style={[styles.creatorHeader, { borderBottomColor: theme.border }]}>
           <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <X color={theme.text} size={28} strokeWidth={2.5} />
           </TouchableOpacity>
           <Text style={[styles.creatorTitle, { color: theme.text }]}>CREATE DROP</Text>
           <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      <View style={[styles.optionsList, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.instruction, { color: theme.subtext }]}>WHAT ARE YOU POSTING?</Text>

          <ActionItem 
            title="PRODUCT LISTING"
            sub="Add a permanent item to your shop catalog"
            icon={<ShoppingBag color={theme.text} size={26} strokeWidth={2.2} />}
            onPress={() => handleAction('/seller/post-product')}
            theme={theme}
          />

          <ActionItem 
            title="VIDEO REEL"
            sub="Share a vertical video to the explore feed"
            icon={<Play color={Colors.brand.emerald} fill={Colors.brand.emerald} size={26} />}
            onPress={() => handleAction('/seller/post-reel')}
            activeColor={Colors.brand.emerald + '15'}
            theme={theme}
          />

          <ActionItem 
            title="12-HOUR DROP"
            sub="Post a temporary story for your followers"
            icon={<Camera color={Colors.brand.gold} fill={Colors.brand.gold} size={26} />}
            onPress={() => handleAction('/seller/post-story')}
            activeColor={Colors.brand.gold + '15'}
            theme={theme}
          />
      </View>

      <View style={[styles.creatorFooter, { backgroundColor: 'transparent' }]}>
          <Zap size={14} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
          <Text style={[styles.footerNote, { color: Colors.brand.emerald }]}>UPLOADING TO THE MARKETPLACE</Text>
      </View>
    </View>
  );
}

const UpsellGate = ({ image, title, accent, description, btnText, onPress, router }: any) => (
  <View style={styles.upsellContainer}>
    <Image source={{ uri: image }} style={styles.upsellBg} />
    <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
    <SafeAreaView style={styles.upsellContent}>
      <TouchableOpacity onPress={() => router.back()} style={styles.closeBtnCircle}><X color="white" size={24} strokeWidth={3} /></TouchableOpacity>
      <View style={styles.upsellBody}>
          <View style={styles.crownBadge}><Sparkles size={32} color={Colors.brand.emerald} fill={Colors.brand.emerald} /></View>
          <Text style={styles.upsellTitle}>{title}{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>{accent}</Text></Text>
          <Text style={styles.upsellSub}>{description}</Text>
          <TouchableOpacity style={styles.startBtn} onPress={onPress}>
            <Text style={styles.startBtnText}>{btnText}</Text>
            <ArrowRight size={18} color="#111827" strokeWidth={3} />
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  </View>
);

const ActionItem = ({ title, sub, icon, onPress, activeColor, theme }: any) => (
  <TouchableOpacity 
    style={[styles.optionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} 
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
  >
    <View style={[styles.iconBox, { backgroundColor: theme.background }, activeColor && { backgroundColor: activeColor }]}>
      {icon}
    </View>
    <View style={{ flex: 1, marginLeft: 18, backgroundColor: 'transparent' }}>
      <Text style={[styles.optionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.optionSub, { color: theme.subtext }]}>{sub}</Text>
    </View>
    <ArrowRight color={theme.border} size={18} strokeWidth={3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  upsellContainer: { flex: 1, backgroundColor: 'black' },
  upsellBg: { width, height, position: 'absolute' },
  upsellContent: { flex: 1, padding: 30 },
  closeBtnCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  upsellBody: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  crownBadge: { width: 80, height: 80, borderRadius: 32, backgroundColor: 'rgba(16, 185, 129, 0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  upsellTitle: { fontSize: 48, fontWeight: '900', color: 'white', textAlign: 'center', letterSpacing: -2, lineHeight: 48 },
  upsellSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 18, lineHeight: 24, paddingHorizontal: 20, fontWeight: '700' },
  startBtn: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 25, paddingVertical: 22, borderRadius: 30, marginTop: 45, width: '100%', justifyContent: 'center' },
  startBtnText: { fontSize: 13, fontWeight: '900', color: '#111827', letterSpacing: 1.2 },

  creatorContainer: { flex: 1 },
  creatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 0 : 20, borderBottomWidth: 1 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  creatorTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  optionsList: { padding: 25, gap: 16 },
  instruction: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 35, borderWidth: 1.5 },
  iconBox: { width: 60, height: 60, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  optionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  optionSub: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  creatorFooter: { marginTop: 'auto', paddingBottom: 60, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footerNote: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }
});