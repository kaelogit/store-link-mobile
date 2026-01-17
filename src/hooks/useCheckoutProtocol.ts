import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import { useCartStore } from '../store/useCartStore';
import * as Haptics from 'expo-haptics';

interface SellerMinimal {
  id: string;
  display_name: string;
  whatsapp_number: string;
}

/**
 * 🏰 CHECKOUT PROTOCOL v88.1 (Pure Build)
 * Audited: Section IV 5% Margin Protection & Section VI Economic Ledger Sync.
 */
export const useCheckoutProtocol = () => {
  const { profile: currentUser, refreshUserData } = useUserStore();
  const { removeFromCart, useCoins, setUseCoins } = useCartStore();
  const [loadingSellerId, setLoadingSellerId] = useState<string | null>(null);

  /**
   * ⚡ EXECUTE CHECKOUT
   * Coordinates registry injection, coin deduction, and merchant dispatch.
   */
  const executeOrder = async (
    seller: SellerMinimal, 
    items: any[], 
    deliveryAddress: string, 
    channel: 'WHATSAPP' | 'CHAT'
  ) => {
    // 🛡️ 1. SECURITY & LOGISTICS GATE
    if (!deliveryAddress) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw new Error("Logistics Gap: A delivery address is required.");
    }

    if (currentUser?.id === seller.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw new Error("Access Denied: You cannot purchase from your own shop.");
    }

    setLoadingSellerId(seller.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 🛡️ 2. FINANCIAL CALCULATION (Manifest Section IV: 5% Rule)
      const storeSubtotal = items.reduce((sum, i) => sum + (i.product.price * (i.qty || 1)), 0);
      const coinsToApply = useCoins ? Math.min(currentUser?.coin_balance || 0, Math.floor(storeSubtotal * 0.05)) : 0;
      const finalPayable = storeSubtotal - coinsToApply;

      // 🛡️ 3. DATABASE REGISTRY (Atomic Injection)
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

      // 🛡️ 4. ECONOMIC DEDUCTION (Section VI: Ledger Sync)
      if (coinsToApply > 0 && currentUser?.id) {
        const { error: coinError } = await supabase.rpc('process_marketplace_checkout', {
          p_user_id: currentUser.id,
          p_coins_used: coinsToApply
        });
        
        if (coinError) console.error("Economic Desync:", coinError.message);
        setUseCoins(false);
      }

      // 🛡️ 5. CLEANUP & SYNC
      items.forEach(i => removeFromCart(i.product.id));
      await refreshUserData(); // Sync updated ledger balance
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 🛡️ 6. DISPATCH
      if (channel === 'WHATSAPP') {
        const url = await launchWhatsAppInvoice(seller, orderId, items, finalPayable, coinsToApply, deliveryAddress);
        return { orderId, storeName: seller.display_name, url };
      }

      return { orderId, storeName: seller.display_name };

    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw err;
    } finally {
      setLoadingSellerId(null);
    }
  };

  /**
   * 🏛️ SMART INVOICE GENERATOR
   * Formats the commercial manifest for WhatsApp dispatch.
   */
  const launchWhatsAppInvoice = async (
    seller: SellerMinimal, 
    orderId: string, 
    items: any[], 
    total: number, 
    discount: number, 
    address: string
  ) => {
    // Standardize Nigerian country code prefix (+234)
    let wa = seller.whatsapp_number?.replace(/\D/g, '') || "";
    if (wa.startsWith('0')) wa = '234' + wa.substring(1);
    if (wa.length === 10) wa = '234' + wa;

    const itemLines = items.map(i => `• ${i.qty || 1}x ${i.product.name.toUpperCase()} (₦${i.product.price.toLocaleString()})`).join('\n');
    const merchantName = (seller.display_name || 'MERCHANT').toUpperCase();
    const buyerName = (currentUser?.display_name || currentUser?.full_name || 'MEMBER').toUpperCase();

    const msg = `*STORELINK ORDER INVOICE*\n` +
                `Ref: #${orderId.slice(0, 8).toUpperCase()}\n\n` +
                `Hello *${merchantName}*,\n` +
                `I would like to order the following items:\n\n` +
                `${itemLines}\n\n` +
                `*DELIVERY INFO*\n` +
                `👤 *BUYER:* ${buyerName}\n` +
                `📍 *ADDRESS:* ${address}\n\n` +
                `*TOTAL TO PAY*\n` +
                `💰 *PAYABLE:* ₦${total.toLocaleString()}\n` +
                (discount > 0 ? `✨ *COINS USED:* -₦${discount.toLocaleString()}\n` : "") +
                `----------------------------\n` +
                `_Sent via StoreLink Secure Checkout_ 🚀`;

    const url = `whatsapp://send?phone=${wa}&text=${encodeURIComponent(msg)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "WhatsApp is not installed on this device.");
      }
    } catch (e) {
      console.error("Link Failure", e);
    }
    
    return url;
  };

  return { executeOrder, loadingSellerId };
};