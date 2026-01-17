import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🏛️ Registry Imports
import { Product, SellerMinimal } from '../types';

/**
 * 🏰 EMPIRE CART STORE v78.7 (Pure Build)
 * Audited: Section IV Commercial Registry & Section VI 5% Empire Rule.
 * Compliance: Manifest v78.5 Sovereign Negotiation Alignment.
 */

interface CartItem {
  product: Product;      // Mapped to Hardened Asset Registry
  seller: SellerMinimal; // Mapped to Hardened Identity Layer
  qty: number;
}

interface CartTotals {
  subtotal: number;
  cartCount: number;
  coinDiscount: number;
  finalTotal: number;
}

interface CartState {
  cart: CartItem[];
  useCoins: boolean;
  
  // Actions
  addToCart: (product: Product, seller: SellerMinimal) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, amount: number) => void;
  clearCart: () => void;
  setUseCoins: (val: boolean) => void;
  
  // Selectors
  getCartTotals: (userCoinBalance: number) => CartTotals;
  getGroupedCart: () => Record<string, { seller: SellerMinimal, items: CartItem[] }>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      useCoins: false,

      /**
       * ⚡ ADD TO REGISTRY
       * Synchronizes the product asset with its Merchant's trade identity.
       */
      addToCart: (product, seller) => {
        const currentCart = get().cart;
        const existingIndex = currentCart.findIndex((item) => item.product.id === product.id);

        if (existingIndex !== -1) {
          const updatedCart = [...currentCart];
          updatedCart[existingIndex].qty += 1;
          set({ cart: updatedCart });
        } else {
          set({ cart: [...currentCart, { product, seller, qty: 1 }] });
        }
      },

      removeFromCart: (productId) => {
        set((state) => ({ 
            cart: state.cart.filter((item) => item.product.id !== productId) 
        }));
      },

      updateQty: (productId, amount) => {
        set((state) => ({
          cart: state.cart.map((item: CartItem) =>
            item.product.id === productId
              ? { ...item, qty: Math.max(1, item.qty + amount) }
              : item
          ),
        }));
      },

      clearCart: () => set({ cart: [], useCoins: false }),

      setUseCoins: (val) => set({ useCoins: val }),

      /**
       * 🏛️ THE 5% EMPIRE RULE (Section VI)
       * Ensures the economic ledger remains balanced.
       * Rule: Coin usage is capped at 5% of the total trade value.
       */
      getCartTotals: (userCoinBalance) => {
        const { cart, useCoins } = get();
        const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
        const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
        
        // 🛡️ Hard-coded 5% Margin Cap
        const maxCoinUsage = Math.floor(subtotal * 0.05); 
        const coinDiscount = useCoins ? Math.min(userCoinBalance, maxCoinUsage) : 0;
        const finalTotal = subtotal - coinDiscount;

        return { subtotal, cartCount, coinDiscount, finalTotal };
      },

      /**
       * 🌪️ VORTEX GROUPING
       * Organizes items by Seller ID for Sovereign Negotiation Handshakes.
       */
      getGroupedCart: () => {
        return get().cart.reduce((acc, item: CartItem) => {
          const sellerId = item.seller.id;
          if (!acc[sellerId]) {
            acc[sellerId] = { seller: item.seller, items: [] };
          }
          acc[sellerId].items.push(item);
          return acc;
        }, {} as Record<string, { seller: SellerMinimal, items: CartItem[] }>);
      },
    }),
    {
      name: 'storelink-v78-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);