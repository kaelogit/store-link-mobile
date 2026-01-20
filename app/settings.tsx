import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Switch, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, MapPin, Lock, ChevronRight, Save, Phone,
  Store, Eye, EyeOff, HelpCircle, HardDrive, ShieldCheck,
  UserX, Bookmark, Clock, KeyRound, Smartphone, AlertCircle,
  LogOut
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/useUserStore'; 
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData, clearUser } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null); // Track which toggle is syncing

  // 📝 UNIFIED FORM STATE
  const [form, setForm] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    location: profile?.location || "Lagos",
    whatsapp_number: profile?.whatsapp_number || "",
  });

  /** 🛡️ SAVE PROFILE TEXT FIELDS (Manual Save) */
  const handleSaveProfile = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: form.display_name.trim(),
          bio: form.bio.trim(),
          location: form.location,
          whatsapp_number: form.whatsapp_number.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (error) throw error;
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Profile Updated", "Your changes have been saved successfully.");
    } catch (e: any) {
      Alert.alert("Update Error", "Could not save. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  /** ⚡ INSTANT TOGGLE SYNC (Auto Save) */
  const handleToggle = async (column: string, value: boolean) => {
    setSyncing(column);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [column]: value })
        .eq('id', profile?.id);

      if (error) throw error;
      await refreshUserData();
    } catch (e) {
      Alert.alert("Sync Error", "Could not update preference.");
    } finally {
      setSyncing(null);
    }
  };

  const handleClearCache = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Clear Cache", "This frees up space by removing temporary image data.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear Now", onPress: () => Alert.alert("Success", "Cache cleared.") }
    ]);
  };

  const isMerchant = profile?.is_seller;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 📱 HEADER: FIXED TOP */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>SETTINGS</Text>
        <TouchableOpacity onPress={handleSaveProfile} disabled={loading} style={styles.saveBtn}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.brand.emerald} />
          ) : (
            <Save size={24} color={Colors.brand.emerald} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollArea, { paddingBottom: insets.bottom + 100 }]}>
        
        {/* 👤 SECTION: PROFILE INFO */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Identity & Shop</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>{isMerchant ? 'SHOP NAME' : 'DISPLAY NAME'}</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={form.display_name}
              onChangeText={(v) => setForm({...form, display_name: v})}
              placeholder="Your name..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>BIO</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, height: 80, paddingTop: 15 }]}
              value={form.bio}
              onChangeText={(v) => setForm({...form, bio: v})}
              placeholder="Tell us about yourself..."
              multiline
            />
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>SUPPORT PHONE</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Phone size={16} color={theme.subtext} />
              <TextInput 
                style={[styles.rowInput, { color: theme.text }]}
                value={form.whatsapp_number}
                onChangeText={(v) => setForm({...form, whatsapp_number: v})}
                placeholder="e.g. +234..."
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* 🛍️ SECTION: SHOP TOOLS (Conditional) */}
        {isMerchant && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Merchant Controls</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <SettingToggle 
                theme={theme} icon={Store} label="Store Status" 
                sub={profile?.is_store_open ? "Shop is visible" : "Shop is hidden"}
                value={profile?.is_store_open ?? false}
                onToggle={(v: boolean) => handleToggle('is_store_open', v)}
                isLoading={syncing === 'is_store_open'}
              />
              <SettingLink 
                theme={theme} icon={Clock} label="Store Hours" 
                sub="Auto-toggle availability" onPress={() => {}} 
              />
              <SettingLink 
                theme={theme} icon={MapPin} label="City" 
                sub={form.location} onPress={() => {}} 
              />
            </View>
          </>
        )}

        {/* 🛡️ SECTION: PRIVACY */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Privacy & Safety</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingToggle 
            theme={theme} icon={Bookmark} label="Private Wardrobe" 
            sub="Hide saved items from others"
            value={profile?.is_wardrobe_private ?? false}
            onToggle={(v: boolean) => handleToggle('is_store_open', v)}
            isLoading={syncing === 'is_wardrobe_private'}
          />
          <SettingLink 
            theme={theme} icon={EyeOff} label="Blocked Users" 
            sub="Manage restricted accounts" onPress={() => {}} 
          />
        </View>

        {/* 💬 SECTION: SUPPORT & DEVICE */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>System</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme} icon={HelpCircle} label="Help Center" 
            sub="Guides & Support Tickets" onPress={() => router.push('/activity/support-new')} 
          />
          <SettingLink 
            theme={theme} icon={HardDrive} label="Clear Cache" 
            sub="Free up local space" onPress={handleClearCache} 
          />
        </View>

        {/* 🔐 SECTION: SECURITY */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Security</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme} icon={KeyRound} label="Update Password" 
            sub="Secure your account" onPress={() => router.push('/auth/reset-password')} 
          />
          <SettingLink 
            theme={theme} icon={Smartphone} label="Active Devices" 
            sub="Manage sessions" onPress={() => {}} 
          />
        </View>

        {/* 🚪 LOGOUT BUTTON */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { borderColor: '#EF4444' }]} 
          onPress={() => {
            Alert.alert("Sign Out", "Are you sure you want to exit?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: () => {
                supabase.auth.signOut();
                clearUser();
                router.replace('/auth/login');
              }}
            ]);
          }}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>SIGN OUT</Text>
        </TouchableOpacity>

        <Text style={[styles.footerVersion, { color: theme.border }]}>BUILD 2026.01.19 • V112.0</Text>
      </ScrollView>
    </View>
  );
}

/** 🏗️ REUSABLE MENU COMPONENTS */

const SettingLink = ({ icon: Icon, label, sub, onPress, theme }: any) => (
  <TouchableOpacity style={styles.row} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
    <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
      <Icon size={20} color={theme.text} strokeWidth={2.5} />
    </View>
    <View style={styles.rowText}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.subLabel, { color: theme.subtext }]}>{sub}</Text>
    </View>
    <ChevronRight size={16} color={theme.border} />
  </TouchableOpacity>
);

const SettingToggle = ({ icon: Icon, label, sub, value, onToggle, isLoading, theme }: any) => (
  <View style={styles.row}>
    <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
      <Icon size={20} color={theme.text} strokeWidth={2.5} />
    </View>
    <View style={styles.rowText}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.subLabel, { color: theme.subtext }]}>{sub}</Text>
    </View>
    {isLoading ? (
      <ActivityIndicator size="small" color={Colors.brand.emerald} />
    ) : (
      <Switch 
        value={value} onValueChange={onToggle}
        trackColor={{ true: Colors.brand.emerald, false: theme.border }}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5, zIndex: 10 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  saveBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  scrollArea: { padding: 25 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase', marginLeft: 5 },
  card: { borderRadius: 32, padding: 12, marginBottom: 35, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1 },
  label: { fontSize: 15, fontWeight: '800' },
  subLabel: { fontSize: 11, fontWeight: '600', marginTop: 3, opacity: 0.6 },
  inputGroup: { paddingHorizontal: 12, marginBottom: 20 },
  fieldLabel: { fontSize: 8, fontWeight: '900', marginBottom: 8, letterSpacing: 1.2 },
  input: { borderRadius: 16, paddingHorizontal: 15, height: 54, fontSize: 14, fontWeight: '700', borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, height: 54, borderWidth: 1, gap: 10 },
  rowInput: { flex: 1, fontSize: 14, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 70, borderRadius: 24, borderWidth: 2, marginBottom: 30 },
  logoutText: { color: '#EF4444', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  footerVersion: { textAlign: 'center', fontSize: 8, fontWeight: '900', letterSpacing: 1, opacity: 0.3 }
});