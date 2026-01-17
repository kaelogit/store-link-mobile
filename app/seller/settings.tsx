import React, { useState } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Switch, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, MapPin, Lock, ChevronRight, Save, Phone
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 SETTINGS TERMINAL v110.2 (Pure Build)
 * Audited: Section IV Sovereign Negotiation & Section III Geographic Anchoring.
 * Updated: WhatsApp Handshake Integration for Manifest v78.0.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    location: profile?.location || "Lagos",
    whatsapp_number: profile?.whatsapp_number || "",
    is_wardrobe_private: profile?.is_wardrobe_private || false,
    notifications_enabled: true 
  });

  const handleSave = async () => {
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
          is_wardrobe_private: form.is_wardrobe_private,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Registry Updated", "Your identity and trade settings are now live.");
    } catch (e: any) {
      Alert.alert("Sync Error", "Could not broadcast changes to the registry.");
    } finally {
      setLoading(false);
    }
  };

  const isMerchant = profile?.is_seller;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🏛️ HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>IDENTITY & SETTINGS</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.brand.emerald} />
          ) : (
            <Save size={22} color={Colors.brand.emerald} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>
        
        {/* 👤 PUBLIC PROFILE */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Public Identity</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>
              {isMerchant ? 'SHOP NAME' : 'DISPLAY NAME'}
            </Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={form.display_name}
              onChangeText={(v) => setForm({...form, display_name: v})}
              placeholder="Enter identity name..."
              placeholderTextColor={theme.subtext}
            />
          </View>

          {/* 📞 WHATSAPP HANDSHAKE (Section IV) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>WHATSAPP CONTACT (SOVEREIGN LOGISTICS)</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Phone size={16} color={theme.subtext} />
              <TextInput 
                style={[styles.rowInput, { color: theme.text }]}
                value={form.whatsapp_number}
                onChangeText={(v) => setForm({...form, whatsapp_number: v})}
                placeholder="e.g. +234..."
                placeholderTextColor={theme.subtext}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>
              {isMerchant ? 'SHOP BIO' : 'PERSONAL BIO'}
            </Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, height: 80, paddingTop: 15 }]}
              value={form.bio}
              onChangeText={(v) => setForm({...form, bio: v})}
              placeholder="Tell the vortex about your presence..."
              placeholderTextColor={theme.subtext}
              multiline
            />
          </View>
        </View>

        {/* 📍 GEOGRAPHIC ANCHOR (Section III) */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Discovery Vortex</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.selectorRow} onPress={() => {/* Location Picker */}}>
            <MapPin size={20} color={theme.text} />
            <View style={styles.selectorTextContent}>
              <Text style={[styles.selectorTitle, { color: theme.text }]}>Trade Location</Text>
              <Text style={styles.selectorSub}>{form.location}</Text>
            </View>
            <ChevronRight size={16} color={theme.subtext} />
          </TouchableOpacity>
          <Text style={[styles.infoText, { color: theme.subtext }]}>
            Your location defines your merit boost in the Discovery Vortex for local members.
          </Text>
        </View>

        {/* 🛡️ PRIVACY (Section I) */}
        <Text style={[styles.sectionLabel, { color: theme.subtext }]}>Privacy Guard</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={[styles.toggleTitle, { color: theme.text }]}>Private Wardrobe</Text>
              <Text style={[styles.toggleSub, { color: theme.subtext }]}>Hide your collection from general members.</Text>
            </View>
            <Switch 
              value={form.is_wardrobe_private}
              onValueChange={(v) => setForm({...form, is_wardrobe_private: v})}
              trackColor={{ true: Colors.brand.emerald, false: theme.border }}
              thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
            />
          </View>
        </View>

        {/* 🚪 SECURITY */}
        <TouchableOpacity 
          style={[styles.dangerBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={() => router.push('/auth/reset-password')}
        >
          <Lock size={16} color={theme.subtext} />
          <Text style={[styles.dangerText, { color: theme.text }]}>CHANGE PASSWORD</Text>
        </TouchableOpacity>

        <Text style={[styles.footerVersion, { color: theme.border }]}>STORELINK CORE v110.2</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 10 : 40, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  saveBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  scrollArea: { padding: 25 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 15, textTransform: 'uppercase' },
  card: { borderRadius: 28, padding: 20, marginBottom: 35, borderWidth: 1 },
  inputGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 8, fontWeight: '900', marginBottom: 8, letterSpacing: 1.2 },
  input: { borderRadius: 16, paddingHorizontal: 15, height: 54, fontSize: 14, fontWeight: '700', borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, height: 54, borderWidth: 1, gap: 10 },
  rowInput: { flex: 1, fontSize: 14, fontWeight: '700' },
  selectorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  selectorTextContent: { flex: 1, marginLeft: 15 },
  selectorTitle: { fontSize: 14, fontWeight: '800' },
  selectorSub: { fontSize: 12, color: Colors.brand.emerald, fontWeight: '900', marginTop: 2 },
  infoText: { fontSize: 10, fontWeight: '600', marginTop: 15, lineHeight: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '800' },
  toggleSub: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 20, borderWidth: 1 },
  dangerText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  footerVersion: { textAlign: 'center', marginTop: 40, fontSize: 8, fontWeight: '900', letterSpacing: 2, paddingBottom: 60 }
});