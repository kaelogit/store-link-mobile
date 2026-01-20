import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Dimensions, TouchableOpacity, Alert, Platform } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { ShieldAlert, Sparkles, ShoppingBag } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// 💎 SPEED ENGINE
import { useQueryClient } from '@tanstack/react-query';

// App Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';
import { useCartStore } from '../store/useCartStore';
import { useUserStore } from '../store/useUserStore';
import { useCheckoutProtocol } from '../hooks/useCheckoutProtocol';

// Modular Components
import { CheckoutForm } from './cart/CheckoutForm';
import { VendorOrderBlock } from './cart/VendorOrderBlock';
import { OrderSuccessModal } from './OrderSuccessModal';

const { width } = Dimensions.get('window');

/**
 * 🏰 CART ORCHESTRATOR v100.0 (Sheet Version)
 * Purpose: Manages the checkout process via a modern Bottom Sheet overlay.
 * Logic: Groups items by store, handles self-purchase security, and executes Chat Escrow.
 */
export const CartSheet = ({ sheetRef }: { sheetRef: any }) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const queryClient = useQueryClient();
  
  const { cart, removeFromCart, useCoins, setUseCoins } = useCartStore();
  const { profile } = useUserStore();
  const { executeOrder, isProcessing } = useCheckoutProtocol();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successStore, setSuccessStore] = useState('');
  const [activeSellerId, setActiveSellerId] = useState<string | undefined>(undefined);

  // 🛡️ DELIVERY INFO SYNC
  useEffect(() => {
    if (profile?.location && !deliveryAddress) {
      setDeliveryAddress(profile.location);
    }
  }, [profile]);

  /** 🏗️ ORDER GROUPING: Groups items by store to create separate orders */
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

  const onHandleCheckout = async (seller: any, items: any[]) => {
    // 🛡️ SECURITY CHECK: Prevent buying from your own store
    if (seller.id === profile?.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert("CHECKOUT ERROR", "You cannot purchase items from your own store.");
    }

    if (!deliveryAddress.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert("MISSING INFO", "Please provide a delivery address to complete your order.");
    }

    try {
      setActiveSellerId(seller.id);
      
      // Process order through the chat system
      const res = await executeOrder({
        seller,
        items,
        deliveryAddress,
        channel: 'CHAT' 
      }) as any;

      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      if (res) {
        setSuccessStore(res.storeName || seller.display_name);
        setShowSuccess(true);
        // Only close sheet if cart is now empty or this was the only order
        if (Object.keys(cartByVendor).length <= 1) {
            sheetRef.current?.close();
        }
      }
    } catch (err: any) {
      console.error("Order processing failed:", err.message);
      Alert.alert("Error", "We couldn't complete this order.");
    }
  };

  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop 
        {...props} 
        disappearsOnIndex={-1} 
        appearsOnIndex={0} 
        opacity={0.6} 
        pressBehavior="close"
    />
  ), []);

  return (
    <>
      <BottomSheet 
        ref={sheetRef} 
        index={-1} 
        snapPoints={['75%', '92%']} 
        enablePanDownToClose 
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: theme.subtext, width: 40, height: 4 }}
        backgroundStyle={{ borderRadius: 36, backgroundColor: theme.background }}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
        >
          {/* 🏛️ HEADER */}
          <View style={styles.header}>
             <ShoppingBag size={20} color={theme.text} strokeWidth={2.5} />
             <Text style={[styles.headerTitle, { color: theme.text }]}>YOUR SHOPPING BAG</Text>
          </View>
          
          <CheckoutForm address={deliveryAddress} setAddress={setDeliveryAddress} />

          {/* 💰 STORE REWARDS */}
          {(profile?.coin_balance || 0) > 0 && (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setUseCoins(!useCoins);
              }}
              style={styles.walletAnchor}
            >
               <LinearGradient
                colors={useCoins ? ['#10B981', '#059669'] : [theme.surface, theme.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.coinBox, { borderColor: useCoins ? '#10B981' : theme.border }]}
               >
                  <View style={styles.walletInfo}>
                    <View style={styles.walletLabelRow}>
                      <Sparkles size={12} color={useCoins ? 'white' : Colors.brand.gold} fill={useCoins ? 'white' : Colors.brand.gold} />
                      <Text style={[styles.coinLabel, { color: useCoins ? 'white' : theme.subtext }]}>STORE COINS</Text>
                    </View>
                    <Text style={[styles.coinBalance, { color: useCoins ? 'white' : theme.text }]}>
                        ₦{(profile?.coin_balance || 0).toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={[styles.togglePill, { backgroundColor: useCoins ? 'rgba(255,255,255,0.2)' : theme.text }]}>
                    <Text style={[styles.toggleText, { color: useCoins ? 'white' : theme.background }]}>
                        {useCoins ? 'APPLIED' : 'USE REWARDS'}
                    </Text>
                  </View>
               </LinearGradient>
            </TouchableOpacity>
          )}

          {/* 🛒 STORE GROUPS */}
          {Object.values(cartByVendor).length === 0 ? (
             <View style={styles.emptyContainer}>
                 <ShoppingBag size={48} color={theme.border} strokeWidth={1.5} />
                 <Text style={[styles.emptyText, { color: theme.subtext }]}>Your bag is empty.</Text>
             </View>
          ) : (
             Object.values(cartByVendor).map(({ seller, items, isRestricted }: any) => (
                <View key={seller.id} style={styles.vendorWrapper}>
                  {isRestricted && (
                    <View style={[styles.restrictionBanner, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                      <ShieldAlert size={14} color="#EF4444" strokeWidth={2.5} />
                      <Text style={styles.restrictionText}>SYSTEM LOCK: SELF-PURCHASE RESTRICTED</Text>
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
                    onCheckout={() => onHandleCheckout(seller, items)}
                  />
                </View>
             ))
          )}

          <View style={{ height: 100 }} />
        </BottomSheetScrollView>
      </BottomSheet>

      <OrderSuccessModal 
        visible={showSuccess} 
        storeName={successStore} 
        storeId={activeSellerId}
        onClose={() => setShowSuccess(false)} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  scrollContent: { padding: 25 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25, justifyContent: 'center' },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  
  vendorWrapper: { marginBottom: 25 },
  
  walletAnchor: { marginBottom: 30 },
  coinBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1.5,
  },
  walletInfo: { gap: 6 },
  walletLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  coinBalance: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  togglePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  toggleText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  restrictionBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    padding: 12, 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
  },
  restrictionText: { fontSize: 9, fontWeight: '900', color: '#EF4444', letterSpacing: 0.5 },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 50, gap: 15 },
  emptyText: { fontSize: 14, fontWeight: '700' }
});