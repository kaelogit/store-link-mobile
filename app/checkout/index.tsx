import React, { useMemo, useState, useEffect } from 'react';
import { 
  StyleSheet, Dimensions, TouchableOpacity, 
  ActivityIndicator, Alert, Platform, ScrollView, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ShieldAlert, Sparkles, ArrowLeft, ShoppingBag } from 'lucide-react-native';

// App Connection
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { useCartStore } from '../../src/store/useCartStore';
import { useUserStore } from '../../src/store/useUserStore';
import { useCheckoutProtocol } from '../../src/hooks/useCheckoutProtocol';

// Modular Components
import { CheckoutForm } from '../../src/components/cart/CheckoutForm';
import { VendorOrderBlock } from '../../src/components/cart/VendorOrderBlock';
import { OrderSuccessModal } from '../../src/components/OrderSuccessModal';

const { width } = Dimensions.get('window');

/**
 * 🛒 SECURE CHECKOUT v80.0
 * Purpose: Complete purchases using the internal chat system.
 * Language: Simple English, zero technical jargon.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const { cart, removeFromCart, useCoins, setUseCoins } = useCartStore();
  const { profile } = useUserStore();
  
  // Custom hook for processing orders
  const { executeOrder, isProcessing } = useCheckoutProtocol();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successStore, setSuccessStore] = useState('');
  const [activeSellerId, setActiveSellerId] = useState<string | undefined>(undefined);

  // Set default delivery address from profile
  useEffect(() => {
    if (profile?.location) {
      setDeliveryAddress(profile.location);
    }
  }, [profile]);

  /** 🛍️ Group cart items by their respective store */
  const cartByStore = useMemo(() => {
    return cart.reduce((acc: any, item: any) => {
      const sellerId = item.seller?.id;
      if (!sellerId) return acc;
      
      const isMyOwnStore = sellerId === profile?.id;
      
      if (!acc[sellerId]) {
        acc[sellerId] = { 
          seller: item.seller, 
          items: [],
          isRestricted: isMyOwnStore 
        };
      }
      acc[sellerId].items.push(item);
      return acc;
    }, {});
  }, [cart, profile?.id]);

  /** 🚀 Process the order through internal chat */
  const onHandleCheckout = async (seller: any, items: any[]) => {
    // Prevent merchants from purchasing from themselves
    if (seller.id === profile?.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert("Purchase Blocked", "You cannot buy items from your own store.");
    }

    if (!deliveryAddress.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert("Missing Address", "Please provide a delivery address before checking out.");
    }

    try {
      setActiveSellerId(seller.id);

      // Order processed strictly through internal CHAT
      const res = await executeOrder({
        seller,
        items,
        deliveryAddress,
        channel: 'CHAT' 
      }) as any; 

      if (res) {
        setSuccessStore(res.storeName || seller.display_name);
        setShowSuccess(true);
      }
    } catch (err: any) {
      console.error("Order process error:", err.message);
      Alert.alert("Checkout Failed", "We couldn't process your order right now.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>CHECKOUT</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* DELIVERY ADDRESS FORM */}
        <CheckoutForm address={deliveryAddress} setAddress={setDeliveryAddress} />

        {/* COIN DISCOUNT WALLET */}
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
            <View style={styles.coinInfo}>
               <View style={styles.coinLabelRow}>
                  <Sparkles size={10} color={useCoins ? Colors.brand.emerald : Colors.brand.gold} fill={useCoins ? Colors.brand.emerald : Colors.brand.gold} />
                  <Text style={[styles.coinLabel, { color: useCoins ? theme.background : Colors.brand.gold }]}>MY COINS</Text>
               </View>
               <Text style={[styles.coinBalance, { color: useCoins ? theme.background : theme.text }]}>
                 ₦{(profile?.coin_balance || 0).toLocaleString()}
               </Text>
            </View>
            <View style={[styles.coinToggle, { backgroundColor: useCoins ? 'rgba(255,255,255,0.2)' : Colors.brand.gold }]}>
               <Text style={[styles.toggleText, { color: 'white' }]}>
                 {useCoins ? 'APPLIED' : 'USE COINS'}
               </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* SHOPPING BAG CONTENT */}
        {Object.values(cartByStore).length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBag size={48} color={theme.border} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>YOUR BAG IS EMPTY</Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={[styles.shopBtn, { backgroundColor: theme.text }]}>
              <Text style={{ color: theme.background, fontWeight: '900' }}>START SHOPPING</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.values(cartByStore).map(({ seller, items, isRestricted }: any) => (
            <View key={seller.id} style={styles.storeContainer}>
              {isRestricted && (
                <View style={[styles.restrictionBanner, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                  <ShieldAlert size={14} color="#EF4444" />
                  <Text style={styles.restrictionText}>YOU CANNOT BUY FROM YOUR OWN STORE</Text>
                </View>
              )}
              
              <VendorOrderBlock 
                store={seller}
                items={items}
                useCoins={useCoins}
                coinBalance={profile?.coin_balance || 0}
                isLoading={isProcessing && activeSellerId === seller.id}
                isDisabled={isRestricted}
                onRemove={removeFromCart}
                // FIXED: Handshake simplified to zero parameters
                onCheckout={() => onHandleCheckout(seller, items)}
              />
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* SUCCESS MODAL */}
      <OrderSuccessModal 
        visible={showSuccess} 
        storeName={successStore} 
        storeId={activeSellerId}
        onClose={() => {
          setShowSuccess(false);
          // Return home if the cart is cleared
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
  storeContainer: { marginBottom: 20, backgroundColor: 'transparent' },
  coinBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 22, 
    borderRadius: 28, 
    borderWidth: 1.5, 
    marginBottom: 30,
  },
  coinInfo: { backgroundColor: 'transparent', gap: 4 },
  coinLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent' },
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