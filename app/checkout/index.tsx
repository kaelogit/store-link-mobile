import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, Dimensions, TouchableOpacity, 
  ActivityIndicator, Alert, Platform, ScrollView, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ShieldAlert, Sparkles, ArrowLeft, ShoppingBag } from 'lucide-react-native';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { useCartStore } from '../../src/store/useCartStore';
import { useUserStore } from '../../src/store/useUserStore';
import { useCheckoutProtocol } from '../../src/hooks/useCheckoutProtocol';

// 🏗️ Modular Registry
import { CheckoutForm } from '../../src/components/cart/CheckoutForm';
import { VendorOrderBlock } from '../../src/components/cart/VendorOrderBlock';
import { OrderSuccessModal } from '../../src/components/OrderSuccessModal';

const { width } = Dimensions.get('window');

/**
 * 🏰 CHECKOUT TERMINAL v78.6 (Pure Build)
 * Audited: Section IV Commercial Registry & Sovereign Handshake.
 * Resolved: Expo Router 'checkout/index' ghost route warning.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const { cart, removeFromCart, useCoins, setUseCoins } = useCartStore();
  const { profile } = useUserStore();
  const { executeOrder, loadingSellerId } = useCheckoutProtocol();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successStore, setSuccessStore] = useState('');
  const [activeChannel, setActiveChannel] = useState<'WHATSAPP' | 'CHAT' | null>(null);
  const [activeSellerId, setActiveSellerId] = useState<string | undefined>(undefined);
  const [whatsappUrl, setWhatsappUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (profile?.location) setDeliveryAddress(profile.location);
  }, [profile]);

  /** 🏗️ PARTITIONING BY SELLER IDENTITY (Section IV) */
  const cartByVendor = useMemo(() => {
    return cart.reduce((acc: any, item: any) => {
      const sellerId = item.seller?.id;
      if (!sellerId) return acc;
      const isSelfPurchase = sellerId === profile?.id;
      if (!acc[sellerId]) {
        acc[sellerId] = { 
          seller: item.seller, 
          items: [],
          isRestricted: isSelfPurchase 
        };
      }
      acc[sellerId].items.push(item);
      return acc;
    }, {});
  }, [cart, profile?.id]);

  const onHandleCheckout = async (seller: any, items: any[], channel: 'WHATSAPP' | 'CHAT') => {
    // 🛡️ ANTI-WASH TRADING GATE
    if (seller.id === profile?.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert("Access Denied", "You cannot purchase your own products.");
    }

    try {
      setActiveChannel(channel);
      setActiveSellerId(seller.id);
      const res = await executeOrder(seller, items, deliveryAddress, channel);
      setSuccessStore(res.storeName);
      if (channel === 'WHATSAPP' && res.url) setWhatsappUrl(res.url);
      setShowSuccess(true);
    } catch (err: any) {
      console.error("Checkout Registry Sync Error:", err.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>SECURE CHECKOUT</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <CheckoutForm address={deliveryAddress} setAddress={setDeliveryAddress} />

        {/* 💰 WALLET INTERFACE: Hardened 5% Logic (Section VI) */}
        {(profile?.coin_balance || 0) > 0 && (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[
              styles.coinBox, 
              { backgroundColor: theme.surface, borderColor: theme.border }, 
              useCoins && { backgroundColor: theme.text, borderColor: theme.text }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setUseCoins(!useCoins);
            }}
          >
            <View style={{ backgroundColor: 'transparent', gap: 4 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent' }}>
                  <Sparkles size={10} color={useCoins ? Colors.brand.emerald : Colors.brand.gold} fill={useCoins ? Colors.brand.emerald : Colors.brand.gold} />
                  <Text style={[styles.coinLabel, { color: useCoins ? theme.background : Colors.brand.gold }]}>COIN WALLET</Text>
               </View>
               <Text style={[styles.coinBalance, { color: useCoins ? theme.background : theme.text }]}>₦{(profile?.coin_balance || 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.coinToggle, { backgroundColor: useCoins ? 'rgba(255,255,255,0.2)' : Colors.brand.gold }]}>
               <Text style={[styles.toggleText, { color: 'white' }]}>{useCoins ? 'APPLIED' : 'USE COINS'}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 🛒 SHOP PARTITIONS (Manifest Section IV) */}
        {Object.values(cartByVendor).length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBag size={48} color={theme.border} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>YOUR BAG IS EMPTY</Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={[styles.shopBtn, { backgroundColor: theme.text }]}>
              <Text style={{ color: theme.background, fontWeight: '900' }}>CONTINUE EXPLORING</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.values(cartByVendor).map(({ seller, items, isRestricted }: any) => (
            <View key={seller.id} style={styles.vendorContainer}>
              {isRestricted && (
                <View style={[styles.restrictionBanner, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                  <ShieldAlert size={14} color="#EF4444" />
                  <Text style={styles.restrictionText}>OWNERSHIP CONFLICT: PURCHASE DISABLED</Text>
                </View>
              )}
              
              <VendorOrderBlock 
                store={seller}
                items={items}
                useCoins={useCoins}
                coinBalance={profile?.coin_balance || 0}
                isLoading={loadingSellerId === seller.id}
                isDisabled={isRestricted}
                onRemove={removeFromCart}
                onCheckout={(chan: 'WHATSAPP' | 'CHAT') => onHandleCheckout(seller, items, chan)}
              />
            </View>
          ))
        )}

        <View style={{ height: 100, backgroundColor: 'transparent' }} />
      </ScrollView>

      <OrderSuccessModal 
        visible={showSuccess} 
        storeName={successStore} 
        storeId={activeSellerId}
        whatsappUrl={whatsappUrl}
        channel={activeChannel}
        onClose={() => {
          setShowSuccess(false);
          if (cart.length === 0) router.replace('/(tabs)');
        }} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1.5,
    paddingTop: Platform.OS === 'android' ? 40 : 10
  },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  scrollContent: { padding: 25 },
  vendorContainer: { marginBottom: 20, backgroundColor: 'transparent' },
  coinBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 22, 
    borderRadius: 28, 
    borderWidth: 1.5, 
    marginBottom: 30,
  },
  coinLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  coinBalance: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  coinToggle: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  toggleText: { fontSize: 10, fontWeight: '900' },
  restrictionBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    padding: 12, 
    borderRadius: 18, 
    marginBottom: 12,
    borderWidth: 1,
  },
  restrictionText: { fontSize: 9, fontWeight: '900', color: '#EF4444', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 12, fontWeight: '900', marginTop: 20, letterSpacing: 1 },
  shopBtn: { marginTop: 30, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 20 }
});