import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

/**
 * 📸 IMAGE UPLOAD ENGINE v1.1
 * Features: Regular uploads + Disappearing "View Once" photos.
 */
export const useChatAttachments = (chatId: string, userId: string) => {
  
  const uploadAndSendImage = async (isViewOnce: boolean = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0].base64) return;

      const file = result.assets[0];
      const fileExt = file.uri.split('.').pop();
      const fileName = `${chatId}/${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      // 1. UPLOAD TO STORAGE
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, decode(file.base64 || ''), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // 2. SAVE TO MESSAGES WITH PRIVACY FLAGS
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          image_url: publicUrl,
          type: 'IMAGE',
          is_view_once: isViewOnce, // <--- Activated
          has_been_viewed: false     // <--- Initialized
        });

      if (messageError) throw messageError;

      return publicUrl;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  return { uploadAndSendImage };
};