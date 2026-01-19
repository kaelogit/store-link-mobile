import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, TextInput, 
  Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView,
  Modal, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decode } from 'base64-arraybuffer';
import { 
  ArrowLeft, Camera, User, MapPin, Lock, Globe, Search, ChevronRight, X
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { addDays, format, isAfter } from 'date-fns';

// SDK 54 FIX: Using legacy path for file stability
import * as FileSystem from 'expo-file-system/legacy';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏛️ NIGERIA LOCATIONS LIST
 */
const NIGERIA_LOCATIONS: Record<string, string[]> = {
  "Abia": ["Umuahia", "Aba", "Ohafia", "Arochukwu", "Bende", "Isuikwuato", "Umunneochi", "Isiala Ngwa", "Osisioma", "Ikwuano", "Ukwa", "Ugwunagbo", "Obingwa", "Isiala Ngwa North", "Isiala Ngwa South", "Aba North", "Aba South"],
  "Adamawa": ["Yola", "Jimeta", "Mubi", "Numan", "Ganye", "Gombi", "Hong", "Madagali", "Michika", "Maiha", "Shelleng", "Song", "Toungo", "Fufore", "Guyuk", "Lamurde", "Mayo-Belwa", "Demsa", "Jada"],
  "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene", "Ini", "Itu", "Mbo", "Mkpat-Enin", "Nsit Atai", "Nsit Ibom", "Nsit Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung Uko", "Ukanafun", "Uruan", "Urue-Offong Oruko", "Uyo"],
  "Anambra": ["Awka", "Onitsha", "Nnewi", "Ekwulobia", "Ihiala", "Aguleri", "Otuocha", "Nkpor", "Obosi", "Ogidi", "Ojoto", "Abagana", "Neni", "Alor", "Ogbunike", "Umunya", "Ukpo", "Nsugbe", "Umuleri", "Atani", "Ozubulu", "Okija", "Uga", "Igbariam", "Nteje", "Awkuzu", "Achalla", "Enugwu-Ukwu", "Nawfia", "Nimo", "Abatete", "Oraukwu", "Umunze", "Isuofia", "Ajalli", "Amichi", "Osumenyi", "Azia", "Lilu"],
  "Bauchi": ["Bauchi", "Azare", "Misau", "Jama’are", "Katagum", "Alkaleri", "Dass", "Tafawa Balewa", "Bogoro", "Toro", "Ningi", "Warji", "Ganjuwa", "Darazo", "Zaki", "Giade", "Itas Gadau", "Shira", "Dambam", "Gamawa"],
  "Bayelsa": ["Yenagoa", "Ogbia", "Otuoke", "Kaiama", "Brass", "Twon-Brass", "Sagbama", "Amassoma", "Nembe", "Okpoama", "Ekeremor", "Peremabiri", "Oporoma", "Odi", "Akassa", "Oloibiri"],
  "Benue": ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala", "Vandeikya", "Konshisha", "Kwande", "Ukum", "Ushongo", "Gwer East", "Gwer West", "Guma", "Buruku", "Tarka", "Logo", "Apa", "Agatu", "Ado", "Ogbadibo", "Okpokwu", "Ohimini", "Oju", "Obi"],
  "Borno": ["Maiduguri", "Biu", "Bama", "Dikwa", "Gwoza", "Monguno", "Ngala", "Damboa", "Konduga", "Kukawa", "Magumeri", "Mafa", "Jere", "Kaga", "Gubio", "Abadam", "Askira-Uba", "Chibok", "Hawul", "Kwaya Kusar", "Shani", "Mobbar", "Marte", "Kala-Balge", "Nganzai"],
  "Cross River": ["Calabar", "Ikom", "Ogoja", "Obudu", "Akamkpa", "Etung", "Boki", "Bekwarra", "Akpabuyo", "Bakassi", "Abi", "Yala", "Obanliku", "Obubra", "Yakurr", "Biase"],
  "Delta": ["Asaba", "Warri", "Sapele", "Ughelli", "Effurun", "Agbor", "Abraka", "Ozoro", "Oleh", "Kwale", "Udu", "Bomadi", "Burutu", "Uvwie", "Okpe", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Ndokwa East", "Ndokwa West", "Patani", "Oshimili North", "Oshimili South", "Aniocha North", "Aniocha South", "Isoko North", "Isoko South", "Warri South", "Warri North", "Warri South West"],
  "Ebonyi": ["Abakaliki", "Afikpo", "Onueke", "Ezza", "Ikwo", "Ishielu", "Ivo", "Ohaozara", "Ohaukwu", "Afikpo North", "Afikpo South"],
  "Edo": ["Benin City", "Auchi", "Ekpoma", "Uromi", "Igarra", "Oredo", "Etsako West", "Esan Central", "Esan West", "Esan North-East", "Esan South-East", "Egor", "Ikpoba-Okha", "Ovia North-East", "Ovia South-West", "Orhionmwon", "Uhunmwonde", "Akoko-Edo", "Etsako East", "Owan East", "Owan West"],
  "Ekiti": ["Ado-Ekiti", "Ikere-Ekiti", "Ikole", "Ijero-Ekiti", "Efon-Alaaye", "Oye-Ekiti", "Ise-Ekiti", "Irepodun/Ifelodun", "Emure", "Gbonyin", "Ekiti East", "Ekiti West", "Moba", "Ido-Osi"],
  "Enugu": ["Enugu", "Nsukka", "Awgu", "Oji River", "Udi", "Ezeagu", "Igbo-Eze North", "Igbo-Eze South", "Nkanu East", "Nkanu West", "Uzo-Uwani", "Aninri", "Isi-Uzo", "Oji-Ogwu", "Enugu East", "Enugu North", "Enugu South"],
  "Gombe": ["Gombe", "Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu-Deba"],
  "Imo": ["Owerri", "Orlu", "Okigwe", "Oguta", "Ohaji/Egbema", "Ihitte/Uboma", "Mbaitoli", "Nkwerre", "Ngor Okpala", "Orsu", "Ideato North", "Ideato South", "Njaba", "Nwangele", "Isu", "Onuimo", "Ehime Mbano", "Ezinihitte", "Owerri North", "Owerri West", "Owerri Municipal"],
  "Jigawa": ["Dutse", "Hadejia", "Kazaure", "Gumel", "Birnin Kudu", "Ringim", "Gwaram", "Kiyawa", "Maigatari", "Sule Tankarkar", "Taura", "Babura", "Miga", "Jahun", "Auyo", "Kaugama", "Guri", "Gwiwa", "Birniwa"],
  "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Sabon Gari", "Zonkwa", "Ikara", "Soba", "Kachia", "Kagarko", "Giwa", "Jema’a", "Birnin Gwari", "Lere", "Makarfi", "Chikun", "Kajuru", "Igabi", "Sanga", "Kubau", "Kaura", "Kudan"],
  "Kano": ["Kano", "Wudil", "Rano", "Bichi", "Gaya", "Karaye", "Kura", "Tudun Wada", "Sumaila", "Dawakin Tofa", "Bagwai", "Minjibir", "Gezawa", "Kumbotso", "Gwale", "Dala", "Tarauni", "Ungogo", "Fagge", "Nasarawa", "Ajingi", "Albasu", "Bebeji", "Garko", "Shanono", "Takai", "Rimin Gado", "Madobi", "Danbatta"],
  "Katsina": ["Katsina", "Funtua", "Daura", "Kankia", "Malumfashi", "Bakori", "Dutsin-Ma", "Kusada", "Mani", "Mashi", "Kafur", "Jibia", "Charanchi", "Musawa", "Dandume", "Kankara", "Kurfi", "Bindawa", "Ingawa"],
  "Kebbi": ["Birnin Kebbi", "Argungu", "Jega", "Yauri", "Zuru", "Gwandu", "Bagudo", "Kalgo", "Arewa", "Aliero", "Ngaski", "Maiyama", "Fakai", "Bunza", "Dandi", "Shanga", "Sakaba", "Danko-Wasagu", "Suru", "Wasagu/Danko"],
  "Kogi": ["Lokoja", "Kabba", "Idah", "Okene", "Dekina", "Ankpa", "Bassa", "Ofu", "Olamaboro", "Adavi", "Ogori/Magongo", "Mopa-Muro", "Yagba East", "Yagba West", "Ijumu", "Kogi", "Koton Karfe", "Okura", "Omala"],
  "Kwara": ["Ilorin", "Offa", "Omu-Aran", "Asa", "Edu", "Moro", "Patigi", "Kaiama", "Baruten", "Ekiti", "Ifelodun", "Irepodun", "Oke-Ero", "Oyun"],
  "Lagos": ["Ikeja", "Epe", "Ikorodu", "Badagry", "Apapa", "Victoria Island", "Lekki", "Ajah", "Surulere", "Agege", "Alimosho", "Mushin", "Oshodi", "Yaba", "Ijanikin", "Magodo", "Festac Town", "Ibeju-Lekki"],
  "Nasarawa": ["Lafia", "Akwanga", "Keffi", "Karu", "Obi", "Toto", "Nasarawa", "Doma", "Kokona", "Awe", "Wamba", "Nasarawa Eggon", "Keana"],
  "Niger": ["Minna", "Bida", "Suleja", "Kontagora", "Mokwa", "Lapai", "Borgu", "Lavun", "Rijau", "Edati", "Gbako", "Katcha", "Shiroro", "Rafi", "Mariga", "Mashegu", "Agaie"],
  "Ogun": ["Abeokuta", "Ijebu Ode", "Sagamu", "Ijebu Igbo", "Ota", "Ago Iwoye", "Imeko", "Odogbolu", "Ilaro", "Yewa", "Abeokuta North", "Abeokuta South", "Ewekoro", "Obafemi Owode", "Ifo", "Ado-Odo/Ota"],
  "Ondo": ["Akure", "Owo", "Ondo", "Ikare", "Okitipupa", "Irele", "Ile-Oluji", "Ose", "Ese-Odo", "Ifedore", "Idanre", "Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West"],
  "Osun": ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Iwo", "Ikirun", "Ikire", "Ejigbo", "Ifon", "Olorunda", "Atakunmosa", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Ilesa East", "Ilesa West", "Ila", "Ifelodun", "Ayedaade", "Ayedire", "Irepodun", "Irewole", "Isokan", "Obokun", "Odo-Otin", "Oriade", "Orolu"],
  "Oyo": ["Ibadan", "Ogbomoso", "Oyo", "Saki", "Iseyin", "Eruwa", "Ibarapa", "Okeho", "Igboho", "Oluyole", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Lagelu", "Ona-Ara", "Ogo-Oluwa", "Surulere", "Afijio", "Atiba", "Ido", "Irepo", "Iwajowa", "Kajola", "Saki East", "Saki West"],
  "Plateau": ["Jos", "Barkin Ladi", "Bokkos", "Pankshin", "Shendam", "Langtang North", "Langtang South", "Mangu", "Bassa", "Jos East", "Jos North", "Jos South", "Kanam", "Wase", "Riyom", "Qua’an Pan", "Mikang", "Kanke"],
  "Rivers": ["Port Harcourt", "Bonny", "Buguma", "Bori", "Ahoada", "Omoku", "Eleme", "Oyigbo", "Degema", "Okrika", "Khana", "Opobo", "Abonnema", "Andoni", "Tai", "Gokana", "Elele", "Etche", "Emohua", "Ogba-Egbema-Ndoni", "Ikwerre", "Obio-Akpor", "Omagwa", "Ogu–Bolo"],
  "Sokoto": ["Sokoto", "Wurno", "Shagari", "Tambuwal", "Gudu", "Tureta", "Isa", "Binji", "Goronyo", "Kware", "Dange-Shuni", "Bodinga", "Rabah", "Sabon Birni", "Kebbe", "Silame", "Gwadabawa", "Sokoto North", "Sokoto South"],
  "Taraba": ["Jalingo", "Wukari", "Takum", "Yola", "Ibi", "Lau", "Bali", "Gassol", "Karim-Lamido", "Sardauna", "Ussa", "Donga", "Ardo-Kola", "Kurmi", "Zing"],
  "Yobe": ["Damaturu", "Potiskum", "Gashua", "Nguru", "Fune", "Nangere", "Geidam", "Machina", "Yunusari", "Jakusko", "Bade", "Bursari", "Yusufari", "Tarmuwa", "Gujba", "Gulani", "Karasuwa"],
  "Zamfara": ["Gusau", "Kaura Namoda", "Anka", "Maru", "Tsafe", "Talata Mafara", "Zurmi", "Birnin Magaji", "Shinkafi", "Bungudu", "Maradun", "Bakura", "Bukkuyum", "Gummi", "Chafe"]
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
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
    location_city: profile?.location_city || "Lagos",
    logo_url: profile?.logo_url || "",
  });

  // 🛡️ SECURITY LOCKS: Logic for 30-day change limits
  const lastHandleDate = profile?.handle_last_changed_at ? new Date(profile.handle_last_changed_at) : new Date(0);
  const lastLocationDate = profile?.location_last_changed_at ? new Date(profile.location_last_changed_at) : new Date(0);
  
  const handleUnlockDate = addDays(lastHandleDate, 30);
  const locationUnlockDate = addDays(lastLocationDate, 30);

  const isHandleLocked = !isAfter(new Date(), handleUnlockDate);
  const isCityLocked = !isAfter(new Date(), locationUnlockDate);

  const formattedHandleDate = format(handleUnlockDate, 'MMMM do'); 
  const formattedLocationDate = format(locationUnlockDate, 'MMMM do');

  // Filtered Picker Data
  const filteredStates = useMemo(() => {
    return Object.keys(NIGERIA_LOCATIONS).filter(s => 
      s.toLowerCase().includes(pickerSearch.toLowerCase())
    );
  }, [pickerSearch]);

  const filteredCities = useMemo(() => {
    if (!selectedState) return [];
    return NIGERIA_LOCATIONS[selectedState].filter(c => 
      c.toLowerCase().includes(pickerSearch.toLowerCase())
    );
  }, [selectedState, pickerSearch]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Photo access required.');

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

  const uploadProfileImage = async (uri: string) => {
    setUploading(true);
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/branding/${fileName}`;

      const base64 = await (FileSystem as any).readAsStringAsync(uri, { encoding: 'base64' });
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, decode(base64), { 
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`, 
          upsert: true 
        });

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, logo_url: `${publicUrl}?t=${Date.now()}` }));
    } catch (e) {
      Alert.alert("Error", "Image upload failed.");
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

      if (!isHandleLocked && form.slug.toLowerCase().trim() !== profile?.slug) {
        updates.slug = form.slug.toLowerCase().trim();
        updates.handle_last_changed_at = new Date().toISOString();
      }

      if (!isCityLocked && form.location_city !== profile?.location_city) {
        updates.location_city = form.location_city;
        updates.location_last_changed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile?.id);
      if (error) throw error;
      
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not save profile changes.");
    } finally {
      setLoading(false);
    }
  };

  const renderLocationPicker = () => (
    <Modal visible={showPicker} animationType="slide" transparent={false}>
      <View style={[styles.modalContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { setSelectedState(null); setPickerSearch(''); setShowPicker(false); }}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {selectedState ? `Cities in ${selectedState}` : 'Select State'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.pickerSearchBox, { backgroundColor: theme.surface }]}>
          <Search size={18} color={theme.subtext} />
          <TextInput
            placeholder="Search locations..."
            placeholderTextColor={theme.subtext}
            style={[styles.pickerSearchInput, { color: theme.text }]}
            value={pickerSearch}
            onChangeText={setPickerSearch}
          />
        </View>

        <FlatList
          data={selectedState ? filteredCities : filteredStates}
          keyExtractor={(item) => item}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.pickerItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                if (!selectedState) {
                  setSelectedState(item);
                  setPickerSearch('');
                } else {
                  setForm(prev => ({ ...prev, location_city: item }));
                  setShowPicker(false);
                  setSelectedState(null);
                  setPickerSearch('');
                }
              }}
            >
              <Text style={[styles.pickerItemText, { color: theme.text }]}>{item}</Text>
              <ChevronRight size={16} color={theme.subtext} />
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top || 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}><ArrowLeft color={theme.text} size={24} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>EDIT PROFILE</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading || uploading} style={styles.navBtn}>
          {loading ? <ActivityIndicator size="small" color={Colors.brand.emerald} /> : <Text style={styles.saveText}>SAVE</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.photoContainer}>
              <TouchableOpacity style={[styles.logoWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={pickImage} disabled={uploading}>
                {form.logo_url ? <Image source={{ uri: form.logo_url }} style={styles.logoImg} /> : <User size={40} color={theme.subtext} />}
                <View style={[styles.logoEditOverlay, { backgroundColor: theme.text }]}><Camera size={14} color={theme.background} /></View>
              </TouchableOpacity>
          </View>

          <View style={styles.formFields}>
            <Field label="FULL NAME" value={form.full_name} onChange={(v: string) => setForm({...form, full_name: v})} theme={theme} />
            
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>USERNAME (@)</Text>
              <View style={[styles.input, styles.lockedRow, { backgroundColor: isHandleLocked ? `${theme.border}30` : theme.surface, borderColor: theme.border }]}>
                <TextInput style={{ color: isHandleLocked ? theme.subtext : theme.text, flex: 1, fontWeight: '700' }} value={form.slug} onChangeText={(v) => setForm({...form, slug: v})} editable={!isHandleLocked} autoCapitalize="none" />
                {isHandleLocked && <Lock size={14} color={theme.subtext} />}
              </View>
              {isHandleLocked && <Text style={styles.lockWarning}>Locked until {formattedHandleDate}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>CITY</Text>
              <TouchableOpacity 
                disabled={isCityLocked}
                style={[styles.input, styles.lockedRow, { backgroundColor: isCityLocked ? `${theme.border}30` : theme.surface, borderColor: theme.border }]}
                onPress={() => setShowPicker(true)}
              >
                <Globe size={16} color={isCityLocked ? theme.subtext : Colors.brand.emerald} />
                <Text style={{ color: isCityLocked ? theme.subtext : theme.text, flex: 1, marginLeft: 10, fontWeight: '700' }}>{form.location_city}</Text>
                {isCityLocked ? <Lock size={14} color={theme.subtext} /> : <ChevronRight size={16} color={theme.subtext} />}
              </TouchableOpacity>
              {isCityLocked && <Text style={styles.lockWarning}>Locked until {formattedLocationDate}</Text>}
            </View>

            <Field label="STREET ADDRESS" value={form.location} onChange={(v: string) => setForm({...form, location: v})} theme={theme} icon={<MapPin size={16} color={theme.subtext} />} />
            <Field label="BIO" value={form.bio} onChange={(v: string) => setForm({...form, bio: v})} theme={theme} multiline />
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      {renderLocationPicker()}
    </View>
  );
}

const Field = ({ label, value, onChange, theme, icon, multiline }: any) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
    <View style={[styles.input, multiline && styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {icon}
      <TextInput 
        style={[{ color: theme.text, flex: 1, fontWeight: '700', marginLeft: icon ? 10 : 0 }, multiline && { textAlignVertical: 'top', paddingTop: 18 }]} 
        value={value} 
        onChangeText={onChange} 
        multiline={multiline}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  navBtn: { padding: 5 },
  saveText: { color: Colors.brand.emerald, fontWeight: '900', fontSize: 13 },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },
  photoContainer: { alignItems: 'center', marginVertical: 35 },
  logoWrapper: { width: 110, height: 110, borderRadius: 28, borderWidth: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  logoImg: { width: '100%', height: '100%', borderRadius: 28 },
  logoEditOverlay: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderTopLeftRadius: 15, justifyContent: 'center', alignItems: 'center' },
  formFields: { paddingHorizontal: 25 },
  inputGroup: { marginBottom: 25 },
  fieldLabel: { fontSize: 9, fontWeight: '900', marginBottom: 10, color: '#999', letterSpacing: 1.5 },
  input: { borderRadius: 16, paddingHorizontal: 18, height: 56, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center' },
  lockedRow: { flexDirection: 'row', alignItems: 'center' },
  lockWarning: { fontSize: 9, color: '#EF4444', marginTop: 8, fontWeight: '800' },
  textArea: { height: 120 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  pickerSearchBox: { flexDirection: 'row', alignItems: 'center', margin: 20, paddingHorizontal: 15, height: 50, borderRadius: 12 },
  pickerSearchInput: { flex: 1, marginLeft: 10, fontWeight: '600' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 14, fontWeight: '700' }
});