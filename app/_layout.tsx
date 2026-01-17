import { useEffect, useState } from 'react';
import { Platform, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import 'react-native-reanimated';

// Ecosystem
import { supabase } from '../src/lib/supabase';
import { useColorScheme } from '../src/components/useColorScheme';
import { FloatingCart } from '../src/components/FloatingCart';
import { useUserStore } from '../src/store/useUserStore';
import Colors from '../src/constants/Colors';

export { ErrorBoundary } from 'expo-router';

// Prevent splash screen from hiding until auth and fonts are ready
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  // 🛠️ Consolidated Font Loading (Single Source)
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      {/* 🚀 GestureHandler must be top-most for components like BottomSheet to work */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const segments = useSegments();
  const router = useRouter();
  
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { refreshUserData, clearUser } = useUserStore();

  /**
   * 📡 SECURITY HANDSHAKE
   * Logic: Manages the routing gates based on verified status and onboarding.
   */
  const runSecurityCheck = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const currentPath = segments.join('/');

      if (sessionError || !session) {
        setIsAuthReady(true);
        if (segments[0] !== 'auth') {
          router.replace('/auth/login');
        }
        return;
      }

      // Sync user profile state
      await refreshUserData();
      const userProfile = useUserStore.getState().profile;
      
      const isVerified = userProfile?.is_verified === true;
      const isOnboarded = userProfile?.onboarding_completed === true;

      if (!isVerified) {
        if (currentPath !== 'auth/verify') {
          router.replace({ 
            pathname: '/auth/verify', 
            params: { email: session.user.email, type: 'signup' } 
          });
        }
      } else if (!isOnboarded) {
        if (segments[0] !== 'onboarding') {
          router.replace('/onboarding/role-setup');
        }
      } else {
        const isInGatePaths = segments[0] === 'auth' || segments[0] === 'onboarding';
        if (isInGatePaths) {
          router.replace('/(tabs)');
        }
      }
    } catch (e) {
      console.error("Identity Handshake Failure:", e);
    } finally {
      setIsAuthReady(true);
    }
  };

  useEffect(() => {
    runSecurityCheck();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clearUser();
        router.replace('/auth/login');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) runSecurityCheck();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 🛠️ Logic: Hide splash only when auth state is confirmed
  useEffect(() => {
    if (isAuthReady) {
      SplashScreen.hideAsync();
    }
  }, [isAuthReady]);

  if (!isAuthReady) return null;

  const showGlobalUI = segments[0] === '(tabs)' || segments[0] === 'product' || segments[0] === 'wishlist';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 🚀 FIXED TOP-LEVEL SAFE AREA: 
          This ensures battery/network icons never overlap content on Web, iOS, or Android.
      */}
      <SafeAreaView 
        style={{ flex: 1, backgroundColor: theme.background }} 
        edges={['top', 'left', 'right']} 
      >
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
          backgroundColor="transparent"
          translucent={true}
        />

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="auth/login" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="auth/signup" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="auth/verify" options={{ presentation: 'card', gestureEnabled: false }} />
          <Stack.Screen name="onboarding/role-setup" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="onboarding/setup" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="onboarding/collector-setup" options={{ gestureEnabled: false, animation: 'fade' }} />
          
          <Stack.Screen name="seller/post-reel" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="seller/post-story" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="seller/deploy-product" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="seller/orders" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="seller/studio" options={{ presentation: 'modal' }} />
          <Stack.Screen name="seller/verification" options={{ presentation: 'fullScreenModal' }} />
          
          <Stack.Screen name="checkout/index" options={{ presentation: 'card', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="orders/index" options={{ animation: 'slide_from_left' }} />
          <Stack.Screen name="orders/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="product/[id]" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="story-viewer/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack>

        {showGlobalUI && (
          <FloatingCart onPress={() => router.push('/checkout')} />
        )}
      </SafeAreaView>
    </ThemeProvider>
  );
}