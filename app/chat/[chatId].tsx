import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, StatusBar } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { Profile } from '../../src/types';

// 🆕 INTEGRATED COMPONENTS
import { ChatHeader } from '../../src/components/chat/ChatHeader';
import { MessageInput } from '../../src/components/chat/MessageInput';
import { ChatBubble } from '../../src/components/chat/ChatBubble';
import { AttachmentMenu } from '../../src/components/chat/AttachmentMenu';

/**
 * 🏰 UNIFIED CHAT SCREEN v106.0
 * Purpose: Secure communication with stable Blob-based media uploads.
 * Fix: Replaced Base64 with Blob for 100% reliable image sharing in chat.
 */
export default function ChatScreen() {
  const { chatId: rawChatId } = useLocalSearchParams();
  const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId; 
  
  const { profile: currentUser } = useUserStore();
  const queryClient = useQueryClient();
  const theme = Colors[useColorScheme() ?? 'light'];
  const flatListRef = useRef<FlatList>(null);

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. 📡 SYNC CHAT & PARTNER DATA
  const { data: chatData } = useQuery({
    queryKey: ['chat-thread', chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chats')
        .select(`*, seller:seller_id(*), buyer:buyer_id(*)`)
        .eq('id', chatId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!chatId
  });

  const partner: Profile | undefined = chatData?.buyer_id === currentUser?.id 
    ? chatData?.seller 
    : chatData?.buyer;

  // 2. 📡 SYNC MESSAGES
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!chatId
  });

  // 3. ⚡ REAL-TIME & READ-RECEIPT LOGIC
  useEffect(() => {
    if (!chatId || !currentUser?.id) return;

    // A. Mark messages as read when entering
    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', currentUser.id);
    };
    markAsRead();

    // B. Real-time Subscription
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, queryClient, currentUser?.id]);

  // 4. 📝 SEND TEXT LOGIC
  const handleSendText = async (text: string) => {
    if (!text.trim() || !currentUser?.id) return;
    
    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: currentUser.id,
      content: text.trim(),
      type: 'text',
      is_read: false
    });
    
    if (error) {
        console.error(error);
        Alert.alert("Error", "Message could not be sent.");
    }
  };

  /** 🛡️ 5. CHAT IMAGE UPLOAD ENGINE (Stability Fixed) */
  const handleImageOption = async (option: 'REGULAR' | 'VIEW_ONCE') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0].uri) return;
      setIsUploading(true);
      setIsMenuVisible(false);

      const uri = result.assets[0].uri;
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${chatId}/${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      // 🛡️ THE FIX: Blob-based streaming for chat stability
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('media') 
        .upload(filePath, blob, { 
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

      const { error: msgError } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: currentUser?.id,
        content: publicUrl,
        type: 'image',
        is_view_once: option === 'VIEW_ONCE',
        is_read: false
      });

      if (msgError) throw msgError;

    } catch (err) {
      console.error("Chat Upload Failed:", err);
      Alert.alert("Upload Failed", "Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? 'dark-content' : 'light-content'} />
      
      {partner && <ChatHeader seller={partner as Profile} />}

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted 
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble 
            message={item} 
            isDiamond={partner?.subscription_plan === 'diamond'} 
            isMe={item.sender_id === currentUser?.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 0}
      >
        <MessageInput 
          onSend={handleSendText} 
          onImagePick={() => setIsMenuVisible(true)}
          isLoading={isUploading}
        />
      </KeyboardAvoidingView>

      <AttachmentMenu 
        isVisible={isMenuVisible} 
        onClose={() => setIsMenuVisible(false)} 
        onSelectOption={handleImageOption} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingVertical: 20, paddingHorizontal: 16 },
});