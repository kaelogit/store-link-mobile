import React from 'react';
import { 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { 
  MessageSquare, 
  Trash2, 
  Zap, 
  ShieldAlert,
  Gem,
  Sparkles,
  ChevronRight
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';
import { useUserStore } from '../../store/useUserStore';

interface VendorOrderBlockProps {
  store: { 
    id: string; 
    display_name?: string; 
    logo_url?: string; 
    subscription_plan?: string;
    loyalty_enabled?: boolean; 
    loyalty_percentage?: number 
  };
  items: Array<{
    qty: number;
    product: {
      id: string;
      name: string;
      price: number;
      image_urls?: string[];
    }
  }>;
  useCoins: boolean;
  coinBalance: number;
  isLoading: boolean;
  isDisabled?: boolean; 
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

/**
 * 🏰 VENDOR ORDER BLOCK v79.0
 * Purpose: A dedicated container for items from a specific store within the cart.
 * Features: Automatic price calculation, premium store styling, and secure chat checkout.
 * Security: Prevents users from buying from their own store to ensure marketplace integrity.
 */
export const VendorOrderBlock = ({ 
  store, 
  items, 
  useCoins, 
  coinBalance, 
  isLoading, 
  isDisabled, 
  onRemove, 
  onCheckout 
}: VendorOrderBlockProps) => {
  const { profile } = useUserStore();
  const theme = Colors[useColorScheme() ?? 'light'];

  const isSelf = store.id === profile?.id;
  const isDiamond = store.subscription_plan === 'diamond';
  const finalDisabledState = isDisabled || isSelf || isLoading;

  /** 🛡️ PRICE CALCULATION LOGIC 
   * Calculates subtotal and applies a maximum 5% discount if coins are used.
   */
  const storeSubtotal = items.reduce((sum, i) => sum + (i.product.price * (i.qty || 1)), 0);
  const maxDiscountAllowed = Math.floor(storeSubtotal * 0.05); 
  const appliedDiscount = (useCoins && !isSelf) ? Math.min(coinBalance, maxDiscountAllowed) : 0;
  const finalTotal = storeSubtotal - appliedDiscount;

  // Calculate potential rewards earned from this specific purchase
  const earnedCoins = (store.loyalty_enabled && !isSelf) 
    ? Math.floor(finalTotal * ((store.loyalty_percentage || 0) / 100)) 
    : 0;

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.surface, borderColor: theme.border },
      isDiamond && styles.diamondBorder,
      isSelf && styles.restrictedContainer
    ]}>
      
      {/* 🏛️ STORE IDENTITY */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.storeMeta}>
            <View style={[styles.storeIconFrame, isDiamond && styles.diamondHalo]}>
              <Image 
                source={store.logo_url} 
                style={styles.storeLogo} 
                contentFit="cover" 
                transition={200}
                cachePolicy="memory-disk"
              />
            </View>
            <View style={styles.identityText}>
              <View style={styles.nameRow}>
                <Text style={[styles.vendorName, { color: theme.text }]}>{store.display_name?.toUpperCase()}</Text>
                {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />}
              </View>
              <Text style={[styles.vendorLabel, { color: theme.subtext }]}>{isDiamond ? 'PREMIUM STORE' : 'VERIFIED STORE'}</Text>
            </View>
        </View>
        
        <View style={styles.priceMeta}>
            <Text style={[styles.finalPrice, { color: theme.text }]}>₦{finalTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* 🛒 ITEMS IN ORDER */}
      <View style={styles.manifest}>
        {items.map((item) => (
          <View key={item.product.id} style={styles.itemRow}>
            <Image 
              source={item.product.image_urls?.[0]} 
              style={styles.productThumb} 
              contentFit="cover"
              transition={200}
            />
            <View style={styles.productDetails}>
              <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>{item.product.name.toUpperCase()}</Text>
              <Text style={[styles.productPricing, { color: theme.subtext }]}>
                {item.qty} UNIT{item.qty > 1 ? 'S' : ''} • ₦{item.product.price.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRemove(item.product.id);
              }} 
              style={styles.removeBtn}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Trash2 color={theme.subtext} size={18} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 💰 DISCOUNT SUMMARY */}
      {appliedDiscount > 0 && (
        <View style={[styles.savingsPill, { backgroundColor: `${Colors.brand.emerald}10` }]}>
            <Sparkles size={12} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
            <Text style={[styles.savingsText, { color: Colors.brand.emerald }]}>
              5% COIN DISCOUNT: <Text style={{fontWeight: '900'}}>-₦{appliedDiscount.toLocaleString()}</Text>
            </Text>
        </View>
      )}

      {/* 🛡️ SECURITY NOTE */}
      {isSelf && (
        <View style={styles.restrictedBanner}>
          <ShieldAlert size={14} color="#EF4444" />
          <Text style={styles.restrictedText}>SECURITY NOTE: YOU CANNOT BUY FROM YOUR OWN STORE</Text>
        </View>
      )}

      {/* ⚡ REWARDS ESTIMATE */}
      {store.loyalty_enabled && !isSelf && (
        <View style={[styles.loyaltyBanner, { backgroundColor: theme.background }]}>
            <Zap size={12} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
            <Text style={[styles.loyaltyText, { color: theme.subtext }]}>
              EARN <Text style={{ color: theme.text, fontWeight: '900' }}>+₦{earnedCoins.toLocaleString()}</Text> AFTER DELIVERY
            </Text>
        </View>
      )}

      {/* 🕹️ CHECKOUT ACTION */}
      <TouchableOpacity 
        activeOpacity={0.8}
        style={[styles.checkoutBtn, { backgroundColor: theme.text }, finalDisabledState && styles.btnDisabled]}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onCheckout();
        }}
        disabled={finalDisabledState}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.background} size="small" />
        ) : (
          <>
            <MessageSquare color={theme.background} size={20} strokeWidth={3} />
            <View style={styles.checkoutBtnTextContainer}>
              <Text style={[styles.btnText, { color: theme.background }]}>CHECKOUT VIA CHAT</Text>
              <Text style={[styles.btnSubtext, { color: theme.background }]}>PROTECTED BY STORELINK ESCROW</Text>
            </View>
            <ChevronRight color={theme.background} size={18} strokeWidth={3} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 22, borderRadius: 36, marginBottom: 20, borderWidth: 1.5 },
  diamondBorder: { borderColor: '#8B5CF6', borderWidth: 2.5 },
  diamondHalo: { borderColor: '#8B5CF6', borderWidth: 1.5 },
  restrictedContainer: { borderColor: '#EF4444', opacity: 0.8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityText: { backgroundColor: 'transparent' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  storeIconFrame: { width: 48, height: 48, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)' },
  storeLogo: { width: '100%', height: '100%' },
  vendorLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  vendorName: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  priceMeta: { alignItems: 'flex-end' },
  finalPrice: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  manifest: { marginBottom: 15 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 18 },
  productThumb: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.02)' },
  productDetails: { flex: 1 },
  productName: { fontWeight: '900', fontSize: 12, letterSpacing: 0.2 },
  productPricing: { fontSize: 10, fontWeight: '700', marginTop: 4, opacity: 0.5 },
  removeBtn: { padding: 10, opacity: 0.4 },
  savingsPill: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, marginBottom: 15 },
  savingsText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  loyaltyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16, marginBottom: 15, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.03)' },
  loyaltyText: { fontSize: 10, fontWeight: '800' },
  restrictedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16, marginBottom: 15, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  restrictedText: { fontSize: 9, fontWeight: '900', color: '#EF4444' },
  checkoutBtn: { height: 78, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, paddingHorizontal: 25 },
  checkoutBtnTextContainer: { flex: 1 },
  btnText: { fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  btnSubtext: { fontSize: 8, fontWeight: '900', opacity: 0.6, marginTop: 2 },
  btnDisabled: { opacity: 0.1 }
});