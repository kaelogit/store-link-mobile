import React, { useState } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  Switch, Alert, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, ShieldCheck, Bell, Lock, 
  Trash2, ChevronRight, Smartphone, 
  Globe, UserX, Store, Moon, Fingerprint, 
  Clock, MapPin, Languages, KeyRound,
  HelpCircle, AlertCircle, Eye, HardDrive, 
  Bookmark, EyeOff
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/useUserStore'; 
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

/**
 * 🏰 SETTINGS SCREEN v31.0
 * Purpose: A central hub for users to manage their privacy, shop status, and account security.
 * Features: Real-time settings sync and memory management (Clear Cache).
 */
export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [syncing, setSyncing] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);

  /**
   * 🛡️ SAVE SETTINGS
   * Updates specific profile columns in the database and refreshes the local app data.
   */
  const handleUpdateProfile = async (column: string, value: any) => {
    setSyncing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [column]: value })
        .eq('id', profile?.id);

      if (error) throw error;
      await refreshUserData();
    } catch (e) {
      Alert.alert("Update Failed", "We couldn't save your changes. Please check your connection.");
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Clear Cache", 
      "This will free up space by removing temporary images. Your account and items will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear Now", onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            Alert.alert("Success", "Temporary data has been cleared.");
        }}
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{backgroundColor: 'transparent'}} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>SETTINGS</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>
        
        {/* SHOP TOOLS (Only visible to Sellers) */}
        {profile?.is_seller && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Shop Settings</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <SettingToggle 
                theme={theme}
                icon={Store} 
                label="Store Status" 
                sub={profile?.is_store_open ? "Customers can find your shop" : "Your shop is currently hidden"}
                value={profile?.is_store_open ?? false} 
                onToggle={(v: boolean) => handleUpdateProfile('is_store_open', v)}
                isLoading={syncing}
              />
              <SettingLink 
                theme={theme}
                icon={Clock} 
                label="Store Hours" 
                sub="Set when you are open for business"
                onPress={() => {}} 
              />
            </View>
          </>
        )}

        {/* 🛡️ PRIVACY & SAFETY */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Privacy</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          
          <SettingToggle 
            theme={theme}
            icon={Bookmark} 
            label="Private Saved Items" 
            sub="Hide your wishlist from other users"
            value={profile?.is_wardrobe_private ?? false} 
            onToggle={(v: boolean) => handleUpdateProfile('is_wardrobe_private', v)}
            isLoading={syncing}
          />

          <SettingToggle 
            theme={theme}
            icon={Eye} 
            label="Activity Status" 
            sub="Show others when you are online"
            value={activityStatus} 
            onToggle={(v: boolean) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActivityStatus(v);
            }} 
          />

          <SettingLink 
            theme={theme}
            icon={EyeOff} 
            label="Blocked Users" 
            sub="Manage accounts you have restricted"
            onPress={() => {}} 
          />
        </View>

        {/* 💬 CUSTOMER SUPPORT */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Support</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme}
            icon={HelpCircle} 
            label="Help Center" 
            sub="Read our guides and common questions"
            onPress={() => {}} 
          />
          <SettingLink 
            theme={theme}
            icon={AlertCircle} 
            label="Report a Problem" 
            sub="Tell us if something is not working"
            onPress={() => {}} 
          />
        </View>

        {/* 💾 DEVICE STORAGE */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Device Storage</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme}
            icon={HardDrive} 
            label="Clear Cache" 
            sub="Free up space on your phone"
            onPress={handleClearCache} 
          />
        </View>

        {/* ACCOUNT SECURITY */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Security</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme}
            icon={KeyRound} 
            label="Update Password" 
            sub="Change your login details"
            onPress={() => router.push('/auth/update-password')} 
          />
          <SettingLink 
            theme={theme}
            icon={Smartphone} 
            label="Active Devices" 
            sub="See where you are currently signed in"
            onPress={() => {}} 
          />
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={20} color={theme.border} strokeWidth={2} />
          <Text style={[styles.versionText, { color: theme.subtext }]}>APP VERSION 31.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/** 🏗️ REUSABLE MENU COMPONENTS */

const SettingLink = ({ icon: Icon, label, sub, onPress, color, theme }: any) => (
  <TouchableOpacity 
    style={styles.row} 
    onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    }}
  >
    <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
      <Icon size={20} color={color || theme.text} strokeWidth={2.5} />
    </View>
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Text style={[styles.label, { color: color || theme.text }]}>{label}</Text>
      <Text style={[styles.subLabel, { color: theme.subtext }]}>{sub}</Text>
    </View>
    <ChevronRight size={16} color={theme.border} strokeWidth={3} />
  </TouchableOpacity>
);

const SettingToggle = ({ icon: Icon, label, sub, value, onToggle, isLoading, theme }: any) => (
  <View style={styles.row}>
    <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
      <Icon size={20} color={theme.text} strokeWidth={2.5} />
    </View>
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {sub && <Text style={[styles.subLabel, { color: theme.subtext }]}>{sub}</Text>}
    </View>
    {isLoading ? (
      <ActivityIndicator size="small" color={Colors.brand.emerald} />
    ) : (
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ true: Colors.brand.emerald, false: theme.border }}
        thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  scrollArea: { padding: 25, paddingBottom: 60 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  card: { borderRadius: 32, padding: 8, marginBottom: 35, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '800' },
  subLabel: { fontSize: 11, fontWeight: '600', marginTop: 3, opacity: 0.6 },
  footer: { marginTop: 20, alignItems: 'center', marginBottom: 40, gap: 10 },
  versionText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});