import React, { useState, useRef } from 'react';
import { 
  StyleSheet, TouchableOpacity, 
  ActivityIndicator, Alert, Dimensions, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Zap, ArrowRight, Check, Users 
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🎯 ROLE SELECTION v82.0
 * Purpose: Let the user choose between shopping or selling.
 * Logic: All new shop owners start with a 14-day free trial.
 */
export default function RoleSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'collector' | 'merchant' | null>(null);

  const collectorScale = useRef(new Animated.Value(1)).current;
  const merchantScale = useRef(new Animated.Value(1)).current;

  const animateSelection = (target: 'collector' | 'merchant') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRole(target);
    
    // Animate the selected card to pop slightly
    Animated.spring(target === 'collector' ? collectorScale : merchantScale, {
      toValue: 1.03,
      useNativeDriver: true,
      friction: 7
    }).start();
    
    // Reset the other card
    Animated.spring(target === 'collector' ? merchantScale : collectorScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  /**
   * 💾 SAVE USER CHOICE
   * Updates the database with the chosen role and sets up the trial for sellers.
   */
  const handleFinalize = async () => {
    if (!selectedRole || !profile?.id) {
      return Alert.alert("Error", "We couldn't find your account. Please try logging in again.");
    }
    
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    try {
      const isMerchant = selectedRole === 'merchant';
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14); // 📅 14-Day Free Trial
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_seller: isMerchant,
          // 💎 Prestige: Shop Owner = 2, Shopper = 1
          prestige_weight: isMerchant ? 2 : 1, 
          subscription_plan: isMerchant ? 'standard' : null,
          subscription_status: isMerchant ? 'trial' : null,
          trial_ends_at: isMerchant ? trialEndDate.toISOString() : null,
          onboarding_step: isMerchant ? 'setup' : 'collector-setup',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Force refresh the app data to recognize the new role
      await refreshUserData();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to the next step based on role
      router.replace(isMerchant ? '/onboarding/setup' : '/onboarding/collector-setup');

    } catch (e: any) {
      console.error("Setup error:", e.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed to Save", "We couldn't save your choice. Please check your internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.background,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20
      }
    ]}>
      <View style={styles.header}>
        <View style={[styles.progressTrack, { backgroundColor: theme.surface }]}>
          <View style={[styles.progressActive, { backgroundColor: theme.text }]} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>CHOOSE YOUR{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>ROLE.</Text></Text>
        <Text style={[styles.subTitle, { color: theme.subtext }]}>How do you plan to use the app?</Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* SHOPPER OPTION */}
        <Animated.View style={{ transform: [{ scale: collectorScale }] }}>
          <RoleCard 
            title="SHOPPER"
            desc="I want to browse unique items, follow shops, and save things I love."
            icon={<Users size={28} />}
            isActive={selectedRole === 'collector'}
            onPress={() => animateSelection('collector')}
            color={theme.text}
            theme={theme}
          />
        </Animated.View>

        {/* SHOP OWNER OPTION */}
        <Animated.View style={{ transform: [{ scale: merchantScale }] }}>
          <RoleCard 
            title="SHOP OWNER"
            desc="I want to open a store, post my products, and reach new customers."
            icon={<Zap size={28} />}
            isActive={selectedRole === 'merchant'}
            onPress={() => animateSelection('merchant')}
            color={Colors.brand.emerald}
            theme={theme}
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[
            styles.actionBtn, 
            { backgroundColor: theme.text },
            (!selectedRole || loading) && styles.actionBtnDisabled
          ]} 
          onPress={handleFinalize}
          disabled={!selectedRole || loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <>
              <Text style={[styles.actionBtnText, { color: theme.background }]}>CONTINUE</Text>
              <ArrowRight color={theme.background} size={20} strokeWidth={3} />
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.footerNote, { color: theme.border }]}>2026 COMMUNITY SECURED</Text>
      </View>
    </View>
  );
}

const RoleCard = ({ title, desc, icon, isActive, onPress, color, theme }: any) => (
  <TouchableOpacity 
    activeOpacity={0.9}
    style={[
      styles.card, 
      { backgroundColor: theme.background, borderColor: theme.surface },
      isActive && { borderColor: theme.text, backgroundColor: theme.surface }
    ]} 
    onPress={onPress}
  >
    <View style={[styles.iconContainer, { backgroundColor: theme.surface }, isActive && { backgroundColor: color }]}>
      {React.cloneElement(icon, { color: isActive ? theme.background : color, strokeWidth: 2.5 })}
    </View>
    <View style={styles.cardInfo}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.cardDesc, { color: theme.subtext }]}>{desc}</Text>
    </View>
    {isActive && (
      <View style={[styles.indicator, { backgroundColor: color }]}>
        <Check color={theme.background} size={14} strokeWidth={4} />
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 30 },
  header: { marginBottom: 40, backgroundColor: 'transparent' },
  progressTrack: { width: 50, height: 6, borderRadius: 10, marginBottom: 25 },
  progressActive: { width: '50%', height: '100%', borderRadius: 10 },
  title: { fontSize: 36, fontWeight: '900', lineHeight: 40, letterSpacing: -1.5 },
  subTitle: { fontSize: 15, marginTop: 12, fontWeight: '600', lineHeight: 22 },
  optionsContainer: { gap: 18, backgroundColor: 'transparent' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 25, borderRadius: 32, borderWidth: 2 },
  iconContainer: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16, backgroundColor: 'transparent' },
  cardTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, fontWeight: '500', marginTop: 4, lineHeight: 18 },
  indicator: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  footer: { marginTop: 'auto', marginBottom: 20, alignItems: 'center', backgroundColor: 'transparent' },
  actionBtn: { width: '100%', height: 70, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  actionBtnDisabled: { opacity: 0.15 },
  actionBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  footerNote: { fontSize: 9, fontWeight: '800', marginTop: 25, letterSpacing: 1 }
});