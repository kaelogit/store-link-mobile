import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import * as Haptics from 'expo-haptics';

/**
 * 🏰 CHAT HOOK v90.0
 * Purpose: Manages real-time messaging, message history, and instant sending.
 * Features: Automatic updates when new messages arrive and smooth haptic feedback.
 */
export const useChat = (conversationId: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { profile: currentUser } = useUserStore();
  const isMounted = useRef(true);

  // 🏛️ LIVE SYNC: Loading history and listening for new messages
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
        console.error("Failed to load messages:", e);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchMessages();

    // ⚡ REAL-TIME SUBSCRIPTION: Listen for new incoming messages
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
            // Check if message already exists to prevent duplicates
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) return prev;
            
            // Vibration feedback for new messages from others
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
   * 📤 SEND MESSAGE
   * Logic: Updates the screen instantly while the message saves in the background.
   */
  const sendMessage = useCallback(async (text: string, imageUrl?: string) => {
    if (!text.trim() && !imageUrl) return;
    if (!currentUser?.id || !conversationId) return;

    setSending(true);
    const tempId = `temp_${Math.random().toString(36).substring(7)}`;
    
    const instantMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      text: text.trim(),
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      is_read: false,
      is_optimistic: true 
    };

    // ⚡ Update UI immediately
    setMessages(prev => [...prev, instantMessage]);
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
      
      // Update the main conversation preview text
      await supabase
        .from('conversations')
        .update({ 
          last_message: text.trim() || 'Photo sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

    } catch (e) {
      // Remove the message if it failed to send
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  }, [conversationId, currentUser?.id]);

  return { messages, loading, sending, sendMessage };
};