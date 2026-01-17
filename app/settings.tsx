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
  Clock, MapPin, Languages, KeyRound
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';

// 🏛️ Sovereign Components
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/useUserStore'; 
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

/**
 * 🏰 SYSTEM SETTINGS v27.1 (Pure Build)
 * Audited: Section I Identity Layer & Security Protocols.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [syncing, setSyncing] = useState(false);
  const [storeOpen, setStoreOpen] = useState(profile?.is_store_open ?? true);
  const [biometrics, setBiometrics] = useState(false);
  const [notifications, setNotifications] = useState({
    orders: true,
    messages: true,
    updates: false
  });

  const handleToggleStore = async (value: boolean) => {
    setSyncing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_store_open: value })
        .eq('id', profile?.id);

      if (error) throw error;
      setStoreOpen(value);
      await refreshUserData();
    } catch (e) {
      setStoreOpen(!value);
      Alert.alert("Error", "Could not update your store status.");
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleBiometrics = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert("Not Supported", "Your device does not support FaceID or TouchID.");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm Identity',
      });
      if (result.success) setBiometrics(true);
    } else {
      setBiometrics(false);
    }
  };

  return (
    <View style={styles.container}>
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
        
        {/* SHOP SETTINGS (Only for Merchants) */}
        {profile?.is_seller && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>SHOP OPERATIONS</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <SettingToggle 
                theme={theme}
                icon={Store} 
                label="Online Status" 
                sub={storeOpen ? "Your shop is visible to customers" : "Shop is currently hidden"}
                value={storeOpen} 
                onToggle={handleToggleStore}
                isLoading={syncing}
              />
              <SettingLink 
                theme={theme}
                icon={Clock} 
                label="Opening Hours" 
                sub="Set your available times"
                onPress={() => {}} 
              />
              <SettingLink 
                theme={theme}
                icon={MapPin} 
                label="Delivery Zones" 
                sub="Manage shipping locations"
                onPress={() => router.push('/seller/logistics')} 
              />
            </View>
          </>
        )}

        {/* SECURITY */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>SECURITY</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme}
            icon={KeyRound} 
            label="Change Password" 
            sub="Update your login credentials"
            onPress={() => router.push('/auth/update-password')} 
          />
          <SettingToggle 
            theme={theme}
            icon={Fingerprint} 
            label="Biometric Login" 
            sub="FaceID or Fingerprint"
            value={biometrics} 
            onToggle={handleToggleBiometrics} 
          />
          <SettingLink 
            theme={theme}
            icon={Smartphone} 
            label="Logged-in Devices" 
            sub="Manage active sessions"
            onPress={() => {}} 
          />
        </View>

        {/* NOTIFICATIONS */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingToggle 
            theme={theme}
            icon={Bell} 
            label="Order Updates" 
            value={notifications.orders} 
            onToggle={() => setNotifications({...notifications, orders: !notifications.orders})} 
          />
          <SettingToggle 
            theme={theme}
            icon={Globe} 
            label="Marketplace News" 
            value={notifications.updates} 
            onToggle={() => setNotifications({...notifications, updates: !notifications.updates})} 
          />
        </View>

        {/* PREFERENCES */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme}
            icon={Moon} 
            label="Appearance" 
            sub={`Theme: ${colorScheme?.toUpperCase()}`}
            onPress={() => {}} 
          />
          <SettingLink 
            theme={theme}
            icon={Languages} 
            label="Language" 
            sub="English (Nigeria)"
            onPress={() => {}} 
          />
        </View>

        {/* ACCOUNT MANAGEMENT */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>ACCOUNT MANAGEMENT</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingLink 
            theme={theme}
            icon={UserX} 
            label="Delete Account" 
            sub="Permanently remove your data"
            color="#EF4444"
            onPress={() => {}} 
          />
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={20} color={theme.border} strokeWidth={2} />
          <Text style={[styles.versionText, { color: theme.subtext }]}>STORELINK v75.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', backgroundColor: 'transparent' },
  scrollArea: { padding: 25, paddingBottom: 60, backgroundColor: 'transparent' },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  card: { borderRadius: 32, padding: 8, marginBottom: 35, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 15, backgroundColor: 'transparent' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  subLabel: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  footer: { marginTop: 20, alignItems: 'center', marginBottom: 40, gap: 10, backgroundColor: 'transparent' },
  versionText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});