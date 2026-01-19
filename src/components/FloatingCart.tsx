import React, { useEffect, useRef, memo } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// App Connection
import { useCartStore } from '../store/useCartStore';
import { useUserStore } from '../store/useUserStore';
import { useModeStore } from '../store/useModeStore';

// App Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface FloatingCartProps {
  onPress: () => void;
}

/**
 * 🏰 FLOATING CART v85.0
 * Purpose: A persistent, floating checkout button that appears when items are added.
 * Features: Tactile haptic feedback, spring animations, and automatic safe-area positioning.
 */
export const FloatingCart = memo(({ onPress }: FloatingCartProps) => {
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const { getCartTotals } = useCartStore();
  const { profile } = useUserStore();
  const { mode } = useModeStore();
  
  const { cartCount } = getCartTotals(profile?.coin_balance || 0);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // DISPLAY LOGIC: Only show to buyers when the cart has items
  const isMerchantMode = mode === 'SELLER';
  const shouldBeVisible = cartCount > 0 && !isMerchantMode;

  useEffect(() => {
    if (shouldBeVisible) {
      // 🏎️ SPRING ANIMATION: High-tension entrance for a premium feel
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6, 
        tension: 100, 
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [shouldBeVisible]);

  /** 🛡️ SAFE AREA POSITIONING
   * Calculates the exact distance from the bottom of the screen to sit
   * perfectly above the native Tab Navigation bar.
   */
  const DYNAMIC_BOTTOM = Platform.OS === 'ios' 
    ? (insets.bottom > 0 ? insets.bottom + 80 : 95) 
    : (insets.bottom > 0 ? insets.bottom + 75 : 90);

  // Prevent rendering if not visible and scale is reset
  if (!shouldBeVisible && (scaleAnim as any)._value === 0) return null;

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { 
          bottom: DYNAMIC_BOTTOM,
          transform: [
            { scale: scaleAnim },
            { translateY: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0] // Subtle upward slide on entrance
              }) 
            }
          ],
          opacity: scaleAnim 
        }
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.85}
        style={[styles.container, { backgroundColor: theme.text }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }}
      >
        <ShoppingBag color={theme.background} size={26} strokeWidth={2.8} />
        
        {/* 🛍️ CART BADGE */}
        <View style={[styles.badge, { backgroundColor: Colors.brand.emerald, borderColor: theme.background }]}>
          <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{cartCount}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
  },
  container: {
    width: 68,
    height: 68,
    borderRadius: 24, // Premium squircle radius
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    elevation: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});