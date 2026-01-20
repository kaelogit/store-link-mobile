import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';

/**
 * 🏰 PUSH NOTIFICATION HOOK v1.4
 * Purpose: Securely link the phone's native address to the User Profile.
 * Fixes: Expo Go Android bypass and enhanced native build compatibility.
 */
export const usePushNotifications = () => {
  const registerForPushNotificationsAsync = async (userId: string) => {
    // 🛡️ 1. HARDWARE & ENVIRONMENT CHECK
    if (!Device.isDevice) {
      console.log("Push Notifications: Skipped (Not a physical device)");
      return null;
    }

    // 🛡️ 2. EXPO GO BYPASS (Crucial for Android SDK 53+)
    // Prevents crashing/errors when testing in the standard Expo Go app.
    const isExpoGoOnAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';
    if (isExpoGoOnAndroid) {
      console.log("Push Notifications: Skipped (Standard Expo Go on Android does not support native push). Use a Dev Build.");
      return null;
    }

    // 3. ANDROID HIGH-PRIORITY CHANNEL SETUP
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('money-alerts', {
        name: 'Payments & Sales',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981', // StoreLink Emerald
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    try {
      // 4. PERMISSION PROTOCOL
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log("Push Notifications: Permission denied by user.");
        return null;
      }

      // 5. GET SECURE PROJECT TOKEN
      // Enhanced extraction for local Development Builds
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId || 
        Constants?.easConfig?.projectId || 
        'd07b455a-520b-48fb-b718-d1b7634cb2af'; // Fallback to your verified ID

      if (!projectId) {
        throw new Error("Project ID missing from app configuration.");
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // 6. DATABASE SYNC
      // Only updates if the token has actually changed to save bandwidth
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "no row found" error
        throw fetchError;
      }

      if (currentProfile?.push_token !== token) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            push_token: token,
            updated_at: new Date().toISOString() 
          })
          .eq('id', userId);

        if (updateError) throw updateError;
        console.log("Push Notifications: Token synced to Supabase.");
      }

      return token;
    } catch (e) {
      console.error("Push Notification Handshake Failed:", e);
      return null;
    }
  };

  return { registerForPushNotificationsAsync };
};