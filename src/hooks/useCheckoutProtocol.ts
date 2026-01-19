import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import { useCartStore } from '../store/useCartStore';
import * as Haptics from 'expo-haptics';

// 🚀 SPEED ENGINE
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SellerMinimal {
  id: string;
  display_name: string;
}

/**
 * 🛒 CHECKOUT PROCESS v91.0
 * Purpose: A secure hook to finalize orders within the app.
 * Logic: Handles database order creation and coin wallet deduction in a single flow.
 * Features: Instant UI updates and hardware haptic feedback.
 */
export const useCheckoutProtocol = () => {
  const queryClient = useQueryClient();
  const { profile: currentUser, refreshUserData } = useUserStore();
  const { removeFromCart, useCoins } = useCartStore();

  const checkoutMutation = useMutation({
    mutationFn: async ({ seller, items, deliveryAddress }: { 
      seller: SellerMinimal, 
      items: any[], 
      deliveryAddress: string, 
      channel: 'CHAT' 
    }) => {
      
      // 1. CALCULATION: Apply discounts and determine final price
      const storeSubtotal = items.reduce((sum, i) => sum + (i.product.price * (i.qty || 1)), 0);
      const coinsToApply = useCoins ? Math.min(currentUser?.coin_balance || 0, Math.floor(storeSubtotal * 0.05)) : 0;
      const finalPayable = storeSubtotal - coinsToApply;

      // 2. SAVE ORDER: Creates the order and individual items in the database
      // Note: 'create_pure_order' is a secure database function handling multiple tables.
      const { data: orderId, error: orderError } = await supabase.rpc('create_pure_order', {
        p_seller_id: seller.id,
        p_user_id: currentUser?.id,
        p_total_amount: finalPayable,
        p_coin_redeemed: coinsToApply,
        p_delivery_address: deliveryAddress,
        p_order_items: items.map(i => ({
          product_id: i.product.id,
          quantity: i.qty || 1,
          unit_price: i.product.price
        }))
      });

      if (orderError) throw orderError;

      // 3. UPDATE WALLET: Deduct coins from the user's balance if applied
      if (coinsToApply > 0 && currentUser?.id) {
        const { error: coinError } = await supabase.rpc('process_marketplace_checkout', {
          p_user_id: currentUser.id,
          p_coins_used: coinsToApply
        });
        if (coinError) throw coinError;
      }

      // Return clean data for the UI success states
      return { 
        orderId, 
        storeName: seller.display_name, 
        total: finalPayable, 
        discount: coinsToApply 
      };
    },

    onMutate: async (variables) => {
      // 🏎️ Instant UI Updates: Clear local data immediately for a fast feel
      await queryClient.cancelQueries({ queryKey: ['user-profile'] });
      
      // Remove items from the cart state before the network request finishes
      variables.items.forEach(i => removeFromCart(i.product.id));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    onSuccess: async () => {
      // Refresh user and order data in the background
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await refreshUserData();
    },

    onError: (err: any) => {
      Alert.alert("Order Failed", err.message || "We couldn't process your order. Please check your connection.");
    }
  });

  return { 
    executeOrder: checkoutMutation.mutateAsync, 
    isProcessing: checkoutMutation.isPending 
  };
};