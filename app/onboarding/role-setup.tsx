import React, { useState, useRef } from 'react';
import { 
  StyleSheet, TouchableOpacity, 
  ActivityIndicator, Alert, Dimensions, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Zap, ArrowRight, Check, Users 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 ROLE SELECTION v78.7 (Final Registry Fix)
 * Audited: Section I Identity Layer & Schema Resilience.
 * Resolved: "seller_trial_ends_at" conflict and Sync Lag.
 */
export default function RoleSetupScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'collector' | 'merchant' | null>(null);

  const collectorScale = useRef(new Animated.Value(1)).current;
  const merchantScale = useRef(new Animated.Value(1)).current;

  const animateSelection = (target: 'collector' | 'merchant') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRole(target);
    
    Animated.spring(target === 'collector' ? collectorScale : merchantScale, {
      toValue: 1.03,
      useNativeDriver: true,
      friction: 7
    }).start();
    
    Animated.spring(target === 'collector' ? merchantScale : collectorScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  /**
   * 🛡️ REGISTRY HANDSHAKE
   * Updates the Identity Layer with the chosen role and Prestige weight.
   */
  const handleFinalize = async () => {
    if (!selectedRole || !profile?.id) {
      return Alert.alert("Registry Error", "User Identity not found. Please log in again.");
    }
    
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    try {
      const isMerchant = selectedRole === 'merchant';
      
      // 🛡️ IDENTITY UPDATE (Manifest v78.6)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_seller: isMerchant,
          // 💎 Prestige Weights: Merchant = 2, Collector = 1
          prestige_weight: isMerchant ? 2 : 1, 
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      // 🔄 FORCE SYNC: Vital to clear the _layout.tsx verification gate
      await refreshUserData();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 🛤️ SOVEREIGN ROUTING
      // replace used to prevent user from going 'back' to role selection
      router.replace(isMerchant ? '/onboarding/setup' : '/onboarding/collector-setup');

    } catch (e: any) {
      console.error("Role Registry Rupture:", e.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // If the error persists after SQL fix, the database schema hasn't reloaded yet.
      Alert.alert(
        "Registry Failure", 
        "COULD NOT SAVE ROLE. IF ERROR PERSISTS, PLEASE RELOAD THE APP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={[styles.progressTrack, { backgroundColor: theme.surface }]}>
          <View style={[styles.progressActive, { backgroundColor: theme.text }]} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>CHOOSE YOUR{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>ROLE.</Text></Text>
        <Text style={[styles.subTitle, { color: theme.subtext }]}>How do you want to use StoreLink?</Text>
      </View>

      <View style={styles.optionsContainer}>
        <Animated.View style={{ transform: [{ scale: collectorScale }] }}>
          <RoleCard 
            title="COLLECTOR"
            desc="Browse unique products, follow shops, and build your digital collection."
            icon={<Users size={28} />}
            isActive={selectedRole === 'collector'}
            onPress={() => animateSelection('collector')}
            color={theme.text}
            theme={theme}
          />
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: merchantScale }] }}>
          <RoleCard 
            title="MERCHANT"
            desc="Open your shop, list products, and reach customers across the Vortex."
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
        <Text style={[styles.footerNote, { color: theme.border }]}>VERSION 78.7 REGISTRY ACTIVE</Text>
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
  container: { flex: 1, paddingHorizontal: 35, paddingTop: 60 },
  header: { marginBottom: 50, backgroundColor: 'transparent' },
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
  footer: { marginTop: 'auto', marginBottom: 40, alignItems: 'center', backgroundColor: 'transparent' },
  actionBtn: { width: '100%', height: 75, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  actionBtnDisabled: { opacity: 0.15 },
  actionBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  footerNote: { fontSize: 9, fontWeight: '800', marginTop: 25, letterSpacing: 1 }
});