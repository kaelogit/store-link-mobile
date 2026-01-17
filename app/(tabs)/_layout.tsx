import React from 'react';
import { Tabs } from 'expo-router';
import { 
  Home, MessageCircle, User, 
  PlayCircle, Search 
} from 'lucide-react-native';
import { StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Sovereign Components
import { View } from '../../src/components/Themed';
import { useUserStore } from '../../src/store/useUserStore';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 MASTER TAB REGISTRY v80.0
 * Fixed: Removed "post" route error, removed labels, and reordered tabs.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { loading } = useUserStore();

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={Colors.brand.emerald} />
      </View>
    );
  }

  const BOTTOM_PADDING = insets.bottom > 0 ? insets.bottom : 12;
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 65 + BOTTOM_PADDING;

  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.subtext,
        headerShown: false,
        tabBarShowLabel: false, // 🛠️ FIX: Removes the text under icons
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView 
              intensity={80} 
              tint={colorScheme === 'dark' ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />
          )
        ),
        tabBarStyle: { 
          height: TAB_BAR_HEIGHT, 
          position: 'absolute', 
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 12,
          paddingBottom: BOTTOM_PADDING,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.background,
        },
      }}
      screenListeners={{
        state: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        tabBarIcon: ({ color, focused }) => (
          <View style={styles.iconContainer}>
             <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
             {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
          </View>
        ),
      }} />
      
      <Tabs.Screen name="explore" options={{
        tabBarIcon: ({ color, focused }) => (
          <View style={styles.iconContainer}>
             <PlayCircle size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
             {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
          </View>
        ),
      }} />

      <Tabs.Screen name="search" options={{
        tabBarIcon: ({ color, focused }) => (
          <View style={styles.iconContainer}>
             <Search size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
             {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
          </View>
        ),
      }} />

      <Tabs.Screen name="messages" options={{
        tabBarIcon: ({ color, focused }) => (
          <View style={styles.iconContainer}>
             <MessageCircle size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
             {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
          </View>
        ),
      }} />

      <Tabs.Screen name="profile" options={{
        tabBarIcon: ({ color, focused }) => (
          <View style={styles.iconContainer}>
             <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
             {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
          </View>
        ),
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: 40, 
    height: 35, 
    backgroundColor: 'transparent' 
  },
  activeDot: { 
    width: 4, 
    height: 4, 
    borderRadius: 2, 
    position: 'absolute', 
    bottom: -10 
  },
});