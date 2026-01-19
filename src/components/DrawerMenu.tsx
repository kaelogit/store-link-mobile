import React from 'react';
import { 
  StyleSheet, Modal, TouchableOpacity, 
  ScrollView, Platform, Dimensions 
} from 'react-native';
import { 
  LogOut, ShieldCheck, ChevronRight, LayoutDashboard, 
  ShoppingBag, Coins, X, Heart, Truck,
  Settings2, HelpCircle, Package 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// App Components
import { supabase } from '../lib/supabase';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { height } = Dimensions.get('window');

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isSeller: boolean;
}

/**
 * 🏰 DRAWER MENU v98.0
 * Purpose: Main navigation hub for account settings and store management.
 * Features: Shows different options depending on whether the user is a buyer or seller.
 */
export const DrawerMenu = ({ isOpen, onClose, isSeller }: DrawerMenuProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const navigateTo = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push(path as any);
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await supabase.auth.signOut();
    onClose();
    router.replace('/auth/login');
  };

  if (!isOpen) return null;

  return (
    <Modal 
      visible={isOpen} 
      transparent 
      animationType="slide" 
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.dismiss} 
          onPress={onClose} 
          activeOpacity={1} 
        />
        
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {/* Pull handle for visual cue */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[styles.scrollArea, { backgroundColor: 'transparent' }]}
          >
            <View style={[styles.headerRow, { backgroundColor: 'transparent' }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>MENU</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={22} color={theme.subtext} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* 🛠️ SHOP MANAGEMENT: Only visible for Sellers */}
            {isSeller ? (
              <View style={[styles.menuGroup, { backgroundColor: 'transparent' }]}>
                <Text style={[styles.groupLabel, { color: theme.subtext }]}>SHOP MANAGEMENT</Text>
                <MenuLink 
                  theme={theme}
                  icon={<Package size={20} color={Colors.brand.emerald} />} 
                  label="My Inventory" 
                  sub="Manage items & pricing"
                  onPress={() => navigateTo('/seller/inventory')} 
                />
                <MenuLink 
                  theme={theme}
                  icon={<LayoutDashboard size={20} color={Colors.brand.emerald} />} 
                  label="Sales Dashboard" 
                  sub="Track your earnings"
                  onPress={() => navigateTo('/seller/dashboard')} 
                />
                <MenuLink 
                  theme={theme}
                  icon={<Truck size={20} color={theme.text} />} 
                  label="Shipping" 
                  sub="Manage your deliveries"
                  onPress={() => navigateTo('/seller/logistics')} 
                />
                <MenuLink 
                  theme={theme}
                  icon={<ShieldCheck size={20} color="#3B82F6" />} 
                  label="Shop Status" 
                  sub="Verification details"
                  onPress={() => navigateTo('/seller/verification')} 
                />
              </View>
            ) : (
              /* 🚀 UPSELL: Encourage buyers to start selling */
              <TouchableOpacity 
                style={[styles.onboardingBanner, { backgroundColor: theme.text, borderColor: theme.border }]}
                onPress={() => navigateTo('/onboarding/setup')}
              >
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                    <Text style={[styles.bannerTitle, { color: theme.background }]}>Start Selling</Text>
                    <Text style={[styles.bannerSub, { color: theme.background + '80' }]}>Open your shop and reach more customers.</Text>
                </View>
                <ChevronRight size={18} color={theme.background} strokeWidth={3} />
              </TouchableOpacity>
            )}

            {/* 🛒 PERSONAL HUB */}
            <View style={[styles.menuGroup, { backgroundColor: 'transparent' }]}>
              <Text style={[styles.groupLabel, { color: theme.subtext }]}>PERSONAL</Text>
              <MenuLink 
                theme={theme}
                icon={<Coins size={20} color={Colors.brand.gold} fill={Colors.brand.gold} />} 
                label="My Wallet" 
                sub="View your coin balance"
                onPress={() => navigateTo('/wallet')} 
              />
              <MenuLink 
                theme={theme}
                icon={<ShoppingBag size={20} color={theme.text} />} 
                label="My Orders" 
                sub="History and tracking"
                onPress={() => navigateTo('/orders')} 
              />
              <MenuLink 
                theme={theme}
                icon={<Heart size={20} color="#EF4444" />} 
                label="Saved Items" 
                sub="Your personalized wishlist"
                onPress={() => navigateTo('/wishlist')} 
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.surface }]} />

            {/* ⚙️ SYSTEM SETTINGS */}
            <View style={[styles.menuGroup, { backgroundColor: 'transparent' }]}>
              <MenuLink 
                theme={theme}
                icon={<Settings2 size={20} color={theme.subtext} />} 
                label="App Settings" 
                onPress={() => navigateTo('/settings')} 
              />
              <MenuLink 
                theme={theme}
                icon={<HelpCircle size={20} color={theme.subtext} />} 
                label="Help & Support" 
                onPress={() => navigateTo('/activity/notifications')} 
              />
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color="#EF4444" size={20} strokeWidth={2.5} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const MenuLink = ({ icon, label, sub, onPress, theme }: any) => (
  <TouchableOpacity style={[styles.menuItem, { backgroundColor: 'transparent' }]} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>{icon}</View>
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      {sub && <Text style={[styles.menuSub, { color: theme.subtext }]}>{sub}</Text>}
    </View>
    <ChevronRight size={14} color={theme.border} strokeWidth={3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  content: { 
    borderTopLeftRadius: 45, 
    borderTopRightRadius: 45, 
    height: height * 0.9,
    paddingHorizontal: 25,
  },
  scrollArea: { paddingBottom: 60 },
  handle: { width: 40, height: 5, borderRadius: 10, alignSelf: 'center', marginVertical: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  closeBtn: { padding: 5 },
  menuGroup: { marginBottom: 32 },
  groupLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '800' },
  menuSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  onboardingBanner: { padding: 22, borderRadius: 28, flexDirection: 'row', alignItems: 'center', marginBottom: 35, borderWidth: 1 },
  bannerTitle: { fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },
  bannerSub: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  divider: { height: 1.5, marginBottom: 32 },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginTop: 10, 
    paddingVertical: 15, 
    marginBottom: Platform.OS === 'ios' ? 40 : 20 
  },
  logoutText: { color: '#EF4444', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }
});