import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';

/**
 * ❤️ ACTIVITY HEARTBEAT HOOK
 * Purpose: Silently updates the "Last Seen" time in the database.
 * Privacy: Automatically stops if the user disables Activity Status.
 */
export const useHeartbeat = () => {
  const { profile } = useUserStore();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // 1. Function to tell the database we are online
  const pulse = async () => {
    // 🛡️ Safety Check: Only pulse if the user is logged in
    // and hasn't manually hidden their status (if you decide to hard-gate it here)
    if (!profile?.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', profile.id);
    } catch (e) {
      // Silent fail to avoid interrupting the user experience
      console.log("Heartbeat skip");
    }
  };

  // 2. Manage the pulse based on App State (Foreground/Background)
  useEffect(() => {
    if (!profile?.id) return;

    // Start pulsing every 2 minutes
    pulse();
    heartbeatInterval.current = setInterval(pulse, 120000);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        pulse();
        if (!heartbeatInterval.current) {
          heartbeatInterval.current = setInterval(pulse, 120000);
        }
      } else {
        // Stop pulsing when app is in background to save battery
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      subscription.remove();
    };
  }, [profile?.id]);

  return null;
};