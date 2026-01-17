import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import * as Haptics from 'expo-haptics';

/**
 * 🏰 SECURE CHAT HOOK v89.1 (Pure Build)
 * Audited: Section VII Messaging Governance & Real-Time Sync.
 */
export const useChat = (conversationId: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { profile: currentUser } = useUserStore();
  const isMounted = useRef(true);

  // 🏛️ LIVE SYNC: Hydration & Real-Time Subscription
  useEffect(() => {
    isMounted.current = true;
    
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        if (isMounted.current) setLoading(true);
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (isMounted.current) setMessages(data || []);
      } catch (e) {
        console.error("Chat Sync Failure:", e);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchMessages();

    // ⚡ REAL-TIME VORTEX: Listen for incoming signals
    const channel = supabase
      .channel(`chat_sync:${conversationId}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
        if (isMounted.current) {
          setMessages((prev) => {
            // 🛡️ DEDUPLICATION GATE
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) return prev;
            
            // ⚡ TACTILE FEEDBACK: Incoming signal notification
            if (payload.new.sender_id !== currentUser?.id) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            
            return [...prev, payload.new];
          });
        }
      })
      .subscribe();

    return () => { 
      isMounted.current = false;
      supabase.removeChannel(channel); 
    };
  }, [conversationId, currentUser?.id]);

  /**
   * 📤 INSTANT SEND (Optimistic Dispatch)
   * Updates UI immediately and syncs with the database in the background.
   */
  const sendMessage = useCallback(async (text: string, imageUrl?: string) => {
    if (!text.trim() && !imageUrl) return;
    if (!currentUser?.id || !conversationId) return;

    setSending(true);
    const tempId = `temp_${Math.random().toString(36).substring(7)}`;
    
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      text: text.trim(),
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      is_read: false,
      is_optimistic: true 
    };

    // ⚡ Instant UI Update
    setMessages(prev => [...prev, optimisticMessage]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          text: text.trim(),
          image_url: imageUrl || null
        });

      if (error) throw error;
      
      // Update Conversation Metadata (Manifest VII)
      await supabase
        .from('conversations')
        .update({ 
          last_message: text.trim() || 'Photo sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

    } catch (e) {
      // 🔄 ROLLBACK on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  }, [conversationId, currentUser?.id]);

  return { messages, loading, sending, sendMessage };
};