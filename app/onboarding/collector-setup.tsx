import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, AtSign, Phone, ChevronRight, CheckCircle2, 
  AlertCircle, Check, MapPin, ChevronDown, Search 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { CollectorSuccessModal } from '../../src/components/CollectorSuccessModal';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
].sort();

const CITIES_BY_STATE: Record<string, string[]> = {
  'Abia': ['Umuahia', 'Aba', 'Ohafia', 'Arochukwu', 'Bende', 'Isuikwuato', 'Umunneochi', 'Isiala Ngwa', 'Osisioma', 'Ikwuano', 'Ukwa', 'Ugwunagbo', 'Obingwa', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Aba North', 'Aba South'],
  'Adamawa': ['Yola', 'Jimeta', 'Mubi', 'Numan', 'Ganye', 'Gombi', 'Hong', 'Madagali', 'Michika', 'Maiha', 'Shelleng', 'Song', 'Toungo', 'Fufore', 'Guyuk', 'Lamurde', 'Mayo-Belwa', 'Demsa', 'Jada'],
  'Akwa Ibom': ['Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono Ibom', 'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat-Enin', 'Nsit Atai', 'Nsit Ibom', 'Nsit Ubium', 'Obot Akara', 'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung Uko', 'Ukanafun', 'Uruan', 'Urue-Offong Oruko', 'Uyo'],
  'Anambra': ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia', 'Ihiala', 'Aguleri', 'Otuocha', 'Nkpor', 'Obosi', 'Ogidi', 'Ojoto', 'Abagana', 'Neni', 'Alor', 'Ogbunike', 'Umunya', 'Ukpo', 'Nsugbe', 'Umuleri', 'Atani', 'Ozubulu', 'Okija', 'Uga', 'Igbariam', 'Nteje', 'Awkuzu', 'Achalla', 'Enugwu-Ukwu', 'Nawfia', 'Nimo', 'Abatete', 'Oraukwu', 'Umunze', 'Isuofia', 'Ajalli', 'Amichi', 'Osumenyi', 'Azia', 'Lilu'],
  'Bauchi': ['Bauchi', 'Azare', 'Misau', 'Jama’are', 'Katagum', 'Alkaleri', 'Dass', 'Tafawa Balewa', 'Bogoro', 'Toro', 'Ningi', 'Warji', 'Ganjuwa', 'Darazo', 'Zaki', 'Giade', 'Itas Gadau', 'Shira', 'Dambam', 'Gamawa'],
  'Bayelsa': ['Yenagoa', 'Ogbia', 'Otuoke', 'Kaiama', 'Brass', 'Twon-Brass', 'Sagbama', 'Amassoma', 'Nembe', 'Okpoama', 'Ekeremor', 'Peremabiri', 'Oporoma', 'Odi', 'Akassa', 'Oloibiri'],
  'Benue': ['Makurdi', 'Gboko', 'Otukpo', 'Katsina-Ala', 'Vandeikya', 'Konshisha', 'Kwande', 'Ukum', 'Ushongo', 'Gwer East', 'Gwer West', 'Guma', 'Buruku', 'Tarka', 'Logo', 'Apa', 'Agatu', 'Ado', 'Ogbadibo', 'Okpokwu', 'Ohimini', 'Oju', 'Obi'],
  'Borno': ['Maiduguri', 'Biu', 'Bama', 'Dikwa', 'Gwoza', 'Monguno', 'Ngala', 'Damboa', 'Konduga', 'Kukawa', 'Magumeri', 'Mafa', 'Jere', 'Kaga', 'Gubio', 'Abadam', 'Askira-Uba', 'Chibok', 'Hawul', 'Kwaya Kusar', 'Shani', 'Mobbar', 'Marte', 'Kala-Balge', 'Nganzai'],
  'Cross River': ['Calabar', 'Ikom', 'Ogoja', 'Obudu', 'Akamkpa', 'Etung', 'Boki', 'Bekwarra', 'Akpabuyo', 'Bakassi', 'Abi', 'Yala', 'Obanliku', 'Obubra', 'Yakurr', 'Biase'],
  'Delta': ['Asaba', 'Warri', 'Sapele', 'Ughelli', 'Effurun', 'Agbor', 'Abraka', 'Ozoro', 'Oleh', 'Kwale', 'Udu', 'Bomadi', 'Burutu', 'Uvwie', 'Okpe', 'Ethiope East', 'Ethiope West', 'Ika North East', 'Ika South', 'Ndokwa East', 'Ndokwa West', 'Patani', 'Oshimili North', 'Oshimili South', 'Aniocha North', 'Aniocha South', 'Isoko North', 'Isoko South', 'Warri South', 'Warri North', 'Warri South West'],
  'Ebonyi': ['Abakaliki', 'Afikpo', 'Onueke', 'Ezza', 'Ikwo', 'Ishielu', 'Ivo', 'Ohaozara', 'Ohaukwu', 'Afikpo North', 'Afikpo South'],
  'Edo': ['Benin City', 'Auchi', 'Ekpoma', 'Uromi', 'Igarra', 'Oredo', 'Etsako West', 'Esan Central', 'Esan West', 'Esan North-East', 'Esan South-East', 'Egor', 'Ikpoba-Okha', 'Ovia North-East', 'Ovia South-West', 'Orhionmwon', 'Uhunmwonde', 'Akoko-Edo', 'Etsako East', 'Owan East', 'Owan West'],
  'Ekiti': ['Ado-Ekiti', 'Ikere-Ekiti', 'Ikole', 'Ijero-Ekiti', 'Efon-Alaaye', 'Oye-Ekiti', 'Ise-Ekiti', 'Irepodun/Ifelodun', 'Emure', 'Gbonyin', 'Ekiti East', 'Ekiti West', 'Moba', 'Ido-Osi'],
  'Enugu': ['Enugu', 'Nsukka', 'Awgu', 'Oji River', 'Udi', 'Ezeagu', 'Igbo-Eze North', 'Igbo-Eze South', 'Nkanu East', 'Nkanu West', 'Uzo-Uwani', 'Aninri', 'Isi-Uzo', 'Oji-Ogwu', 'Enugu East', 'Enugu North', 'Enugu South'],
  'Gombe': ['Gombe', 'Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Yamaltu-Deba'],
  'Imo': ['Owerri', 'Orlu', 'Okigwe', 'Oguta', 'Ohaji/Egbema', 'Ihitte/Uboma', 'Mbaitoli', 'Nkwerre', 'Ngor Okpala', 'Orsu', 'Ideato North', 'Ideato South', 'Njaba', 'Nwangele', 'Isu', 'Onuimo', 'Ehime Mbano', 'Ezinihitte', 'Owerri North', 'Owerri West', 'Owerri Municipal'],
  'Jigawa': ['Dutse', 'Hadejia', 'Kazaure', 'Gumel', 'Birnin Kudu', 'Ringim', 'Gwaram', 'Kiyawa', 'Maigatari', 'Sule Tankarkar', 'Taura', 'Babura', 'Miga', 'Jahun', 'Auyo', 'Kaugama', 'Guri', 'Gwiwa', 'Birniwa'],
  'Kaduna': ['Kaduna', 'Zaria', 'Kafanchan', 'Sabon Gari', 'Zonkwa', 'Ikara', 'Soba', 'Kachia', 'Kagarko', 'Giwa', 'Jema’a', 'Birnin Gwari', 'Lere', 'Makarfi', 'Chikun', 'Kajuru', 'Igabi', 'Sanga', 'Kubau', 'Kaura', 'Kudan'],
  'Kano': ['Kano', 'Wudil', 'Rano', 'Bichi', 'Gaya', 'Karaye', 'Kura', 'Tudun Wada', 'Sumaila', 'Dawakin Tofa', 'Bagwai', 'Minjibir', 'Gezawa', 'Kumbotso', 'Gwale', 'Dala', 'Tarauni', 'Ungogo', 'Fagge', 'Nasarawa', 'Ajingi', 'Albasu', 'Bebeji', 'Garko', 'Shanono', 'Takai', 'Rimin Gado', 'Madobi', 'Danbatta'],
  'Katsina': ['Katsina', 'Funtua', 'Daura', 'Kankia', 'Malumfashi', 'Bakori', 'Dutsin-Ma', 'Kusada', 'Mani', 'Mashi', 'Kafur', 'Jibia', 'Charanchi', 'Musawa', 'Dandume', 'Kankara', 'Kurfi', 'Bindawa', 'Ingawa'],
  'Kebbi': ['Birnin Kebbi', 'Argungu', 'Jega', 'Yauri', 'Zuru', 'Gwandu', 'Bagudo', 'Kalgo', 'Arewa', 'Aliero', 'Ngaski', 'Maiyama', 'Fakai', 'Bunza', 'Dandi', 'Shanga', 'Sakaba', 'Danko-Wasagu', 'Suru', 'Wasagu/Danko'],
  'Kogi': ['Lokoja', 'Kabba', 'Idah', 'Okene', 'Dekina', 'Ankpa', 'Bassa', 'Ofu', 'Olamaboro', 'Adavi', 'Ogori/Magongo', 'Mopa-Muro', 'Yagba East', 'Yagba West', 'Ijumu', 'Koton Karfe', 'Okura', 'Omala'],
  'Kwara': ['Ilorin', 'Offa', 'Omu-Aran', 'Asa', 'Edu', 'Moro', 'Patigi', 'Kaiama', 'Baruten', 'Ekiti', 'Ifelodun', 'Irepodun', 'Oke-Ero', 'Oyun'],
  'Lagos': ['Lagos', 'Ikeja', 'Epe', 'Ikorodu', 'Badagry', 'Apapa', 'Victoria Island', 'Lekki', 'Ajah', 'Surulere', 'Agege', 'Alimosho', 'Mushin', 'Oshodi', 'Yaba', 'Ijanikin', 'Magodo', 'Festac Town', 'Ibeju-Lekki'],
  'Nasarawa': ['Lafia', 'Akwanga', 'Keffi', 'Karu', 'Obi', 'Toto', 'Nasarawa', 'Doma', 'Kokona', 'Awe', 'Wamba', 'Nasarawa Eggon', 'Keana'],
  'Niger': ['Minna', 'Bida', 'Suleja', 'Kontagora', 'Mokwa', 'Lapai', 'Borgu', 'Lavun', 'Rijau', 'Edati', 'Gbako', 'Katcha', 'Shiroro', 'Rafi', 'Mariga', 'Mashegu', 'Agaie'],
  'Ogun': ['Abeokuta', 'Ijebu Ode', 'Sagamu', 'Ijebu Igbo', 'Ota', 'Ago Iwoye', 'Imeko', 'Odogbolu', 'Ilaro', 'Yewa', 'Abeokuta North', 'Abeokuta South', 'Ewekoro', 'Obafemi Owode', 'Ifo', 'Ado-Odo/Ota'],
  'Ondo': ['Akure', 'Owo', 'Ondo', 'Ikare', 'Okitipupa', 'Irele', 'Ile-Oluji', 'Ose', 'Ese-Odo', 'Ifedore', 'Idanre', 'Akoko', 'Akoko North-East', 'Akoko North-West', 'Akoko South-East', 'Akoko South-West'],
  'Osun': ['Osogbo', 'Ile-Ife', 'Ilesa', 'Ede', 'Iwo', 'Ikirun', 'Ikire', 'Ejigbo', 'Ifon', 'Olorunda', 'Atakunmosa', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Ilesa East', 'Ilesa West', 'Ila', 'Ifelodun', 'Ayedaade', 'Ayedire', 'Irepodun', 'Irewole', 'Isokan', 'Obokun', 'Odo-Otin', 'Oriade', 'Orolu'],
  'Oyo': ['Ibadan', 'Ogbomoso', 'Oyo', 'Saki', 'Iseyin', 'Eruwa', 'Ibarapa', 'Okeho', 'Igboho', 'Oluyole', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Lagelu', 'Ona-Ara', 'Ogo-Oluwa', 'Surulere', 'Afijio', 'Atiba', 'Ido', 'Irepo', 'Iwajowa', 'Kajola', 'Saki East', 'Saki West'],
  'Plateau': ['Jos', 'Barkin Ladi', 'Bokkos', 'Pankshin', 'Shendam', 'Langtang North', 'Langtang South', 'Mangu', 'Bassa', 'Jos East', 'Jos North', 'Jos South', 'Kanam', 'Wase', 'Riyom', 'Qua’an Pan', 'Mikang', 'Kanke', 'Langtang'],
  'Rivers': ['Port Harcourt', 'Bonny', 'Buguma', 'Bori', 'Ahoada', 'Omoku', 'Eleme', 'Oyigbo', 'Degema', 'Okrika', 'Khana', 'Opobo', 'Abonnema', 'Andoni', 'Tai', 'Gokana', 'Elele', 'Etche', 'Emohua', 'Ogba-Egbema-Ndoni', 'Ikwerre', 'Obio-Akpor', 'Omagwa', 'Ogu–Bolo'],
  'Sokoto': ['Sokoto', 'Wurno', 'Shagari', 'Tambuwal', 'Gudu', 'Tureta', 'Isa', 'Binji', 'Goronyo', 'Kware', 'Dange-Shuni', 'Bodinga', 'Rabah', 'Sabon Birni', 'Kebbe', 'Silame', 'Gwadabawa', 'Sokoto North', 'Sokoto South'],
  'Taraba': ['Jalingo', 'Wukari', 'Takum', 'Yola', 'Ibi', 'Lau', 'Bali', 'Gassol', 'Karim-Lamido', 'Sardauna', 'Ussa', 'Donga', 'Ardo-Kola', 'Kurmi', 'Zing'],
  'Yobe': ['Damaturu', 'Potiskum', 'Gashua', 'Nguru', 'Fune', 'Nangere', 'Geidam', 'Machina', 'Yunusari', 'Jakusko', 'Bade', 'Bursari', 'Yusufari', 'Tarmuwa', 'Gubio', 'Gujba', 'Gulani', 'Karasuwa'],
  'Zamfara': ['Gusau', 'Kaura Namoda', 'Anka', 'Maru', 'Tsafe', 'Talata Mafara', 'Zurmi', 'Birnin Magaji', 'Shinkafi', 'Bungudu', 'Maradun', 'Bakura', 'Bukkuyum', 'Gummi', 'Chafe'],
  'FCT': ['Abuja', 'Gwagwalada', 'Kuje', 'Abaji', 'Bwari', 'Kwali']
};

/**
 * 👤 COLLECTOR SETUP SCREEN v82.0
 * Purpose: Allows shoppers to set up their personal profile.
 * Features: Nigerian State/City search, simple language, and real-time handle checking.
 */
export default function CollectorSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  // --- FORM STATES ---
  const [fullName, setFullName] = useState('');
  const [slug, setSlug] = useState(''); 
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSameAsPhone, setIsSameAsPhone] = useState(true);
  
  // --- GEOGRAPHIC STATES ---
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  
  // --- UI CONTROLS ---
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userStatus, setUserStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [suggestion, setSuggestion] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  // Debounced slug check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (slug.length >= 3) checkHandleAvailability(slug);
      else setUserStatus('idle');
    }, 600);
    return () => clearTimeout(timer);
  }, [slug]);

  const checkHandleAvailability = async (name: string) => {
    setUserStatus('checking');
    const clean = name.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    const { data } = await supabase.from('profiles').select('slug').eq('slug', clean).maybeSingle();
    
    if (data && data.slug !== profile?.slug) {
      setUserStatus('taken');
      setSuggestion(`${clean}${Math.floor(10 + Math.random() * 89)}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setUserStatus('available');
    }
  };

  const filteredStates = useMemo(() => 
    NIGERIAN_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())), 
  [stateSearch]);

  const filteredCities = useMemo(() => 
    (CITIES_BY_STATE[locationState] || []).filter(c => c.toLowerCase().includes(citySearch.toLowerCase())), 
  [locationState, citySearch]);

  const handleFinish = async () => {
    const finalWhatsapp = isSameAsPhone ? phone : whatsapp;

    if (!fullName || userStatus !== 'available' || phone.length < 10 || !gender || !locationState || !locationCity) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert("Missing Details", "Please fill in all required fields to complete your profile.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName,
        display_name: fullName,
        slug: slug.toLowerCase().trim(),
        phone_number: phone,
        whatsapp_number: finalWhatsapp,
        location_state: locationState,
        location_city: locationCity,
        location: `${locationCity}, ${locationState}`,
        bio: bio,
        gender: gender,
        is_seller: false,
        prestige_weight: 1, 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }).eq('id', profile?.id);

      if (error) throw error;

      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);

    } catch (e: any) {
      Alert.alert("Save Error", "We couldn't save your profile. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CollectorSuccessModal 
        visible={showSuccess} 
        onClose={() => router.replace('/(tabs)')} 
        onExplore={() => router.replace('/(tabs)')} 
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[
              styles.scroll, 
              { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 60 }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            
            <View style={styles.header}>
              <View style={[styles.badge, { backgroundColor: theme.surface }]}>
                 <Text style={styles.badgeText}>SHOPPER SETUP</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Your{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>Profile.</Text></Text>
              <Text style={[styles.sub, { color: theme.subtext }]}>Finish setting up to start exploring items near you.</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>FULL NAME *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <User size={20} color={theme.text} />
                <TextInput 
                  placeholder="Enter your full name" 
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text }]} 
                  value={fullName} 
                  onChangeText={setFullName} 
                />
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>USERNAME / HANDLE *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }, userStatus === 'taken' && styles.errorInput]}>
                <AtSign size={20} color={theme.text} />
                <TextInput 
                  placeholder="choose_a_username" 
                  autoCapitalize="none"
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text }]} 
                  value={slug} 
                  onChangeText={setSlug} 
                />
                {userStatus === 'checking' && <ActivityIndicator size="small" color={Colors.brand.emerald} />}
                {userStatus === 'available' && <CheckCircle2 size={22} color={Colors.brand.emerald} strokeWidth={2.5} />}
                {userStatus === 'taken' && <AlertCircle size={22} color="#EF4444" />}
              </View>
              {userStatus === 'taken' && (
                <TouchableOpacity onPress={() => { setSlug(suggestion); checkHandleAvailability(suggestion); }}>
                  <Text style={styles.errorText}>TAKEN. TRY <Text style={styles.suggestion}>{suggestion}</Text></Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>GENDER *</Text>
              <View style={styles.genderRow}>
                {['male', 'female', 'other'].map((g) => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.genderBtn, { backgroundColor: theme.surface, borderColor: theme.border }, gender === g && { backgroundColor: theme.text, borderColor: theme.text }]}
                    onPress={() => {
                      setGender(g as any);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.genderText, { color: theme.subtext }, gender === g && { color: theme.background }]}>{g.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>LOCATION (STATE) *</Text>
              <TouchableOpacity 
                style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                onPress={() => { setShowStatePicker(!showStatePicker); setShowCityPicker(false); }}
              >
                <MapPin size={20} color={theme.text} />
                <Text style={[styles.input, { color: locationState ? theme.text : theme.subtext, lineHeight: 68 / 1.5 }]}>
                  {locationState || 'Select your state'}
                </Text>
                <ChevronDown size={20} color={theme.subtext} />
              </TouchableOpacity>

              {showStatePicker && (
                <View style={[styles.locationDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.searchBox}>
                    <Search size={16} color={theme.subtext} />
                    <TextInput 
                      placeholder="Search state..." 
                      placeholderTextColor={theme.subtext} 
                      style={[styles.searchInput, { color: theme.text }]}
                      value={stateSearch}
                      onChangeText={setStateSearch}
                    />
                  </View>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {filteredStates.map((state) => (
                      <TouchableOpacity 
                        key={state} 
                        style={styles.stateItem} 
                        onPress={() => { 
                          setLocationState(state); 
                          setLocationCity(''); 
                          setShowStatePicker(false); 
                          setStateSearch('');
                        }}
                      >
                        <Text style={[styles.stateText, { color: theme.text }, locationState === state && { color: Colors.brand.emerald }]}>{state}</Text>
                        {locationState === state && <Check size={16} color={Colors.brand.emerald} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 20, opacity: locationState ? 1 : 0.5 }]}>LOCATION (CITY) *</Text>
              <TouchableOpacity 
                disabled={!locationState}
                style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, opacity: locationState ? 1 : 0.5 }]} 
                onPress={() => { setShowCityPicker(!showCityPicker); setShowStatePicker(false); }}
              >
                <MapPin size={20} color={theme.text} />
                <Text style={[styles.input, { color: locationCity ? theme.text : theme.subtext, lineHeight: 68 / 1.5 }]}>
                  {locationCity || 'Select your city'}
                </Text>
                <ChevronDown size={20} color={theme.subtext} />
              </TouchableOpacity>

              {showCityPicker && locationState && (
                <View style={[styles.locationDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.searchBox}>
                    <Search size={16} color={theme.subtext} />
                    <TextInput 
                      placeholder="Search city..." 
                      placeholderTextColor={theme.subtext} 
                      style={[styles.searchInput, { color: theme.text }]}
                      value={citySearch}
                      onChangeText={setCitySearch}
                    />
                  </View>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {filteredCities.map((city) => (
                      <TouchableOpacity 
                        key={city} 
                        style={styles.stateItem} 
                        onPress={() => { 
                          setLocationCity(city); 
                          setShowCityPicker(false); 
                          setCitySearch('');
                        }}
                      >
                        <Text style={[styles.stateText, { color: theme.text }, locationCity === city && { color: Colors.brand.emerald }]}>{city}</Text>
                        {locationCity === city && <Check size={16} color={Colors.brand.emerald} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>PHONE NUMBER *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Phone size={20} color={theme.text} />
                <TextInput 
                  placeholder="080..." 
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text }]} 
                  value={phone} 
                  onChangeText={setPhone} 
                />
              </View>

              <TouchableOpacity 
                style={styles.checkboxContainer} 
                onPress={() => {
                  setIsSameAsPhone(!isSameAsPhone);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.checkbox, { borderColor: theme.border }, isSameAsPhone && { backgroundColor: theme.text, borderColor: theme.text }]}>
                  {isSameAsPhone && <Check size={12} color={theme.background} strokeWidth={4} />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.subtext }]}>My WhatsApp is the same as my phone number</Text>
              </TouchableOpacity>

              {!isSameAsPhone && (
                <View style={{ backgroundColor: 'transparent' }}>
                  <Text style={styles.label}>WHATSAPP NUMBER *</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Phone size={20} color={theme.text} />
                    <TextInput 
                      placeholder="WhatsApp number" 
                      keyboardType="phone-pad"
                      placeholderTextColor={theme.subtext}
                      style={[styles.input, { color: theme.text }]} 
                      value={whatsapp} 
                      onChangeText={setWhatsapp} 
                    />
                  </View>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>ABOUT YOU</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, height: 100, alignItems: 'flex-start', paddingTop: 15 }]}>
                <TextInput 
                  placeholder="Tell us what you are looking for..." 
                  multiline
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text, textAlignVertical: 'top' }]} 
                  value={bio} 
                  onChangeText={setBio} 
                />
              </View>
              
              <TouchableOpacity 
                activeOpacity={0.9}
                style={[styles.mainBtn, { backgroundColor: theme.text }, (loading || userStatus !== 'available' || !locationState || !locationCity) && styles.btnDisabled]} 
                onPress={handleFinish}
                disabled={loading || userStatus !== 'available' || !locationState || !locationCity}
              >
                {loading ? <ActivityIndicator color={theme.background} /> : (
                  <>
                    <Text style={[styles.btnText, { color: theme.background }]}>COMPLETE SETUP</Text>
                    <ChevronRight color={theme.background} size={20} strokeWidth={3} />
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 30 },
  header: { marginBottom: 35 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 15 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#10B981', letterSpacing: 1.2 },
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, lineHeight: 44 },
  sub: { fontSize: 15, marginTop: 10, fontWeight: '600', lineHeight: 22 },
  form: { gap: 10 },
  label: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginLeft: 5 },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 20, height: 68, borderRadius: 22, gap: 12, 
    borderWidth: 1.5
  },
  input: { flex: 1, fontSize: 15, fontWeight: '700' },
  errorInput: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 11, fontWeight: '800', marginTop: 5, marginLeft: 10 },
  suggestion: { textDecorationLine: 'underline' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { 
    flex: 1, height: 55, borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5
  },
  genderText: { fontSize: 11, fontWeight: '900' },
  locationDropdown: { borderRadius: 20, marginTop: -5, padding: 10, borderWidth: 1.5, marginBottom: 10 },
  stateItem: { paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stateText: { fontSize: 14, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, marginBottom: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, marginLeft: 5 },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxLabel: { fontSize: 13, fontWeight: '600' },
  mainBtn: { 
    height: 75, borderRadius: 26, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
  },
  btnDisabled: { opacity: 0.15 },
  btnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 }
});