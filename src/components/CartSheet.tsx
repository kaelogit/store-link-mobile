import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Dimensions, TouchableOpacity, Alert, Platform } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { ShieldAlert, Sparkles, ShoppingBag, Zap, MessageSquare } from 'lucide-react-native';
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
 * 🏰 CART ORCHESTRATOR v77.0
 * Purpose: Manages the checkout process, group orders by store, and handles rewards.
 * Logic: All orders are routed through the secure in-app messenger.
 * Security: Prevents self-purchases and ensures delivery information is complete.
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
      });

      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      if (res) {
        // @ts-ignore
        setSuccessStore(res.storeName || seller.display_name);
        setShowSuccess(true);
        if (Object.keys(cartByVendor).length <= 1) sheetRef.current?.close();
      }
    } catch (err: any) {
      console.error("Order processing failed:", err.message);
    }
  };

  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  ), []);

  return (
    <>
      <BottomSheet 
        ref={sheetRef} 
        index={-1} 
        snapPoints={['70%', '94%']} 
        enablePanDownToClose 
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: theme.border, width: 36 }}
        backgroundStyle={{ borderRadius: 45, backgroundColor: theme.background }}
        keyboardBehavior="interactive"
      >
        <BottomSheetScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
        >
          {/* 🏛️ HEADER */}
          <View style={styles.header}>
             <ShoppingBag size={20} color={theme.text} strokeWidth={3} />
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
          {Object.values(cartByVendor).map(({ seller, items, isRestricted }: any) => (
            <View key={seller.id} style={styles.vendorWrapper}>
              {isRestricted && (
                <BlurView intensity={20} style={styles.restrictionBanner}>
                  <ShieldAlert size={14} color="#EF4444" strokeWidth={3} />
                  <Text style={styles.restrictionText}>SYSTEM LOCK: SELF-PURCHASE RESTRICTED</Text>
                </BlurView>
              )}
              
              <VendorOrderBlock 
                store={seller}
                items={items}
                useCoins={useCoins}
                coinBalance={profile?.coin_balance || 0}
                isLoading={isProcessing}
                isDisabled={isRestricted}
                onRemove={removeFromCart}
                onCheckout={() => onHandleCheckout(seller, items)}
              />
            </View>
          ))}

          <View style={{ height: 120 }} />
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
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  vendorWrapper: { marginBottom: 25 },
  walletAnchor: { marginBottom: 30 },
  coinBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    borderRadius: 30, 
    borderWidth: 1.5,
  },
  walletInfo: { gap: 4 },
  walletLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  coinBalance: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  togglePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  toggleText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  restrictionBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    padding: 14, 
    borderRadius: 20, 
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)'
  },
  restrictionText: { fontSize: 9, fontWeight: '900', color: '#EF4444', letterSpacing: 0.5 },
});