import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 🔄 MODE STORE v3.0
 * Purpose: This keeps track of whether the user is in "Buyer Mode" or "Seller Mode."
 * Persistence: It remembers the user's choice even if they close the app.
 */

interface ModeState {
  // Can be 'BUYER' (shopping) or 'SELLER' (managing a shop)
  mode: 'BUYER' | 'SELLER';
  
  // Directly set the mode
  setMode: (mode: 'BUYER' | 'SELLER') => void;
  
  // Switch between the two modes
  toggleMode: () => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      // Everyone starts as a BUYER by default
      mode: 'BUYER',
      
      // Update the mode to a specific choice
      setMode: (mode) => set({ mode }),
      
      // Quickly flip the switch between Buyer and Seller
      toggleMode: () => set((state) => ({ 
        mode: state.mode === 'BUYER' ? 'SELLER' : 'BUYER' 
      })),
    }),
    {
      // The name of the saved data on the phone
      name: 'storelink-app-mode', 
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);