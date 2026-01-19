import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Project Imports
import { Product, SellerMinimal } from '../types';

/**
 * 🛒 CART STORE v79.0
 * Purpose: Manages the shopping bag, item quantities, and coin discounts.
 * Logic: Simple English for clear developer communication.
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
       * Increases the quantity if the item is already there.
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
       * Ensures the number of items never goes below 1.
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
       * Rule: You can only use coins for up to 5% of the total price.
       */
      getCartTotals: (userCoinBalance) => {
        const { cart, useCoins } = get();
        
        // Calculate the base price of all items
        const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
        const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
        
        // Apply the 5% discount limit
        const maxDiscount = Math.floor(subtotal * 0.05); 
        const coinDiscount = useCoins ? Math.min(userCoinBalance, maxDiscount) : 0;
        const finalTotal = subtotal - coinDiscount;

        return { subtotal, cartCount, coinDiscount, finalTotal };
      },

      /**
       * 📦 GROUP BY SHOP
       * Sorts the items so they can be processed as separate orders for each seller.
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
      name: 'storelink-v79-cart', // Updated versioning
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);