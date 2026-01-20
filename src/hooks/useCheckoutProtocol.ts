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
 * 🛒 CHECKOUT PROCESS v94.0
 * Purpose: Secure transaction and chat anchoring.
 * Handshake: Profiles + Orders + Chats are now unified.
 * Update: Standardized 'content' field and added 'channel' param.
 */
export const useCheckoutProtocol = () => {
  const queryClient = useQueryClient();
  const { profile: currentUser, refreshUserData } = useUserStore();
  const { removeFromCart, useCoins } = useCartStore();

  const checkoutMutation = useMutation({
    mutationFn: async ({ seller, items, deliveryAddress, channel }: { 
      seller: SellerMinimal, 
      items: any[], 
      deliveryAddress: string, 
      channel?: string // <--- Added to fix TS Error in Checkout/CartSheet
    }) => {
      
      // 1. CHAT ANCHORING: Find or create the conversation thread
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .upsert({ 
          buyer_id: currentUser?.id, 
          seller_id: seller.id,
          updated_at: new Date().toISOString() 
        }, { onConflict: 'buyer_id,seller_id' })
        .select()
        .single();

      if (chatError) throw new Error("Connection failed: Could not open secure chat channel.");

      // 2. PRICE CALCULATION
      const storeSubtotal = items.reduce((sum, i) => sum + (i.product.price * (i.qty || 1)), 0);
      const coinsToApply = useCoins ? Math.min(currentUser?.coin_balance || 0, Math.floor(storeSubtotal * 0.05)) : 0;
      const finalPayable = storeSubtotal - coinsToApply;

      // 3. ATOMIC ORDER CREATION: Linking everything to the chat_id
      const { data: orderId, error: orderError } = await supabase.rpc('create_pure_order', {
        p_seller_id: seller.id,
        p_user_id: currentUser?.id,
        p_total_amount: finalPayable,
        p_coin_redeemed: coinsToApply,
        p_delivery_address: deliveryAddress,
        p_chat_id: chat.id, // THE WIRE
        p_order_items: items.map(i => ({
          product_id: i.product.id,
          quantity: i.qty || 1,
          unit_price: i.product.price
        }))
      });

      if (orderError) throw orderError;

      // 4. WALLET SETTLEMENT (Deduct Coins)
      if (coinsToApply > 0 && currentUser?.id) {
        const { error: coinError } = await supabase.rpc('process_marketplace_checkout', {
          p_user_id: currentUser.id,
          p_coins_used: coinsToApply
        });
        if (coinError) throw coinError;
      }

      // 5. SYSTEM MESSAGE: Post receipt to the chat
      // 🛠️ FIXED: Changed 'text' to 'content' to match chat/[chatId].tsx
      await supabase.from('messages').insert({
        chat_id: chat.id,
        sender_id: currentUser?.id,
        content: `🛍️ NEW ORDER PLACED: #${orderId.slice(0,8).toUpperCase()}\nTotal: ₦${finalPayable.toLocaleString()}`,
        type: 'text', // Using 'text' type but formatted as system info
        is_read: false
      });

      return { 
        orderId, 
        chatId: chat.id,
        storeName: seller.display_name, 
        total: finalPayable, 
        discount: coinsToApply 
      };
    },

    onMutate: async (variables) => {
      // Clear cart items instantly for a fast feel
      variables.items.forEach(i => removeFromCart(i.product.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    onSuccess: async () => {
      // Refresh all related data caches
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
      await refreshUserData();
    },

    onError: (err: any) => {
      Alert.alert("Checkout Error", err.message || "Something went wrong.");
    }
  });

  return { 
    executeOrder: checkoutMutation.mutateAsync, 
    isProcessing: checkoutMutation.isPending 
  };
};