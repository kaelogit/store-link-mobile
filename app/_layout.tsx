import { useEffect, useState, useRef } from 'react';
import { StatusBar, Platform, View as RNView, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar'; 
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants'; // 🛡️ Added for environment detection
import FontAwesome from '@expo/vector-icons/FontAwesome';
import 'react-native-reanimated';

// 💎 DIAMOND SPEED ENGINE
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// App Ecosystem
import { supabase } from '../src/lib/supabase';
import { useColorScheme } from '../src/components/useColorScheme';
import { FloatingCart } from '../src/components/FloatingCart';
import { CartSheet } from '../src/components/CartSheet';
import { useUserStore } from '../src/store/useUserStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications'; 
import { useHeartbeat } from '../src/hooks/useHeartbeat'; 
import Colors from '../src/constants/Colors';

export { ErrorBoundary } from 'expo-router';

// Cache Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Configure Notification Behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <RootLayoutNav />
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const cartSheetRef = useRef<any>(null);
  
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { refreshUserData, clearUser } = useUserStore();
  const { registerForPushNotificationsAsync } = usePushNotifications(); 
  
  // 🛡️ HEARTBEAT
  useHeartbeat();

  /** 🛡️ NOTIFICATION DEEP LINKING */
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data.screen === 'orders') {
        router.push('/seller/orders');
      } else if (data.productId) {
        router.push(`/product/${data.productId}`);
      } else if (data.chatId) {
        router.push(`/chat/${data.chatId}`);
      } else if (data.url) {
        router.push(data.url as any);
      }
    });

    return () => subscription.remove();
  }, []);

  /** 🛡️ ANDROID HARDWARE SYNC */
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
      NavigationBar.setBackgroundColorAsync('transparent');
    }
  }, [colorScheme]);

  /** 🛡️ NAVIGATION & AUTH GATE */
  const runStartupLogic = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentSegments = segments as string[];
      
      if (!currentSegments || currentSegments.length === 0) return;
      const rootSegment = currentSegments[0];

      if (!session) {
        if (rootSegment !== 'auth') router.replace('/auth/login');
        return;
      }

      if (!useUserStore.getState().profile) {
        await refreshUserData();
      }
      
      const finalProfile = useUserStore.getState().profile;
      if (!finalProfile) return;

      // 🛡️ NOTIFICATION SHIELD: Prevents registration inside standard Expo Go on Android
      const isExpoGoOnAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';
      if (!isExpoGoOnAndroid) {
        registerForPushNotificationsAsync(finalProfile.id);
      } else {
        console.log("🛡️ Push registration skipped: App is running in Expo Go on Android.");
      }

      if (!finalProfile.is_verified) {
        if (!currentSegments.includes('verify')) {
          router.replace({ 
            pathname: '/auth/verify', 
            params: { email: session.user.email, type: 'signup' } 
          });
        }
        return;
      } 

      if (!finalProfile.onboarding_completed) {
        if (rootSegment !== 'onboarding') router.replace('/onboarding/role-setup');
        return;
      } 

      const restrictedZones = ['auth', 'onboarding'];
      if (restrictedZones.includes(rootSegment)) {
        router.replace('/(tabs)');
      }

    } catch (e) {
      console.error("App Boot Error:", e);
    } finally {
      setIsAuthReady(true);
    }
  };

  useEffect(() => {
    runStartupLogic();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        clearUser();
        queryClient.clear();
        router.replace('/auth/login');
      } else if (event === 'SIGNED_IN') {
        runStartupLogic();
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [segments]); 

  useEffect(() => {
    if (isAuthReady) {
      setTimeout(() => SplashScreen.hideAsync(), 500);
    }
  }, [isAuthReady]);

  if (!isAuthReady) return null;

  // 🛡️ SMART CART VISIBILITY: Only show on "Shopper" screens
  const activeSegment = segments[0] as string | undefined;
  const showCart = [
    '(tabs)', 
    'product', 
    'search', 
    'wishlist',
    'profile'
  ].includes(activeSegment || '');

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        
        {/* AUTH */}
        <Stack.Screen name="auth/login" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="auth/signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/verify" options={{ presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ presentation: 'modal' }} />
        <Stack.Screen name="auth/update-password" options={{ presentation: 'modal' }} />

        {/* ONBOARDING */}
        <Stack.Screen name="onboarding/role-setup" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/setup" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/collector-setup" options={{ animation: 'slide_from_right' }} />

        {/* GLOBAL SCREENS */}
        <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="activity" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />

        {/* SELLER STUDIO */}
        <Stack.Screen name="seller/dashboard" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seller/verification" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="seller/post-product" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="seller/post-reel" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="seller/post-story" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="seller/inventory" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seller/orders" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seller/loyalty" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seller/earnings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seller/settlement" options={{ animation: 'slide_from_right' }} />

        {/* COMMERCE & CHAT */}
        <Stack.Screen name="product/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="product/[id]/feed" options={{ animation: 'fade' }} />
        <Stack.Screen name="chat/[chatId]" options={{ animation: 'slide_from_right' }} /> 
        
        <Stack.Screen name="orders/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="orders/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="orders/refund" options={{ presentation: 'modal' }} />

        {/* WALLET */}
        <Stack.Screen name="wallet/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="wallet/withdraw" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="payout/[id]" options={{ presentation: 'modal' }} />

        {/* SUB-SCREENS */}
        <Stack.Screen name="settings/blocked-users" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="activity/notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="activity/profile-views" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="activity/support-new" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="activity/support-history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="activity/support-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="story-viewer/[id]" options={{ animation: 'fade', presentation: 'transparentModal' }} />
        <Stack.Screen name="wishlist/index" options={{ animation: 'slide_from_right' }} />
      </Stack>

      {showCart && (
         <FloatingCart onPress={() => cartSheetRef.current?.expand()} /> 
      )}
      <CartSheet sheetRef={cartSheetRef} />

    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});