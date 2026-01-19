import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';

/**
 * 🏰 PUSH NOTIFICATION HOOK v1.2
 * Purpose: Request permissions and link the device notification token to the user profile.
 * Features: High-priority Android channels and smart token update logic.
 */
export const usePushNotifications = () => {
  const registerForPushNotificationsAsync = async (userId: string) => {
    // 🛡️ DEVICE CHECK: Push notifications require a physical device.
    if (!Device.isDevice) return;

    // 1. ANDROID SYSTEM CHANNEL SETUP
    // Configures how notifications appear on Android (Importance and Color).
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981', // StoreLink Emerald
      });
    }

    try {
      // 2. PERMISSION CHECK
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn("Notifications: Permission denied.");
        return;
      }

      // 3. GET NOTIFICATION TOKEN
      // Pulls the unique Project ID from app configuration.
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                        Constants?.easConfig?.projectId;

      if (!projectId) {
        throw new Error("Project ID missing from app config.");
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // 4. SAVE TOKEN TO PROFILE
      // Checks the database first to avoid unnecessary updates.
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', userId)
        .single();

      if (currentProfile?.expo_push_token !== token) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      return token;
    } catch (e) {
      console.error("Notification Setup Failed:", e);
    }
  };

  return { registerForPushNotificationsAsync };
};