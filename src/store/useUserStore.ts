import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types';

/**
 * 🏰 USER DATA STORE v80.0
 * Purpose: Manages user login status and profile information across the app.
 * Features: Real-time profile updates and secure account verification tracking.
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
   * 🛡️ DATA REFRESH: Updates local profile data from the database.
   * Logic: Validates the session and ensures account status is accurate.
   */
  refreshUserData: async () => {
    try {
      // 1. SESSION CHECK: Verify the user is still logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        get().clearUser();
        return;
      }

      // 2. PROFILE FETCH: Get the latest profile details
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Profile update failed:", profileError.message);
        throw profileError;
      }

      // 3. ACCOUNT SECURITY: Verify email and identity status separately
      const updatedProfile: Profile = { 
        ...profileData, 
        email: user.email || profileData.email || "",
        slug: profileData.slug, 
        // Verification A: Confirms the email belongs to the user
        is_verified: profileData.is_verified === true,
        // Verification B: Confirms the user's real-world identity
        verification_status: profileData.verification_status,
        onboarding_completed: profileData.onboarding_completed === true,
        is_seller: profileData.is_seller === true
      };

      set({ 
        user,
        profile: updatedProfile, 
        loading: false 
      });

      // 4. START LIVE UPDATES: Listen for changes while the app is open
      get().initializeProfileListener();

    } catch (error) {
      console.error("User data error:", error);
      set({ loading: false });
    }
  },

  /**
   * 📡 LIVE UPDATES: Automatically refreshes data if a change happens on the server.
   * Useful for instant verification updates or role changes (e.g., becoming a seller).
   */
  initializeProfileListener: () => {
    const userId = get().user?.id;
    if (!userId) return;

    const channelName = `profile_updates_${userId}`;
    
    // Remove old listeners to prevent bugs
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
          // INSTANT SYNC: Update the screen immediately when the database changes
          const updatedRaw = payload.new as any;
          
          set((state) => {
            if (!state.profile) return state;

            const syncedProfile: Profile = {
              ...state.profile,
              ...updatedRaw,
              is_verified: updatedRaw.is_verified === true,
              verification_status: updatedRaw.verification_status,
              is_seller: updatedRaw.is_seller === true
            };

            return { profile: syncedProfile };
          });
        }
      )
      .subscribe();
  },

  /**
   * 🧹 LOGOUT CLEANUP: Clears all user data and stops live listeners.
   */
  clearUser: () => {
    const userId = get().user?.id;
    if (userId) {
      const channelName = `profile_updates_${userId}`;
      supabase.removeChannel(supabase.channel(channelName));
    }

    set({ 
      user: null,
      profile: null, 
      loading: false 
    });
  }
}));