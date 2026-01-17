import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { useCartStore } from '../store/useCartStore';
import { useUserStore } from '../store/useUserStore';
import { useModeStore } from '../store/useModeStore';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface FloatingCartProps {
  onPress: () => void;
}

/**
 * 🏰 FLOATING CART v83.1 (Pure Build)
 * Audited: Section I Mode Gating & Section IV Economy Sync.
 */
export const FloatingCart = ({ onPress }: FloatingCartProps) => {
  const { getCartTotals } = useCartStore();
  const { profile } = useUserStore();
  const { mode } = useModeStore();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // 💰 SYNC: Economy engine calculation
  const { cartCount } = getCartTotals(profile?.coin_balance || 0);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // 🛡️ GATEKEEPER: Invisible in Merchant Mode to prevent UI clutter
  const isMerchantMode = mode === 'SELLER';
  const shouldBeVisible = cartCount > 0 && !isMerchantMode;

  useEffect(() => {
    if (shouldBeVisible) {
      // 🚀 KINETIC SNAP
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7, 
        tension: 85, 
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [shouldBeVisible]);

  if (!shouldBeVisible && (scaleAnim as any)._value === 0) return null;

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { 
          transform: [{ scale: scaleAnim }],
          opacity: scaleAnim 
        }
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.9}
        style={[styles.container, { backgroundColor: theme.text }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }}
      >
        <ShoppingBag color={theme.background} size={24} strokeWidth={2.5} />
        
        {/* 🟢 PRESTIGE BADGE */}
        <View style={[styles.badge, { backgroundColor: Colors.brand.emerald, borderColor: theme.background }]}>
          <Text style={styles.badgeText}>{cartCount}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 35 : 25, 
    right: 25,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  container: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});