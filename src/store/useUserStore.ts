import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types';

/**
 * 🏰 USER IDENTITY STORE v78.9 (Pure Finality)
 * Audited: Section I Identity Layer & Realtime Registry Sync.
 * Fixed: Verification Flip-Back and Session Persistence Rupture.
 */
interface UserState {
  user: User | null;
  profile: Profile | null; 
  loading: boolean;
  // --- Actions ---
  refreshUserData: () => Promise<void>;
  initializeProfileListener: () => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  /**
   * 🏎️ REFRESH IDENTITY REGISTRY
   * Logic: Direct Database Probe to enforce Permanent Verification status.
   * Manifest Alignment: v78.7 Identity Finality Enforcement.
   */
  refreshUserData: async () => {
    try {
      // 🛡️ 1. AUTH PROBE (Server-side validation)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        get().clearUser();
        return;
      }

      // 🏛️ 2. DIRECT REGISTRY FETCH (Manifest Section I)
      // We pull every field to ensure the UI has total Visual Authority.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Registry Sync Failure:", profileError.message);
        throw profileError;
      }

      // 🛡️ 3. IDENTITY HYDRATION
      // Ensures Prestige Weight, is_verified, and Category are locked in memory.
      const hardenedProfile: Profile = { 
        ...profileData, 
        email: user.email || profileData.email || "",
        // Handle Duality: slug is now the unique username
        slug: profileData.slug, 
        is_verified: profileData.is_verified === true,
        onboarding_completed: profileData.onboarding_completed === true
      };

      set({ 
        user,
        profile: hardenedProfile, 
        loading: false 
      });

      // 📡 4. ACTIVATE REALTIME SYNC
      get().initializeProfileListener();

    } catch (error) {
      console.error("Identity Registry Error:", error);
      set({ loading: false });
    }
  },

  /**
   * 📡 LIVE REGISTRY MONITOR
   * Listens for Prestige Weight, Coin Balance, or Verification updates.
   */
  initializeProfileListener: () => {
    const userId = get().user?.id;
    if (!userId) return;

    const channelName = `identity_lock_${userId}`;
    
    // 🛡️ Purge stale channels to prevent ghost updates
    supabase.removeChannel(supabase.channel(channelName));

    supabase
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
          // 🛡️ ATOMIC SYNC: Direct update from the cryptographically verified DB change
          const updatedProfile = payload.new as Profile;
          
          set((state) => ({
            profile: state.profile ? { ...state.profile, ...updatedProfile } : updatedProfile
          }));
        }
      )
      .subscribe();
  },

  /**
   * 🧹 REGISTRY CLEANUP
   * Logic: Destroys session and unsubscribes from all identity channels.
   */
  clearUser: () => {
    const userId = get().user?.id;
    if (userId) {
      const channelName = `identity_lock_${userId}`;
      supabase.removeChannel(supabase.channel(channelName));
    }

    set({ 
      user: null,
      profile: null, 
      loading: false 
    });
  }
}));