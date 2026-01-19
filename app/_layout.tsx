import { useEffect, useState } from 'react';
import { StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar'; 
import * as Notifications from 'expo-notifications';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import 'react-native-reanimated';

// 💎 DIAMOND SPEED ENGINE
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// App Ecosystem
import { supabase } from '../src/lib/supabase';
import { useColorScheme } from '../src/components/useColorScheme';
import { FloatingCart } from '../src/components/FloatingCart';
import { useUserStore } from '../src/store/useUserStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications'; 
import { useHeartbeat } from '../src/hooks/useHeartbeat'; // 🛡️ NEW: Activity Heartbeat
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
          <RootLayoutNav />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { refreshUserData, clearUser, profile } = useUserStore();
  const { registerForPushNotificationsAsync } = usePushNotifications(); 
  
  // 🛡️ HEARTBEAT: Silently keeps the user's "Online" status alive
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

      // 1. If not logged in, force to login screen
      if (!session) {
        if (rootSegment !== 'auth') router.replace('/auth/login');
        return;
      }

      // 2. Load Profile into Global Store
      if (!useUserStore.getState().profile) {
        await refreshUserData();
      }
      
      const finalProfile = useUserStore.getState().profile;
      if (!finalProfile) return;

      // 3. Register for Push Notifications once Profile is loaded
      registerForPushNotificationsAsync(finalProfile.id);

      // 4. Verification Check
      if (!finalProfile.is_verified) {
        if (!currentSegments.includes('verify')) {
          router.replace({ 
            pathname: '/auth/verify', 
            params: { email: session.user.email, type: 'signup' } 
          });
        }
        return;
      } 

      // 5. Onboarding Check
      if (!finalProfile.onboarding_completed) {
        if (rootSegment !== 'onboarding') router.replace('/onboarding/role-setup');
        return;
      } 

      // 6. Final Redirect: Prevent logged-in users from hitting Login/Onboarding
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

const showCart = (segments[0] as string) === '(tabs)' || (segments[0] as string) === 'product';
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/login" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="auth/signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/verify" options={{ presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="onboarding/role-setup" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding/setup" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="seller/verification" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="seller/post-product" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="seller/inventory" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seller/settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seller/loyalty" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="product/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/blocked-users" options={{ animation: 'slide_from_right' }} />
      </Stack>

      {showCart && (
         <FloatingCart onPress={() => router.push('/checkout')} /> 
      )}
    </ThemeProvider>
  );
}