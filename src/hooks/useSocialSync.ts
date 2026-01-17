import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import * as Haptics from 'expo-haptics';

/**
 * 🏰 SOCIAL SYNC HOOK v87.1 (Pure Build)
 * Audited: Section III Interaction Hub & Section I Discovery Weighting.
 */
export const useSocialSync = (productId?: string) => {
  const { profile } = useUserStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const isMounted = useRef(true);

  // 🏛️ LIVE SYNC: Initial Hydration & Real-time Subscription
  useEffect(() => {
    isMounted.current = true;
    if (!productId) return;

    const fetchInitialStatus = async () => {
      try {
        await Promise.all([fetchLikeCount(), checkIfUserLiked()]);
      } catch (e) {
        console.error("Social Registry Sync Error:", e);
      }
    };

    fetchInitialStatus();

    // ⚡ REAL-TIME VORTEX: Listen for global engagement changes
    const channel = supabase
      .channel(`social_vortex:${productId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_likes',
        filter: `product_id=eq.${productId}`,
      }, () => {
        if (isMounted.current) fetchLikeCount();
      })
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [productId, profile?.id]);

  const fetchLikeCount = async () => {
    const { count, error } = await supabase
      .from('product_likes')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);
    
    if (!error && isMounted.current) setLikeCount(count || 0);
  };

  const checkIfUserLiked = async () => {
    if (!profile?.id || !productId) return;
    const { data } = await supabase
      .from('product_likes')
      .select('user_id')
      .eq('user_id', profile.id)
      .eq('product_id', productId)
      .maybeSingle();
    
    if (isMounted.current) setIsLiked(!!data);
  };

  /**
   * ❤️ ENGAGEMENT LOGIC (Meritocracy Signal)
   * Contributes to the merit_score used for marketplace ranking.
   */
  const toggleLike = useCallback(async () => {
    if (!profile?.id || !productId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasLiked = isLiked;
    const initialCount = likeCount;

    // ⚡ OPTIMISTIC UPDATE: Immediate UI feedback
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      // Atomic RPC call for data integrity
      await supabase.rpc('toggle_product_like', { 
        p_user_id: profile.id, 
        p_product_id: productId 
      });
    } catch (error) {
      // 🔄 ROLLBACK: Revert on registry conflict
      if (isMounted.current) {
        setIsLiked(wasLiked);
        setLikeCount(initialCount);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isLiked, likeCount, productId, profile?.id]);

  /**
   * 🛡️ MERCHANT FOLLOW (Discovery Weight)
   * Accounts for 40% of the Discovery Vortex weight.
   */
  const toggleFollow = async (sellerId: string, isCurrentlyFollowing: boolean) => {
    if (!profile?.id || loadingId) return;

    setLoadingId(sellerId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isCurrentlyFollowing) {
        await supabase.from('follows').delete().eq('follower_id', profile.id).eq('seller_id', sellerId);
      } else {
        await supabase.from('follows').insert({ follower_id: profile.id, seller_id: sellerId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return true;
    } catch (e) {
      return false;
    } finally {
      setLoadingId(null);
    }
  };

  return { isLiked, likeCount, toggleLike, toggleFollow, loadingId, refresh: fetchLikeCount };
};