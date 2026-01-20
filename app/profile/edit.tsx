import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, TextInput, 
  Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView,
  Modal, FlatList, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Camera, User, MapPin, Lock, Globe, Search, ChevronRight, X
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { addDays, format, isAfter } from 'date-fns';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏛️ NIGERIA LOCATIONS LIST (Audited for Accuracy)
 */
const NIGERIA_LOCATIONS: Record<string, string[]> = {
  "Abia": ["Umuahia", "Aba", "Ohafia", "Arochukwu", "Bende"],
  "Adamawa": ["Yola", "Jimeta", "Mubi", "Numan"],
  "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene", "Oron"],
  "Anambra": ["Awka", "Onitsha", "Nnewi", "Ekwulobia"],
  "Bauchi": ["Bauchi", "Azare", "Misau"],
  "Bayelsa": ["Yenagoa", "Brass", "Sagbama"],
  "Benue": ["Makurdi", "Gboko", "Otukpo"],
  "Borno": ["Maiduguri", "Biu"],
  "Cross River": ["Calabar", "Ikom", "Ogoja"],
  "Delta": ["Asaba", "Warri", "Sapele", "Ughelli"],
  "Ebonyi": ["Abakaliki", "Afikpo"],
  "Edo": ["Benin City", "Auchi", "Ekpoma"],
  "Ekiti": ["Ado-Ekiti", "Ikere-Ekiti"],
  "Enugu": ["Enugu", "Nsukka"],
  "FCT - Abuja": ["Garki", "Wuse", "Maitama", "Asokoro", "Gwarinpa", "Kubwa", "Lugbe"],
  "Gombe": ["Gombe"],
  "Imo": ["Owerri", "Orlu", "Okigwe"],
  "Jigawa": ["Dutse", "Hadejia"],
  "Kaduna": ["Kaduna", "Zaria", "Kafanchan"],
  "Kano": ["Kano", "Wudil"],
  "Katsina": ["Katsina", "Funtua"],
  "Kebbi": ["Birnin Kebbi"],
  "Kogi": ["Lokoja", "Idah", "Okene"],
  "Kwara": ["Ilorin", "Offa"],
  "Lagos": ["Ikeja", "Lekki", "Victoria Island", "Ajah", "Surulere", "Ikorodu", "Epe", "Badagry", "Magodo", "Festac"],
  "Nasarawa": ["Lafia", "Keffi"],
  "Niger": ["Minna", "Bida", "Suleja"],
  "Ogun": ["Abeokuta", "Ijebu Ode", "Ota", "Sagamu"],
  "Ondo": ["Akure", "Ondo", "Owo"],
  "Osun": ["Osogbo", "Ile-Ife", "Ilesa"],
  "Oyo": ["Ibadan", "Ogbomoso", "Oyo"],
  "Plateau": ["Jos"],
  "Rivers": ["Port Harcourt", "Bonny", "Degema"],
  "Sokoto": ["Sokoto"],
  "Taraba": ["Jalingo"],
  "Yobe": ["Damaturu"],
  "Zamfara": ["Gusau"]
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: any;
  icon?: any;
  multiline?: boolean;
  maxLength?: number;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    slug: profile?.slug || "",
    bio: profile?.bio || "",
    location: profile?.location || "",
    location_state: profile?.location_state || "Lagos",
    location_city: profile?.location_city || "Ikeja",
    logo_url: profile?.logo_url || "",
  });

  // 🛡️ SECURITY LOCKS
  const handleUnlockDate = addDays(new Date(profile?.handle_last_changed_at || 0), 30);
  const locationUnlockDate = addDays(new Date(profile?.location_last_changed_at || 0), 30);

  const isHandleLocked = !isAfter(new Date(), handleUnlockDate);
  const isCityLocked = !isAfter(new Date(), locationUnlockDate);

  const filteredStates = useMemo(() => 
    Object.keys(NIGERIA_LOCATIONS).filter(s => s.toLowerCase().includes(pickerSearch.toLowerCase())), 
  [pickerSearch]);

  const filteredCities = useMemo(() => 
    selectedState ? NIGERIA_LOCATIONS[selectedState].filter(c => c.toLowerCase().includes(pickerSearch.toLowerCase())) : [], 
  [selectedState, pickerSearch]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadProfileImage(result.assets[0].uri);
    }
  };

  /** 🛡️ HIGH-END UPLOAD PROTOCOL (Network Failure Fix) */
  const uploadProfileImage = async (uri: string) => {
    setUploading(true);
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `branding/logo_${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      // 🛡️ THE FIX: Convert to Blob (Stable Handshake)
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob, { 
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`, 
          upsert: true 
        });

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);
      
      // Cache busting with timestamp
      setForm(prev => ({ ...prev, logo_url: `${publicUrl}?t=${Date.now()}` }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Logo Upload Failed:", e);
      Alert.alert("Upload Failed", "Network interrupted. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updates: any = {
        full_name: form.full_name.trim(),
        display_name: form.full_name.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        logo_url: form.logo_url,
        updated_at: new Date().toISOString()
      };

      // 🛡️ Handle Protected Fields
      if (!isHandleLocked && form.slug.toLowerCase().trim() !== profile?.slug) {
        updates.slug = form.slug.toLowerCase().trim();
        updates.handle_last_changed_at = new Date().toISOString();
      }

      if (!isCityLocked && (form.location_city !== profile?.location_city || form.location_state !== profile?.location_state)) {
        updates.location_state = form.location_state;
        updates.location_city = form.location_city;
        updates.location_last_changed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile?.id);
      if (error) throw error;
      
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Save Error", "Could not synchronize changes with server.");
    } finally {
      setLoading(false);
    }
  };

  const renderLocationPicker = () => (
    <Modal visible={showPicker} animationType="slide" transparent={false}>
      <View style={[styles.modalContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { setSelectedState(null); setPickerSearch(''); setShowPicker(false); }}>
            <X size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {selectedState ? `Cities in ${selectedState}` : 'Select State'}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={[styles.pickerSearchBox, { backgroundColor: theme.surface }]}>
          <Search size={18} color={theme.subtext} />
          <TextInput
            placeholder="Filter results..."
            placeholderTextColor={theme.subtext}
            style={[styles.pickerSearchInput, { color: theme.text }]}
            value={pickerSearch}
            onChangeText={setPickerSearch}
          />
        </View>

        <FlatList
          data={selectedState ? filteredCities : filteredStates}
          keyExtractor={(item) => item}
          contentContainerStyle={{ padding: 25 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.pickerItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                if (!selectedState) {
                  setSelectedState(item);
                  setPickerSearch('');
                } else {
                  setForm(prev => ({ ...prev, location_state: selectedState, location_city: item }));
                  setShowPicker(false);
                  setSelectedState(null);
                  setPickerSearch('');
                }
              }}
            >
              <Text style={[styles.pickerItemText, { color: theme.text }]}>{item}</Text>
              <ChevronRight size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top || 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}><ArrowLeft color={theme.text} size={24} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>BRAND STUDIO</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading || uploading} style={styles.navBtn}>
          {loading ? <ActivityIndicator size="small" color={Colors.brand.emerald} /> : <Text style={styles.saveText}>SAVE</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.photoContainer}>
              <TouchableOpacity style={[styles.logoWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={pickImage} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color={Colors.brand.emerald} />
                ) : (
                  <>
                    {form.logo_url ? <Image source={{ uri: form.logo_url }} style={styles.logoImg} /> : <User size={44} color={theme.subtext} />}
                    <View style={[styles.logoEditOverlay, { backgroundColor: theme.text }]}><Camera size={14} color={theme.background} /></View>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.uploadSubtext}>Tap to change store logo</Text>
          </View>

          <View style={styles.formFields}>
            <Field label="FULL DISPLAY NAME" value={form.full_name} onChange={(v) => setForm({...form, full_name: v})} theme={theme} maxLength={40} />
            
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>STORE USERNAME (@)</Text>
              <View style={[styles.input, isHandleLocked && styles.lockedRow, { backgroundColor: isHandleLocked ? `${theme.border}40` : theme.surface, borderColor: theme.border }]}>
                <TextInput 
                  style={{ color: isHandleLocked ? theme.subtext : theme.text, flex: 1, fontWeight: '700', fontSize: 15 }} 
                  value={form.slug} 
                  onChangeText={(v) => setForm({...form, slug: v.toLowerCase().trim()})} 
                  editable={!isHandleLocked} 
                  autoCapitalize="none" 
                />
                {isHandleLocked && <Lock size={14} color={theme.subtext} />}
              </View>
              {isHandleLocked && <Text style={styles.lockWarning}>Username is locked until {format(handleUnlockDate, 'MMMM do')}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>TRADING LOCATION (CITY)</Text>
              <TouchableOpacity 
                disabled={isCityLocked}
                style={[styles.input, isCityLocked && styles.lockedRow, { backgroundColor: isCityLocked ? `${theme.border}40` : theme.surface, borderColor: theme.border }]}
                onPress={() => setShowPicker(true)}
              >
                <Globe size={18} color={isCityLocked ? theme.subtext : Colors.brand.emerald} />
                <Text style={{ color: isCityLocked ? theme.subtext : theme.text, flex: 1, marginLeft: 10, fontWeight: '700', fontSize: 15 }}>
                  {form.location_state}, {form.location_city}
                </Text>
                {isCityLocked ? <Lock size={14} color={theme.subtext} /> : <ChevronRight size={18} color={theme.subtext} />}
              </TouchableOpacity>
              {isCityLocked && <Text style={styles.lockWarning}>Location is locked until {format(locationUnlockDate, 'MMMM do')}</Text>}
            </View>

            <Field label="STREET ADDRESS (OPTIONAL)" value={form.location} onChange={(v) => setForm({...form, location: v})} theme={theme} icon={<MapPin size={18} color={theme.subtext} />} maxLength={100} />
            <Field label="STORE BIO" value={form.bio} onChange={(v) => setForm({...form, bio: v})} theme={theme} multiline maxLength={150} />
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      {renderLocationPicker()}
    </View>
  );
}

