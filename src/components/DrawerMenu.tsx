import React from 'react';
import { 
  StyleSheet, Modal, TouchableOpacity, 
  ScrollView, Platform, Dimensions, View as RNView 
} from 'react-native';
import { 
  LogOut, ShieldCheck, ChevronRight, LayoutDashboard, 
  ShoppingBag, Coins, X, Heart, Truck,
  Settings2, HelpCircle, Package, Gem, LifeBuoy
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// App Components
import { supabase } from '../lib/supabase';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { height, width } = Dimensions.get('window');

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isSeller: boolean;
}

/**
 * 🏰 DRAWER MENU v100.0 (High-End Edition)
 * Purpose: Central immersive navigation for the StoreLink ecosystem.
 * Features: Frosted glass backdrop, calibrated haptics, and adaptive seller logic.
 */
export const DrawerMenu = ({ isOpen, onClose, isSeller }: DrawerMenuProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const navigateTo = (path: string) => {
    Haptics.selectionAsync();
    onClose();
    // Use timeout to allow modal animation to clear before heavy route transition
    setTimeout(() => {
        router.push(path as any);
    }, 100);
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await supabase.auth.signOut();
    onClose();
    router.replace('/auth/login');
  };

  return (
    <Modal 
      visible={isOpen} 
      transparent 
      animationType="slide" 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.masterContainer}>
        {/* 💎 GLASS BACKDROP */}
        <BlurView 
            intensity={Platform.OS === 'ios' ? 30 : 60} 
            tint="dark" 
            style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity 
            style={styles.dismiss} 
            onPress={onClose} 
            activeOpacity={1} 
          />
        </BlurView>
        
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {/* DRAG INDICATOR */}
          <RNView style={[styles.handle, { backgroundColor: theme.border }]} />
          
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollArea}
          >
            <RNView style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>EXPLORE HUB</Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
                <X size={20} color={theme.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </RNView>

            {/* 🛠️ SHOP MANAGEMENT: The Seller Power Suite */}
            {isSeller ? (
              <RNView style={styles.menuGroup}>
                <Text style={[styles.groupLabel, { color: theme.subtext }]}>Merchant Terminal</Text>
                <MenuLink 
                  theme={theme}
                  icon={<LayoutDashboard size={20} color={Colors.brand.emerald} />} 
                  label="Sales Dashboard" 
                  sub="Revenue & analytics"
                  onPress={() => navigateTo('/seller/dashboard')} 
                />
                <MenuLink 
                  theme={theme}
                  icon={<Package size={20} color={Colors.brand.emerald} />} 
                  label="My Inventory" 
                  sub="Manage products"
                  onPress={() => navigateTo('/seller/inventory')} 
                />
                <MenuLink 
                  theme={theme}
                  icon={<Gem size={20} color="#8B5CF6" />} 
                  label="Shop Tier" 
                  sub="Diamond & Standard status"
                  onPress={() => navigateTo('/subscription')} 
                />
                <MenuLink 
                  theme={theme}
                  icon={<Truck size={20} color={theme.text} />} 
                  label="Logistics" 
                  sub="Order fulfillment"
                  onPress={() => navigateTo('/seller/logistics')} 
                />
              </RNView>
            ) : (
              <TouchableOpacity 
                activeOpacity={0.9}
                style={[styles.onboardingBanner, { backgroundColor: theme.text }]}
                onPress={() => navigateTo('/onboarding/setup')}
              >
                <RNView style={{ flex: 1 }}>
                    <Text style={[styles.bannerTitle, { color: theme.background }]}>Become a Seller</Text>
                    <Text style={[styles.bannerSub, { color: theme.background, opacity: 0.7 }]}>Open your shop and join the marketplace.</Text>
                </RNView>
                <ChevronRight size={18} color={theme.background} strokeWidth={3} />
              </TouchableOpacity>
            )}

            {/* 🛒 PERSONAL SUITE */}
            <RNView style={styles.menuGroup}>
              <Text style={[styles.groupLabel, { color: theme.subtext }]}>Account</Text>
              
              {!isSeller && (
                <MenuLink 
                  theme={theme}
                  icon={<Gem size={20} color="#8B5CF6" />} 
                  label="Diamond Badge" 
                  sub="Premium VIP status"
                  onPress={() => navigateTo('/subscription')} 
                />
              )}

              <MenuLink 
                theme={theme}
                icon={<Coins size={20} color={Colors.brand.gold} fill={Colors.brand.gold} />} 
                label="My Wallet" 
                sub="Earnings & transactions"
                onPress={() => navigateTo('/wallet')} 
              />
              <MenuLink 
                theme={theme}
                icon={<ShoppingBag size={20} color={theme.text} />} 
                label="My Purchases" 
                sub="Order history"
                onPress={() => navigateTo('/orders')} 
              />
              <MenuLink 
                theme={theme}
                icon={<Heart size={20} color="#EF4444" />} 
                label="Wishlist" 
                sub="Your saved discoveries"
                onPress={() => navigateTo('/wishlist')} 
              />
            </RNView>

            <RNView style={[styles.divider, { backgroundColor: theme.surface }]} />

            {/* ⚙️ SYSTEM & SUPPORT */}
            <RNView style={styles.menuGroup}>
              <MenuLink 
                theme={theme}
                icon={<Settings2 size={20} color={theme.subtext} />} 
                label="Settings" 
                onPress={() => navigateTo('/settings')} 
              />
              <MenuLink 
                theme={theme}
                icon={<LifeBuoy size={20} color={theme.subtext} />} 
                label="Help & Support" 
                onPress={() => navigateTo('/activity')} // Updated to modern activity/notifications
              />
            </RNView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <RNView style={styles.logoutCircle}>
                <LogOut color="#EF4444" size={18} strokeWidth={2.5} />
              </RNView>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const MenuLink = ({ icon, label, sub, onPress, theme }: any) => (
  <TouchableOpacity 
    style={styles.menuItem} 
    onPress={onPress}
    activeOpacity={0.6}
  >
    <RNView style={[styles.iconBox, { backgroundColor: theme.surface }]}>{icon}</RNView>
    <RNView style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      {sub && <Text style={[styles.menuSub, { color: theme.subtext }]}>{sub}</Text>}
    </RNView>
    <ChevronRight size={14} color={theme.border} strokeWidth={3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  masterContainer: { flex: 1, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  content: { 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    height: height * 0.88,
    width: '100%',
    paddingHorizontal: 25,
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
        android: { elevation: 20 }
    })
  },
  scrollArea: { 
    paddingBottom: 60, 
    backgroundColor: 'transparent' 
  },
  handle: { 
    width: 32, 
    height: 4, 
    borderRadius: 10, 
    alignSelf: 'center', 
    marginVertical: 15,
    opacity: 0.2
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 30,
    marginTop: 5
  },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  menuGroup: { marginBottom: 35 },
  groupLabel: { 
    fontSize: 11, 
    fontWeight: '800', 
    letterSpacing: 1, 
    marginBottom: 15, 
    textTransform: 'uppercase',
    opacity: 0.6
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    paddingVertical: 10,
    marginBottom: 4
  },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  menuLabel: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  menuSub: { fontSize: 12, fontWeight: '500', marginTop: 1, opacity: 0.6 },
  
  onboardingBanner: { 
    padding: 24, 
    borderRadius: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 35,
    elevation: 4
  },
  bannerTitle: { fontWeight: '900', fontSize: 16, letterSpacing: -0.2 },
  bannerSub: { fontSize: 12, marginTop: 4, fontWeight: '600', lineHeight: 18 },
  
  divider: { height: 1, marginBottom: 35, opacity: 0.5 },
  
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    marginTop: 10, 
    paddingVertical: 10,
    marginBottom: Platform.OS === 'ios' ? 40 : 20 
  },
  logoutCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 15, letterSpacing: -0.2 }
});