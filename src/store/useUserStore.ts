import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * 🏰 USER DATA STORE v82.0
 * Purpose: Central Source of Truth for Identity, Location, and Finances.
 * Features: Algorithm-ready location sync, memory-safe listeners, and strict casting.
 */
interface UserState {
  user: User | null;
  profile: Profile | null; 
  loading: boolean;
  activeChannel: RealtimeChannel | null;
  // --- Actions ---
  refreshUserData: () => Promise<void>;
  initializeProfileListener: () => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  activeChannel: null,

  /**
   * 🛡️ DATA REFRESH: The core engine that keeps the app "Wired" to the server.
   */
  refreshUserData: async () => {
    try {
      // 1. SESSION CHECK
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        get().clearUser();
        return;
      }

      // 2. PROFILE FETCH: Capturing algorithm-critical location and financial data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Profile refresh failed:", profileError.message);
        throw profileError;
      }

      // 3. SYSTEM HANDSHAKE: Mapping 40/25/15 Algorithmic Context
      const updatedProfile: Profile = { 
        ...profileData, 
        email: user.email || profileData.email || "",
        slug: profileData.slug, 
        
        // --- 🛡️ Algorithm Context (Crucial for Explore/Home) ---
        location_state: profileData.location_state || 'Lagos',
        location_city: profileData.location_city || null,
        
        // --- 🟢 Presence Wiring ---
        is_store_open: profileData.is_store_open === true,
        
        // --- 🟢 Escrow & Loyalty Wiring ---
        coin_balance: profileData.coin_balance || 0,
        escrow_balance: profileData.escrow_balance || 0,
        
        // --- 🟢 Payout Wiring ---
        bank_details: profileData.bank_details || null,
        
        // --- Verification & Onboarding ---
        is_verified: profileData.is_verified === true,
        verification_status: profileData.verification_status,
        onboarding_completed: profileData.onboarding_completed === true,
        is_seller: profileData.is_seller === true
      };

      set({ 
        user,
        profile: updatedProfile, 
        loading: false 
      });

      // 4. ACTIVATE REAL-TIME ENGINE
      get().initializeProfileListener();

    } catch (error) {
      console.error("User data error:", error);
      set({ loading: false });
    }
  },

  /**
   * 📡 LIVE UPDATES: Automatically triggers a UI refresh if any profile column changes.
   * Refactored for SDK 54 native stability and memory management.
   */
  initializeProfileListener: () => {
    const userId = get().user?.id;
    if (!userId) return;

    // A. Clean up existing channel if active
    const existingChannel = get().activeChannel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channelName = `profile_sync_${userId}`;

    // B. Setup New Subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${userId}` 
        },
        (payload) => {
          const updatedRaw = payload.new as any;
          
          set((state) => {
            if (!state.profile) return state;

            const syncedProfile: Profile = {
              ...state.profile,
              ...updatedRaw,
              // Force strict boolean parity
              is_store_open: updatedRaw.is_store_open === true,
              is_verified: updatedRaw.is_verified === true,
              is_seller: updatedRaw.is_seller === true,
              onboarding_completed: updatedRaw.onboarding_completed === true
            };

            return { profile: syncedProfile };
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ activeChannel: channel });
        }
      });
  },

  /**
   * 🧹 LOGOUT CLEANUP
   */
  clearUser: () => {
    const activeChannel = get().activeChannel;
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
    }

    set({ 
      user: null,
      profile: null, 
      loading: false,
      activeChannel: null
    });
  }
}));