import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ModeState {
  mode: 'BUYER' | 'SELLER';
  setMode: (mode: 'BUYER' | 'SELLER') => void;
  toggleMode: () => void;
}

/**
 * 🏰 MODE STORE v2.1 (Pure Build)
 * Audited: Section I Role-Based Gating & Persistence.
 */
export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'BUYER',
      
      setMode: (mode) => set({ mode }),
      
      toggleMode: () => set((state) => ({ 
        mode: state.mode === 'BUYER' ? 'SELLER' : 'BUYER' 
      })),
    }),
    {
      name: 'storelink-mode-storage', // Registry key
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);