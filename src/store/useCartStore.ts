import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Project Imports
import { Product, SellerMinimal } from '../types';

/**
 * 🛒 CART STORE v80.0
 * Purpose: Manages the shopping bag, item quantities, and coin discounts.
 * Handshake: Wired to ensure 100% price accuracy during Checkout.
 */

interface CartItem {
  product: Product;      // The item being bought
  seller: SellerMinimal; // The shop selling the item
  qty: number;           // Quantity
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
  
  // Helpers
  getCartTotals: (userCoinBalance: number) => CartTotals;
  getGroupedCart: () => Record<string, { seller: SellerMinimal, items: CartItem[] }>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      useCoins: false,

      /**
       * ➕ ADD ITEM TO BAG
       * Logic: Increments quantity if duplicate, otherwise adds new node.
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

      /**
       * ➖ REMOVE ITEM FROM BAG
       */
      removeFromCart: (productId) => {
        set((state) => ({ 
            cart: state.cart.filter((item) => item.product.id !== productId) 
        }));
      },

      /**
       * 🔢 CHANGE QUANTITY
       * Logic: Prevents zero or negative quantities.
       */
      updateQty: (productId, amount) => {
        set((state) => ({
          cart: state.cart.map((item: CartItem) =>
            item.product.id === productId
              ? { ...item, qty: Math.max(1, item.qty + amount) }
              : item
          ),
        }));
      },

      /**
       * 🧹 RESET BAG
       */
      clearCart: () => set({ cart: [], useCoins: false }),

      /**
       * 🪙 TOGGLE COIN USAGE
       */
      setUseCoins: (val) => set({ useCoins: val }),

      /**
       * 📊 CALCULATE TOTALS
       * Rule: 2026 Loyalty Standard — Coins cap at 5% of subtotal.
       */
      getCartTotals: (userCoinBalance) => {
        const { cart, useCoins } = get();
        
        // Base math
        const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
        const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
        
        // Applying the "StoreLink 5% Cap"
        const maxDiscountAllowed = Math.floor(subtotal * 0.05); 
        const coinDiscount = useCoins ? Math.min(userCoinBalance, maxDiscountAllowed) : 0;
        const finalTotal = subtotal - coinDiscount;

        return { subtotal, cartCount, coinDiscount, finalTotal };
      },

      /**
       * 📦 GROUP BY SHOP
       * Logic: Splits the cart into separate "Seller Buckets" for atomic orders.
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
      name: 'storelink-cart-v80', // Version bump for data integrity
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);