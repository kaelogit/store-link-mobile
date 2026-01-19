import React, { memo } from 'react';
import { Tabs } from 'expo-router';
import { 
  Home, MessageCircle, User, 
  Play, Search 
} from 'lucide-react-native';
import { StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App Components
import { View } from '../../src/components/Themed';
import { useUserStore } from '../../src/store/useUserStore';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 TAB NAVIGATION v83.0 - HARDWARE SYNC
 * Layout: Full Hardware Inset Logic (Edge-to-Edge Optimized).
 * Visual: Glassmorphic iOS layer / Solid Material Android layer.
 * Interaction: Tactile Haptic Handshake on index change.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { loading } = useUserStore();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.brand.emerald} />
      </View>
    );
  }

  // 🛡️ HARDWARE SPACING ENGINE (Dynamic calculation for 2026 flagships)
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68 + (insets.bottom > 0 ? insets.bottom / 2 : 0);

  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.subtext,
        headerShown: false,
        tabBarShowLabel: false, 
        tabBarHideOnKeyboard: true, // Prevents layout jitters during messaging
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView 
              intensity={Platform.OS === 'ios' ? 90 : 0} 
              tint={colorScheme === 'dark' ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.98 }]} />
          )
        ),
        tabBarStyle: { 
          height: TAB_BAR_HEIGHT, 
          position: 'absolute', 
          borderTopWidth: 0.5,
          borderTopColor: theme.border,
          elevation: 0, 
          shadowOpacity: 0.05,
          shadowRadius: 15,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.background,
        },
      }}
      screenListeners={{
        state: () => {
          // 🏎️ TACTILE HANDSHAKE: Lightweight feedback on tab switch
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={Home} color={color} focused={focused} />
        ),
      }} />
      
      <Tabs.Screen name="explore" options={{
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={Play} color={color} focused={focused} />
        ),
      }} />

      <Tabs.Screen name="search" options={{
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={Search} color={color} focused={focused} />
        ),
      }} />

      <Tabs.Screen name="messages" options={{
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={MessageCircle} color={color} focused={focused} />
        ),
      }} />

      <Tabs.Screen name="profile" options={{
        tabBarIcon: ({ color, focused }) => (
          <TabIcon Icon={User} color={color} focused={focused} />
        ),
      }} />
    </Tabs>
  );
}

/** 🛡️ MEMOIZED ICON ENGINE - Prevents render-jank during tab transitions */
const TabIcon = memo(({ Icon, color, focused }: { Icon: any, color: string, focused: boolean }) => (
  <View style={styles.iconWrapper}>
    <Icon 
      size={24} 
      color={color} 
      strokeWidth={focused ? 2.8 : 2.2} // Bolder stroke on focus for visual weight
    />
    {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
  </View>
));

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrapper: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100%',
    width: 50,
    backgroundColor: 'transparent'
  },
  activeDot: { 
    width: 4, 
    height: 4, 
    borderRadius: 2, 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 12 : 8, // Calibrated for notch & gesture bar
  },
});