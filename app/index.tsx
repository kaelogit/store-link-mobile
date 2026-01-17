import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LayoutDashboard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/useUserStore'; 
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

/**
 * 🏰 ENTRY GATEWAY v8.1 (Pure Build)
 * Audited: Section I Profile Priming & Theme Consistency.
 */
export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { refreshUserData } = useUserStore();
  
  // 🏛️ KINETIC ANIMATIONS
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // ⚡ STARTUP PULSE
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.8, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7, 
        tension: 40,
        useNativeDriver: true
      })
    ]).start();

    // Secure haptic handshake
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 150);

    startApp();
  }, []);

  const startApp = async () => {
    try {
      // 1. Check Login Session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 2. Prime the Profile Registry before entering marketplace
        await refreshUserData();
      }

      // 3. Mandatory 2s delay for system stability and branding
      setTimeout(() => {
        if (session) {
          router.replace('/(tabs)'); 
        } else {
          router.replace('/auth/login');
        }
      }, 2000);

    } catch (e) {
      console.error("Startup Error:", e);
      router.replace('/auth/login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <Animated.View style={[
        styles.identityWrapper, 
        { opacity, transform: [{ scale }], backgroundColor: 'transparent' }
      ]}>
        {/* 🏛️ OFFICIAL ICON */}
        <View style={[styles.iconBox, { backgroundColor: Colors.brand.emerald + '15' }]}>
          <LayoutDashboard 
            size={44} 
            color={Colors.brand.emerald} 
            strokeWidth={3} 
          />
        </View>
        
        <Text style={[styles.logoText, { color: theme.text }]}>StoreLink</Text>
        
        <View style={[styles.statusRow, { backgroundColor: 'transparent' }]}>
           <View style={[styles.pulseDot, { backgroundColor: Colors.brand.emerald }]} />
           <Text style={styles.statusText}>PURE BUILD v75.0</Text>
        </View>
      </Animated.View>

      <View style={[styles.footer, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.footerText, { color: theme.border }]}>STORELINK NETWORK SECURED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  identityWrapper: { 
    alignItems: 'center' 
  },
  iconBox: {
    width: 85,
    height: 85,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    // Native shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      }
    })
  },
  logoText: { 
    fontSize: 38, 
    fontWeight: '900', 
    letterSpacing: -2, 
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#9CA3AF', 
    letterSpacing: 2 
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  }
});