import React, { memo } from 'react';
import { Tabs } from 'expo-router';
import { 
  Home, MessageCircle, User, 
  Play, Search 
} from 'lucide-react-native';
import { StyleSheet, Platform, ActivityIndicator, View as RNView } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 💎 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';

// App Connection
import { View, Text } from '../../src/components/Themed';
import { useUserStore } from '../../src/store/useUserStore';
import { supabase } from '../../src/lib/supabase';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 TAB NAVIGATION v106.0
 * Purpose: Global navigation with Immersive Glassmorphism.
 * Features: Presence Rings, Unread Sync, and Haptic Touch.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { profile, loading } = useUserStore();

  // 1. 🔔 UNREAD SYNC: Checks for new messages
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-total', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      try {
        const { data, error } = await supabase.rpc('get_total_unread_count', { 
          p_user_id: profile?.id 
        });
        if (error) throw error;
        return data || 0;
      } catch (e) {
        return 0;
      }
    },
    enabled: !!profile?.id,
    refetchInterval: 15000, // Balanced for battery life vs real-time
  });

  // 2. 🟢 PRESENCE SYNC: Checks if your store is currently active
  const isStoreOpen = profile?.is_store_open ?? false;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.brand.emerald} />
      </View>
    );
  }

  // 📐 DYNAMIC HEIGHT: Ensures perfect symmetry on all screen types
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 + insets.bottom / 2 : 70;

  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.subtext,
        headerShown: false,
        tabBarShowLabel: false, 
        tabBarHideOnKeyboard: true,
        tabBarStyle: { 
          height: TAB_BAR_HEIGHT, 
          position: 'absolute', 
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.background,
          // 🛡️ Push icons up on notched phones
          paddingBottom: Platform.OS === 'ios' ? insets.bottom - 10 : 0,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView 
              intensity={Platform.OS === 'ios' ? 85 : 100} 
              tint={colorScheme === 'dark' ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          ) : (
            <RNView style={[StyleSheet.absoluteFill, { 
              backgroundColor: theme.background, 
              borderTopWidth: 0.5, 
              borderTopColor: theme.border,
              opacity: 0.95
            }]} />
          )
        ),
      }}
      screenListeners={{
        tabPress: () => { 
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} color={color} focused={focused} />
      }} />
      
      <Tabs.Screen name="explore" options={{
        tabBarIcon: ({ color, focused }) => <TabIcon Icon={Play} color={color} focused={focused} />
      }} />

      <Tabs.Screen name="search" options={{
        tabBarIcon: ({ color, focused }) => <TabIcon Icon={Search} color={color} focused={focused} />
      }} />

      <Tabs.Screen name="messages" options={{
        tabBarIcon: ({ color, focused }) => (
          <RNView style={styles.iconContainer}>
            <TabIcon Icon={MessageCircle} color={color} focused={focused} />
            {unreadCount > 0 && (
              <RNView style={[styles.badge, { borderColor: theme.background }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </RNView>
            )}
          </RNView>
        ),
      }} />

      <Tabs.Screen name="profile" options={{
        tabBarIcon: ({ color, focused }) => (
          <RNView style={styles.iconContainer}>
            <RNView style={[
              styles.presenceRing, 
              { borderColor: isStoreOpen ? Colors.brand.emerald : 'transparent' }
            ]}>
              <TabIcon Icon={User} color={color} focused={focused} />
            </RNView>
          </RNView>
        ),
      }} />
    </Tabs>
  );
}

// 🧩 MEMOIZED ICON COMPONENT
const TabIcon = memo(({ Icon, color, focused }: { Icon: any, color: string, focused: boolean }) => (
  <View style={styles.iconWrapper}>
    <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
    {focused && <RNView style={[styles.activeDot, { backgroundColor: color }]} />}
  </View>
));

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconWrapper: { alignItems: 'center', justifyContent: 'center', height: '100%', width: 50, backgroundColor: 'transparent' },
  
  activeDot: { 
    width: 4, 
    height: 4, 
    borderRadius: 2, 
    position: 'absolute', 
    bottom: -8 
  },
  
  badge: {
    position: 'absolute',
    right: 4,
    top: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  badgeText: { color: 'white', fontSize: 8, fontWeight: '900' },
  
  presenceRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  }
});