const Field = ({ label, value, onChange, theme, icon, multiline, maxLength }: FieldProps) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
        {maxLength && <Text style={styles.limitText}>{value.length}/{maxLength}</Text>}
    </View>
    <View style={[styles.input, multiline && styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {icon}
      <TextInput 
        style={[{ color: theme.text, flex: 1, fontWeight: '700', fontSize: 15, marginLeft: icon ? 10 : 0 }, multiline && { textAlignVertical: 'top', paddingTop: 18 }]} 
        value={value} 
        onChangeText={onChange} 
        multiline={multiline}
        maxLength={maxLength}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  navBtn: { padding: 5 },
  saveText: { color: Colors.brand.emerald, fontWeight: '900', fontSize: 14 },
  photoContainer: { alignItems: 'center', marginVertical: 35 },
  logoWrapper: { width: 110, height: 110, borderRadius: 32, borderWidth: 2, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  logoEditOverlay: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderTopLeftRadius: 15, justifyContent: 'center', alignItems: 'center' },
  uploadSubtext: { fontSize: 10, fontWeight: '700', marginTop: 12, opacity: 0.5, letterSpacing: 1 },
  formFields: { paddingHorizontal: 25 },
  inputGroup: { marginBottom: 28 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  fieldLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, opacity: 0.5 },
  limitText: { fontSize: 9, fontWeight: '800', opacity: 0.3 },
  input: { borderRadius: 18, paddingHorizontal: 20, height: 60, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center' },
  lockedRow: { opacity: 0.7 },
  lockWarning: { fontSize: 9, color: '#EF4444', marginTop: 10, fontWeight: '900', letterSpacing: 0.5 },
  textArea: { height: 130 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  modalTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  pickerSearchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 18, height: 54, borderRadius: 16 },
  pickerSearchInput: { flex: 1, marginLeft: 12, fontWeight: '700', fontSize: 15 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1.5 },
  pickerItemText: { fontSize: 15, fontWeight: '700' }
});