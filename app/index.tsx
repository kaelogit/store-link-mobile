import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, StatusBar, Platform, View as RNView } from 'react-native';
import { useRouter } from 'expo-router';
import { LayoutDashboard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/useUserStore'; 
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

/**
 * 🚀 APP STARTUP SCREEN (Splash) v100.0
 * Purpose: Checks if the user is logged in and prepares their profile data.
 * Language: Simple English for clear logic flow.
 */
export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { refreshUserData } = useUserStore();
  
  // Animation state
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // 1. Start the visual entrance animation
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8, 
        tension: 40,
        useNativeDriver: true
      })
    ]).start();

    // 2. Add a premium vibration feel on start
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 200);

    // 3. Run the startup check
    startApp();
  }, []);

  const startApp = async () => {
    try {
      // Minimum wait time to ensure the logo is seen (Premium Feel)
      const minWait = new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check auth status
      const authCheck = (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Load critical data in background
          await refreshUserData();
          return true;
        }
        return false;
      })();

      // Wait for both timer and auth check
      const [_, isLoggedIn] = await Promise.all([minWait, authCheck]);

      if (isLoggedIn) {
        router.replace('/(tabs)'); 
      } else {
        router.replace('/auth/login');
      }

    } catch (e) {
      console.error("Startup error:", e);
      // Fallback to login on critical failure
      router.replace('/auth/login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <Animated.View style={[
        styles.logoWrapper, 
        { opacity, transform: [{ scale }] }
      ]}>
        {/* APP ICON */}
        <RNView style={[styles.iconBox, { backgroundColor: `${Colors.brand.emerald}15` }]}>
          <LayoutDashboard 
            size={44} 
            color={Colors.brand.emerald} 
            strokeWidth={3} 
          />
        </RNView>
        
        <Text style={[styles.logoText, { color: theme.text }]}>StoreLink</Text>
        
        <RNView style={styles.statusRow}>
           <RNView style={[styles.pulseDot, { backgroundColor: Colors.brand.emerald }]} />
           <Text style={styles.statusText}>READY FOR DISCOVERY</Text>
        </RNView>
      </Animated.View>

      <RNView style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.border }]}>CONNECTED</Text>
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logoWrapper: { 
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  iconBox: {
    width: 85,
    height: 85,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    letterSpacing: -1.5, 
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'transparent'
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
    letterSpacing: 1.5 
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  footerText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  }
});