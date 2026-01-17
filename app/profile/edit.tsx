import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, TextInput, 
  Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Camera, Image as ImageIcon, 
  Save, CheckCircle2, User, MapPin, Lock
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { addDays, format, isAfter } from 'date-fns';

// Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 PROFILE EDIT HUB v118.0
 * Fixed: Locked years removed from countdown.
 * Fixed: Bio scroll-up visibility and focused keyboard avoidance.
 * Security: Individual handle and location tracking columns applied.
 */
export default function ProfileEditScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    slug: profile?.slug || "",
    bio: profile?.bio || "",
    location: profile?.location || "Lagos",
    logo_url: profile?.logo_url || "",
    cover_image_url: profile?.cover_image_url || ""
  });

  // 🛡️ SECURITY LOCK LOGIC (Month and Day only)
  const lastHandleDate = profile?.handle_last_changed_at ? new Date(profile.handle_last_changed_at) : new Date(0);
  const lastLocationDate = profile?.location_last_changed_at ? new Date(profile.location_last_changed_at) : new Date(0);
  
  const handleUnlockDate = addDays(lastHandleDate, 30);
  const locationUnlockDate = addDays(lastLocationDate, 30);

  const isHandleLocked = !isAfter(new Date(), handleUnlockDate);
  const isLocationLocked = !isAfter(new Date(), locationUnlockDate);

  const formattedHandleDate = format(handleUnlockDate, 'MMMM do'); // e.g. "February 15th"
  const formattedLocationDate = format(locationUnlockDate, 'MMMM do');

  const pickImage = async (type: 'logo' | 'cover') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) uploadImage(result.assets[0].uri, type);
  };

  const uploadImage = async (uri: string, type: 'logo' | 'cover') => {
    setUploading(type);
    try {
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${profile?.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob, { contentType: `image/${fileExt}`, upsert: true });

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);
      
      setForm(prev => ({ ...prev, [type === 'logo' ? 'logo_url' : 'cover_image_url']: publicUrl }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Upload Failed", "We couldn't save your image.");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          display_name: form.full_name.trim(),
          slug: form.slug.toLowerCase().trim(),
          bio: form.bio.trim(),
          location: form.location,
          logo_url: form.logo_url,
          cover_image_url: form.cover_image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (error) throw error;
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", "Save failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>EDIT PROFILE</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading || !!uploading} style={styles.navBtn}>
          {loading ? <ActivityIndicator size="small" color={Colors.brand.emerald} /> : <Text style={styles.saveText}>SAVE</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.visualZone}>
            <TouchableOpacity 
              style={[styles.coverWrapper, { backgroundColor: theme.surface }]} 
              onPress={() => pickImage('cover')}
            >
              {form.cover_image_url ? (
                <Image source={{ uri: form.cover_image_url }} style={styles.coverImg} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <ImageIcon size={24} color={theme.subtext} />
                  <Text style={[styles.placeholderText, { color: theme.subtext }]}>CHANGE COVER</Text>
                </View>
              )}
              <View style={styles.editOverlay}><Camera size={16} color="white" /></View>
            </TouchableOpacity>

            <View style={styles.logoAnchor}>
              <TouchableOpacity 
                style={[styles.logoWrapper, { backgroundColor: theme.background }]} 
                onPress={() => pickImage('logo')}
              >
                {form.logo_url ? (
                  <Image source={{ uri: form.logo_url }} style={styles.logoImg} />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: theme.surface }]}><User size={30} color={theme.subtext} /></View>
                )}
                <View style={[styles.logoEditOverlay, { backgroundColor: theme.text }]}><Camera size={12} color="white" /></View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formFields}>
            
            {/* FULL NAME: Always Editable */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>FULL NAME</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={form.full_name}
                onChangeText={(v) => setForm({...form, full_name: v})}
                placeholder="Enter display name"
                placeholderTextColor={theme.subtext}
              />
            </View>

            {/* HANDLE: 30-Day Lock */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>HANDLE (@)</Text>
              <View style={[styles.input, styles.lockedRow, { backgroundColor: isHandleLocked ? theme.border + '30' : theme.surface, borderColor: theme.border }]}>
                <TextInput 
                  style={{ color: isHandleLocked ? theme.subtext : theme.text, flex: 1, fontWeight: '700' }}
                  value={form.slug}
                  onChangeText={(v) => setForm({...form, slug: v})}
                  editable={!isHandleLocked}
                  autoCapitalize="none"
                />
                {isHandleLocked && <Lock size={14} color={theme.subtext} />}
              </View>
              {isHandleLocked && <Text style={styles.lockWarning}>Next change available on {formattedHandleDate}</Text>}
            </View>

            {/* LOCATION: 30-Day Lock */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>LOCATION</Text>
              <View style={[styles.input, styles.lockedRow, { backgroundColor: isLocationLocked ? theme.border + '30' : theme.surface, borderColor: theme.border }]}>
                <MapPin size={16} color={isLocationLocked ? theme.subtext : Colors.brand.emerald} />
                <TextInput 
                  style={{ color: isLocationLocked ? theme.subtext : theme.text, flex: 1, marginLeft: 10, fontWeight: '700' }}
                  value={form.location}
                  onChangeText={(v) => setForm({...form, location: v})}
                  editable={!isLocationLocked}
                />
                {isLocationLocked && <Lock size={14} color={theme.subtext} />}
              </View>
              {isLocationLocked && <Text style={styles.lockWarning}>Next update available on {formattedLocationDate}</Text>}
            </View>

            {/* BIO: Scrollable and Always Editable */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>BIO / DESCRIPTION</Text>
              <TextInput 
                style={[styles.input, styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={form.bio}
                onChangeText={(v) => setForm({...form, bio: v})}
                placeholder="Tell people about your store..."
                placeholderTextColor={theme.subtext}
                multiline
                scrollEnabled={true} // 🛠️ Enabled internal scrolling for bio
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: Colors.brand.emerald + '10' }]}>
              <CheckCircle2 size={16} color={Colors.brand.emerald} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                Profile changes are applied immediately.
              </Text>
            </View>
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  navBtn: { padding: 5 },
  saveText: { color: Colors.brand.emerald, fontWeight: '900', fontSize: 14 },
  scrollContent: { flexGrow: 1 },
  visualZone: { height: 220, marginBottom: 15 },
  coverWrapper: { height: 160, position: 'relative', overflow: 'hidden' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  placeholderText: { fontSize: 9, fontWeight: '900' },
  editOverlay: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  logoAnchor: { position: 'absolute', bottom: 0, left: 25 },
  logoWrapper: { width: 100, height: 100, borderRadius: 24, padding: 4, elevation: 5 },
  logoImg: { width: '100%', height: '100%', borderRadius: 20 },
  logoPlaceholder: { flex: 1, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  logoEditOverlay: { position: 'absolute', bottom: 5, right: 5, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  uploadShield: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  formFields: { paddingHorizontal: 25, paddingTop: 10 },
  inputGroup: { marginBottom: 15 },
  fieldLabel: { fontSize: 9, fontWeight: '900', marginBottom: 8, color: '#999' },
  input: { borderRadius: 12, paddingHorizontal: 15, height: 50, fontSize: 14, fontWeight: '700', borderWidth: 1 },
  lockedRow: { flexDirection: 'row', alignItems: 'center' },
  lockWarning: { fontSize: 10, color: '#EF4444', marginTop: 6, fontWeight: '700' },
  textArea: { height: 100, paddingTop: 15, textAlignVertical: 'top' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 12, marginTop: 10 },
  infoText: { flex: 1, fontSize: 11, fontWeight: '700' }
});