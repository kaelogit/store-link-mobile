import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import * as Haptics from 'expo-haptics';

/**
 * 🏰 SOCIAL SYNC HOOK v88.0
 * Purpose: Handles likes and follows in real-time.
 * Language: Simple English for easier maintenance.
 */
export const useSocialSync = (productId?: string) => {
  const { profile } = useUserStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const isMounted = useRef(true);

  // 1. Initial Data Load & Real-time setup
  useEffect(() => {
    isMounted.current = true;
    if (!productId) return;

    const loadInitialData = async () => {
      try {
        await Promise.all([getLikeCount(), checkStatus()]);
      } catch (e) {
        console.error("Could not load social data:", e);
      }
    };

    loadInitialData();

    // ⚡ Real-time updates: Update count when others like/unlike
    const channel = supabase
      .channel(`product_likes:${productId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_likes',
        filter: `product_id=eq.${productId}`,
      }, () => {
        if (isMounted.current) getLikeCount();
      })
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [productId, profile?.id]);

  const getLikeCount = async () => {
    const { count, error } = await supabase
      .from('product_likes')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);
    
    if (!error && isMounted.current) setLikeCount(count || 0);
  };

  const checkStatus = async () => {
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
   * ❤️ Like Logic (Optimistic)
   * We update the UI immediately and fix it if the server fails.
   */
  const toggleLike = useCallback(async () => {
    if (!profile?.id || !productId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasLiked = isLiked;
    const currentCount = likeCount;

    // Fast UI update
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      // Calls the database function to handle the like/unlike
      const { error } = await supabase.rpc('toggle_product_like', { 
        p_user_id: profile.id, 
        p_product_id: productId 
      });

      if (error) throw error;
    } catch (error) {
      // Undo the UI change if it failed
      if (isMounted.current) {
        setIsLiked(wasLiked);
        setLikeCount(currentCount);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isLiked, likeCount, productId, profile?.id]);

  /**
   * 👤 Follow Logic
   * Note: Using 'following_id' to match our updated Global Types.
   */
  const toggleFollow = async (sellerId: string, isCurrentlyFollowing: boolean) => {
    if (!profile?.id || loadingId) return;

    setLoadingId(sellerId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', sellerId); // 🛡️ Updated column name
      } else {
        await supabase
          .from('follows')
          .insert({ 
            follower_id: profile.id, 
            following_id: sellerId  // 🛡️ Updated column name
          });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return true;
    } catch (e) {
      console.error("Follow error:", e);
      return false;
    } finally {
      setLoadingId(null);
    }
  };

  return { isLiked, likeCount, toggleLike, toggleFollow, loadingId, refresh: getLikeCount };
};