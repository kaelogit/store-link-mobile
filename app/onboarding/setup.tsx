import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, Image, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Store, Globe, CheckCircle2, AlertCircle, ArrowRight, 
  Sparkles, Camera, User, UserCircle, Phone, 
  MapPin, Check, ChevronDown, Tag, Shirt, Smartphone, 
  Home as HomeIcon, Activity, Wrench, Building2, Car, Search
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { SuccessModal } from '../../src/components/SuccessModal';

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

const MERCHANT_CATEGORIES = [
  { label: 'Fashion', slug: 'fashion', icon: Shirt },
  { label: 'Beauty', slug: 'beauty', icon: Sparkles },
  { label: 'Electronics', slug: 'electronics', icon: Smartphone },
  { label: 'Home', slug: 'home', icon: HomeIcon },
  { label: 'Wellness', slug: 'wellness', icon: Activity },
  { label: 'Services', slug: 'services', icon: Wrench },
  { label: 'Real Estate', slug: 'real-estate', icon: Building2 },
  { label: 'Automotive', slug: 'automotive', icon: Car },
];

export default function MerchantSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSameAsWhatsapp, setIsSameAsWhatsapp] = useState(true);
  
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  
  const [bio, setBio] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.gender) setGender(profile.gender as any);
      if (profile.phone_number) setPhone(profile.phone_number);
      if (profile.location_state) setLocationState(profile.location_state);
      if (profile.location_city) setLocationCity(profile.location_city);
      if (profile.category) setCategory(profile.category);
      if (profile.whatsapp_number) setWhatsapp(profile.whatsapp_number);
      if (profile.logo_url) setLogo(profile.logo_url);
    }
  }, [profile]);

  useEffect(() => {
    if (storeName.length > 2) {
      const generated = storeName.toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setSlug(generated);
      checkSlugAvailability(generated);
    }
  }, [storeName]);

  const checkSlugAvailability = async (targetSlug: string) => {
    setSlugStatus('checking');
    const { data } = await supabase.from('profiles').select('slug').eq('slug', targetSlug).maybeSingle();
    setSlugStatus(data && data.slug !== profile?.slug ? 'taken' : 'available');
  };

  const uploadLogo = async (uri: string) => {
    if (uri.startsWith('http')) return uri;
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `${profile?.id}/logo_${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: `image/${fileExt}` } as any);

      const { error } = await supabase.storage.from('merchant-assets').upload(fileName, formData);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('merchant-assets').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      throw new Error(`COULD NOT UPLOAD LOGO`);
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) {
      setLogo(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const filteredStates = useMemo(() => 
    NIGERIAN_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())), 
  [stateSearch]);

  const filteredCities = useMemo(() => 
    (CITIES_BY_STATE[locationState] || []).filter(c => c.toLowerCase().includes(citySearch.toLowerCase())), 
  [locationState, citySearch]);

  const handleLaunch = async () => {
    const finalPhone = isSameAsWhatsapp ? whatsapp : phone;

    if (!fullName || !gender || !logo || !storeName || slugStatus !== 'available' || !locationState || !locationCity || !whatsapp || !category) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert("Missing Information", "Please fill in all the required fields (marked with *) to finish.");
    }

    setLoading(true);
    try {
      const logoUrl = await uploadLogo(logo!);

      const { error } = await supabase.from('profiles').update({
        full_name: fullName,
        gender: gender,
        phone_number: finalPhone,
        whatsapp_number: whatsapp,
        display_name: storeName,
        slug: slug,
        category: category,
        location_state: locationState,
        location_city: locationCity,
        location: `${locationCity}, ${locationState}`,
        bio: bio,
        logo_url: logoUrl,
        is_seller: true,
        prestige_weight: 2, 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }).eq('id', profile?.id);

      if (error) throw error;

      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
    } catch (e: any) {
      Alert.alert("Save Error", "We could not save your shop details. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SuccessModal 
        visible={showSuccess}
        brandName={storeName}
        onClose={() => router.replace('/(tabs)')}
        onVerify={() => router.replace('/seller/verification')}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[
              styles.scroll, 
              { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 60 }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.badge, { backgroundColor: theme.surface }]}>
                <Sparkles size={12} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
                <Text style={styles.badgeText}>SHOP SETUP</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Set up your{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>Storefront.</Text></Text>
            </View>

            {/* Shop Logo - Centered Design */}
            <View style={styles.centeredLogoArea}>
                <TouchableOpacity 
                  style={[styles.logoBox, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                  onPress={pickLogo} 
                  activeOpacity={0.9}
                >
                  {logo ? <Image source={{ uri: logo }} style={styles.logoImage} /> : (
                    <View style={styles.logoPlaceholder}>
                      <Camera size={32} color={theme.subtext} />
                      <Text style={[styles.uploadLabel, { color: theme.subtext }]}>ADD LOGO *</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.logoHint, { color: theme.subtext }]}>Your logo is how customers will recognize you.</Text>
            </View>

            {/* Personal Details */}
            <View style={styles.sectionHeader}>
                <UserCircle size={18} color={theme.text} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>PERSONAL DETAILS</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>FULL NAME *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <User size={20} color={theme.subtext} />
                <TextInput 
                  placeholder="Your full name" 
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text }]} 
                  value={fullName} 
                  onChangeText={setFullName} 
                />
              </View>

              <Text style={[styles.label, { marginTop: 15 }]}>GENDER *</Text>
              <View style={styles.genderRow}>
                {['male', 'female', 'other'].map((g) => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.genderBtn, { backgroundColor: theme.surface, borderColor: theme.border }, gender === g && { backgroundColor: theme.text, borderColor: theme.text }]}
                    onPress={() => setGender(g as any)}
                  >
                    <Text style={[styles.genderText, { color: theme.subtext }, gender === g && { color: theme.background }]}>{g.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Shop Details */}
            <View style={styles.sectionHeader}>
                <Store size={18} color={theme.text} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>SHOP DETAILS</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>SHOP NAME *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Store size={20} color={theme.subtext} />
                <TextInput 
                  placeholder="e.g. Mira's Boutique" 
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text }]} 
                  value={storeName} 
                  onChangeText={setStoreName} 
                />
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>SHOP LINK *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }, slugStatus === 'taken' && styles.errorInput]}>
                <Globe size={20} color={theme.subtext} />
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  value={slug} 
                  onChangeText={setSlug}
                  autoCapitalize="none"
                />
                {slugStatus === 'checking' && <ActivityIndicator size="small" color={Colors.brand.emerald} />}
                {slugStatus === 'available' && <CheckCircle2 size={22} color={Colors.brand.emerald} strokeWidth={3} />}
                {slugStatus === 'taken' && <AlertCircle size={22} color="#EF4444" />}
              </View>
              <Text style={styles.slugPreview}>storelink.ng/{slug || 'shopname'}</Text>

              <Text style={[styles.label, { marginTop: 20 }]}>SHOP CATEGORY *</Text>
              <TouchableOpacity style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => { setShowCategoryPicker(!showCategoryPicker); setShowStatePicker(false); setShowCityPicker(false); }}>
                <Tag size={20} color={theme.subtext} />
                <Text style={[styles.input, { color: category ? theme.text : theme.subtext, lineHeight: 65 / 1.5 }]}>{category ? MERCHANT_CATEGORIES.find(c => c.slug === category)?.label : 'Select Category'}</Text>
                <ChevronDown size={20} color={theme.subtext} />
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={[styles.dropdownContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 250 }}>
                    {MERCHANT_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <TouchableOpacity 
                          key={cat.slug} 
                          style={styles.dropdownItem} 
                          onPress={() => { setCategory(cat.slug); setShowCategoryPicker(false); }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Icon size={16} color={category === cat.slug ? Colors.brand.emerald : theme.subtext} />
                            <Text style={[styles.dropdownItemText, { color: theme.text }, category === cat.slug && { color: Colors.brand.emerald }]}>{cat.label}</Text>
                          </View>
                          {category === cat.slug && <Check size={16} color={Colors.brand.emerald} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* State Picker */}
              <Text style={[styles.label, { marginTop: 20 }]}>SHOP LOCATION (STATE) *</Text>
              <TouchableOpacity 
                style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                onPress={() => { setShowStatePicker(!showStatePicker); setShowCityPicker(false); setShowCategoryPicker(false); }}
              >
                <MapPin size={20} color={theme.subtext} />
                <Text style={[styles.input, { color: locationState ? theme.text : theme.subtext, lineHeight: 65 / 1.5 }]}>
                  {locationState || 'Select State'}
                </Text>
                <ChevronDown size={20} color={theme.subtext} />
              </TouchableOpacity>

              {showStatePicker && (
                <View style={[styles.dropdownContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
                        style={styles.dropdownItem} 
                        onPress={() => { 
                          setLocationState(state); 
                          setLocationCity(''); 
                          setShowStatePicker(false); 
                          setStateSearch('');
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: theme.text }, locationState === state && { color: Colors.brand.emerald }]}>{state}</Text>
                        {locationState === state && <Check size={16} color={Colors.brand.emerald} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* City Picker */}
              <Text style={[styles.label, { marginTop: 20, opacity: locationState ? 1 : 0.5 }]}>SHOP LOCATION (CITY) *</Text>
              <TouchableOpacity 
                disabled={!locationState}
                style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, opacity: locationState ? 1 : 0.5 }]} 
                onPress={() => { setShowCityPicker(!showCityPicker); setShowStatePicker(false); setShowCategoryPicker(false); }}
              >
                <MapPin size={20} color={theme.subtext} />
                <Text style={[styles.input, { color: locationCity ? theme.text : theme.subtext, lineHeight: 65 / 1.5 }]}>
                  {locationCity || 'Select City'}
                </Text>
                <ChevronDown size={20} color={theme.subtext} />
              </TouchableOpacity>

              {showCityPicker && locationState && (
                <View style={[styles.dropdownContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
                        style={styles.dropdownItem} 
                        onPress={() => { 
                          setLocationCity(city); 
                          setShowCityPicker(false); 
                          setCitySearch('');
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: theme.text }, locationCity === city && { color: Colors.brand.emerald }]}>{city}</Text>
                        {locationCity === city && <Check size={16} color={Colors.brand.emerald} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Contacts */}
              <Text style={[styles.label, { marginTop: 20 }]}>WHATSAPP NUMBER *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Phone size={20} color={theme.subtext} />
                <TextInput 
                  placeholder="080..." 
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text }]} 
                  value={whatsapp} 
                  onChangeText={setWhatsapp} 
                />
              </View>

              <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIsSameAsWhatsapp(!isSameAsWhatsapp)}>
                <View style={[styles.checkbox, { borderColor: theme.border }, isSameAsWhatsapp && { backgroundColor: theme.text, borderColor: theme.text }]}>
                  {isSameAsWhatsapp && <Check size={12} color={theme.background} strokeWidth={4} />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.subtext }]}>Use this as my main phone number</Text>
              </TouchableOpacity>

              {!isSameAsWhatsapp && (
                <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 5 }]}>
                  <Phone size={20} color={theme.subtext} />
                  <TextInput 
                    placeholder="Main Phone Number" 
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.subtext}
                    style={[styles.input, { color: theme.text }]} 
                    value={phone} 
                    onChangeText={setPhone} 
                  />
                </View>
              )}

              {/* Description */}
              <Text style={[styles.label, { marginTop: 20 }]}>SHOP DESCRIPTION</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
                <TextInput 
                  placeholder="Tell your customers what you sell..." 
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text, textAlignVertical: 'top' }]} 
                  value={bio} 
                  onChangeText={setBio} 
                />
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.9}
              style={[styles.mainBtn, { backgroundColor: theme.text }, (loading || slugStatus !== 'available') && styles.btnDisabled]} 
              onPress={handleLaunch}
              disabled={loading || slugStatus !== 'available'}
            >
              {loading ? <ActivityIndicator color={theme.background} /> : (
                <>
                  <Text style={[styles.btnText, { color: theme.background }]}>FINISH SETUP</Text>
                  <ArrowRight color={theme.background} size={20} strokeWidth={3} />
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 30 },
  header: { marginBottom: 30 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 18 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#10B981', letterSpacing: 1.5 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5, lineHeight: 40 },
  centeredLogoArea: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 120, height: 120, borderRadius: 40, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoPlaceholder: { alignItems: 'center', gap: 8 },
  logoImage: { width: '100%', height: '100%' },
  logoHint: { fontSize: 12, fontWeight: '600', marginTop: 15, textAlign: 'center', paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  divider: { height: 1, marginVertical: 40 },
  form: { gap: 10 },
  label: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 10, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 65, borderRadius: 20, gap: 12, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 15, fontWeight: '700' },
  errorInput: { borderColor: '#EF4444' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  genderText: { fontSize: 11, fontWeight: '900' },
  uploadLabel: { fontSize: 10, fontWeight: '900' },
  slugPreview: { fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 10, marginLeft: 10 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, marginLeft: 5 },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxLabel: { fontSize: 13, fontWeight: '600' },
  dropdownContainer: { borderRadius: 20, marginTop: -5, padding: 10, borderWidth: 1.5, marginBottom: 10 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownItemText: { fontSize: 14, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, marginBottom: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  mainBtn: { height: 75, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 10 },
  btnDisabled: { opacity: 0.15 },
  btnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 }
});