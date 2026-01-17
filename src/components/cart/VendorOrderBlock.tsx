import React from 'react';
import { 
  ActivityIndicator, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { 
  MessageSquare, 
  Send, 
  ShoppingBag, 
  Trash2, 
  Zap, 
  ShieldAlert 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';
import { useUserStore } from '../../store/useUserStore';

interface VendorOrderBlockProps {
  store: { 
    id: string; 
    display_name?: string; 
    logo_url?: string; 
    loyalty_enabled?: boolean; 
    loyalty_percentage?: number 
  };
  items: any[];
  useCoins: boolean;
  coinBalance: number;
  isLoading: boolean;
  isDisabled?: boolean; 
  onRemove: (id: string) => void;
  onCheckout: (channel: 'WHATSAPP' | 'CHAT') => void;
}

/**
 * 🏰 VENDOR ORDER BLOCK v75.1 (Pure Build)
 * Audited: Section IV Anti-Wash Trading & 5% Margin Protection.
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
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // 🛡️ SECURITY: Detect Ownership Conflict (Anti-Wash Trading)
  const isSelf = store.id === profile?.id;
  const finalDisabledState = isDisabled || isSelf || isLoading;

  // 🏛️ FINANCIAL ENGINE
  const storeSubtotal = items.reduce((sum, i) => sum + (i.product.price * (i.qty || 1)), 0);
  
  // 🛡️ MARGIN PROTECTION: Strict 5% Marketplace Cap
  const maxDiscountAllowed = Math.floor(storeSubtotal * 0.05); 
  
  // 💰 DYNAMIC COIN CALCULATION
  const appliedDiscount = (useCoins && !isSelf) ? Math.min(coinBalance, maxDiscountAllowed) : 0;
  const finalTotal = storeSubtotal - appliedDiscount;

  // 💎 REWARD ENGINE (Next-Purchase Incentive)
  const loyaltyPercentage = store.loyalty_percentage || 0;
  const earnedCoins = (store.loyalty_enabled && !isSelf) 
    ? Math.floor(finalTotal * (loyaltyPercentage / 100)) 
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderColor: theme.border }, isSelf && styles.restrictedContainer]}>
      
      {/* 👤 SHOP HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <View style={[styles.storeMeta, { backgroundColor: 'transparent' }]}>
            <View style={[styles.storeIconFrame, { backgroundColor: theme.surface }]}>
              {store.logo_url ? (
                <Image source={{ uri: store.logo_url }} style={styles.storeLogo} />
              ) : (
                <ShoppingBag size={14} color={theme.text} />
              )}
            </View>
            <View style={{backgroundColor: 'transparent'}}>
              <Text style={[styles.vendorLabel, { color: theme.subtext }]}>SHOP INFO</Text>
              <Text style={[styles.vendorName, { color: theme.text }]}>{store.display_name?.toUpperCase() || 'MERCHANT'}</Text>
            </View>
        </View>
        
        <View style={[styles.priceMeta, { backgroundColor: 'transparent' }]}>
            {appliedDiscount > 0 && (
              <Text style={[styles.strikethroughPrice, { color: theme.subtext }]}>₦{storeSubtotal.toLocaleString()}</Text>
            )}
            <Text style={[styles.finalPrice, { color: Colors.brand.emerald }]}>₦{finalTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* 🛒 ITEMS */}
      <View style={[styles.manifest, { backgroundColor: 'transparent' }]}>
        {items.map((item) => (
          <View key={item.product.id} style={[styles.itemRow, { backgroundColor: 'transparent' }]}>
            <Image 
              source={{ uri: item.product.image_urls?.[0] }} 
              style={styles.productThumb} 
            />
            <View style={[styles.productDetails, { backgroundColor: 'transparent' }]}>
              <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>{item.product.name.toUpperCase()}</Text>
              <Text style={[styles.productPricing, { color: theme.subtext }]}>
                {item.qty} x ₦{item.product.price.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRemove(item.product.id);
              }} 
              style={styles.removeBtn}
            >
              <Trash2 color={theme.border} size={18} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 🛡️ SECURITY ALERT */}
      {isSelf && (
        <View style={[styles.restrictedBanner, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
          <ShieldAlert size={14} color="#EF4444" />
          <Text style={styles.restrictedText}>YOU CANNOT BUY FROM YOUR OWN SHOP</Text>
        </View>
      )}

      {/* ⚡ REWARDS SIGNAL */}
      {store.loyalty_enabled && !isSelf && (
        <View style={[styles.loyaltyBanner, { backgroundColor: Colors.brand.emerald + '15' }]}>
           <Zap size={14} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
           <Text style={[styles.loyaltyText, { color: theme.text }]}>
             EARN <Text style={{ color: Colors.brand.emerald, fontWeight: '900' }}>+₦{earnedCoins.toLocaleString()}</Text> IN COINS
           </Text>
        </View>
      )}

      {/* 🕹️ ACTIONS */}
      <View style={[styles.actionGrid, { backgroundColor: 'transparent' }]}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.actionBtn, { backgroundColor: theme.surface }, finalDisabledState && styles.btnDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCheckout('CHAT');
          }}
          disabled={finalDisabledState}
        >
          <MessageSquare color={theme.text} size={18} strokeWidth={2.5} />
          <Text style={[styles.secondaryBtnText, { color: theme.text }]}>CHAT</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.actionBtn, { backgroundColor: theme.text, flex: 1 }, finalDisabledState && styles.btnDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onCheckout('WHATSAPP');
          }}
          disabled={finalDisabledState}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.background} size={20} />
          ) : (
            <>
              <Send color={theme.background} size={18} strokeWidth={2.5} />
              <Text style={[styles.primaryBtnText, { color: theme.background }]}>ORDER ON WHATSAPP</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    padding: 24, 
    borderRadius: 35, 
    marginBottom: 20, 
    borderWidth: 1.5, 
  },
  restrictedContainer: { 
    borderColor: '#EF4444', 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 20, 
    paddingBottom: 15,
    borderBottomWidth: 1,
    backgroundColor: 'transparent'
  },
  storeMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeIconFrame: { 
    width: 40, 
    height: 40, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden'
  },
  storeLogo: { width: '100%', height: '100%', resizeMode: 'cover' },
  vendorLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  vendorName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  priceMeta: { alignItems: 'flex-end' },
  strikethroughPrice: { fontSize: 10, textDecorationLine: 'line-through', fontWeight: '800' },
  finalPrice: { fontSize: 24, fontWeight: '900', letterSpacing: -1.2 },
  manifest: { marginBottom: 15 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  productThumb: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#F9FAFB' },
  productDetails: { flex: 1 },
  productName: { fontWeight: '900', fontSize: 12, letterSpacing: 0.2 },
  productPricing: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  removeBtn: { padding: 10, backgroundColor: 'transparent' },
  loyaltyBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    padding: 14, 
    borderRadius: 20, 
    marginBottom: 20 
  },
  loyaltyText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  restrictedBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    padding: 14, 
    borderRadius: 18, 
    marginBottom: 20, 
    borderWidth: 1, 
  },
  restrictedText: { fontSize: 9, fontWeight: '900', color: '#EF4444', letterSpacing: 0.5 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 18, 
    borderRadius: 24 
  },
  btnDisabled: { opacity: 0.15 },
  secondaryBtnText: { fontWeight: '900', fontSize: 11 },
  primaryBtnText: { fontWeight: '900', fontSize: 11, letterSpacing: 1 }
});