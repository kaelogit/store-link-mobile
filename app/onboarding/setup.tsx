import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, Image, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Store, Globe, CheckCircle2, AlertCircle, ArrowRight, 
  Sparkles, Camera, ImageIcon, User, UserCircle, Phone, 
  MapPin, Check, ChevronDown, Tag, Shirt, Smartphone, 
  Home as HomeIcon, Activity, Wrench, Building2, Car
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { SuccessModal } from '../../src/components/SuccessModal';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
].sort();

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

/**
 * 🏰 MERCHANT SETUP v78.8 (Pure Finality)
 * Audited: Section I Identity Layer & Category Registry.
 * Fixed: Phone Handshake Logic & Keyboard Hoisting.
 */
export default function MerchantSetupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  // --- FORM STATES ---
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSameAsWhatsapp, setIsSameAsWhatsapp] = useState(true);
  
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [location, setLocation] = useState('Lagos');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [bio, setBio] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  // Sync Registry Data on Mount
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.gender) setGender(profile.gender as any);
      if (profile.phone_number) setPhone(profile.phone_number);
      if (profile.location) setLocation(profile.location);
      if (profile.category) setCategory(profile.category);
      if (profile.whatsapp_number) setWhatsapp(profile.whatsapp_number);
      if (profile.logo_url) setLogo(profile.logo_url);
      if (profile.cover_image_url) setCover(profile.cover_image_url);
    }
  }, [profile]);

  // Handle Automatic Slug Generation
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

  const uploadAsset = async (uri: string, type: 'logo' | 'cover') => {
    if (uri.startsWith('http')) return uri;
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `${profile?.id}/${type}_${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: `image/${fileExt}` } as any);

      const { error } = await supabase.storage.from('merchant-assets').upload(fileName, formData);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('merchant-assets').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      throw new Error(`STORAGE_HANDSHAKE_FAILURE: ${type.toUpperCase()}`);
    }
  };

  const pickAsset = async (type: 'logo' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.6,
    });
    if (!result.canceled) {
      if (type === 'logo') setLogo(result.assets[0].uri);
      else setCover(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  /**
   * 🛡️ LAUNCH PROTOCOL
   * Logic: Finalizes Identity and opens the Marketplace Gate.
   */
  const handleLaunch = async () => {
    // 🛡️ THE FIX: Sync phone automatically if checkbox is checked
    const finalPhone = isSameAsWhatsapp ? whatsapp : phone;

    if (!fullName || !gender || !logo || !storeName || slugStatus !== 'available' || !location || !whatsapp || !category) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert("Incomplete Identity", "Please provide all required fields (marked *) to proceed.");
    }

    setLoading(true);
    try {
      const [logoUrl, coverUrl] = await Promise.all([
        uploadAsset(logo!, 'logo'),
        cover ? uploadAsset(cover, 'cover') : Promise.resolve(profile?.cover_image_url || null)
      ]);

      // 🛡️ ATOMIC REGISTRY UPDATE
      const { error } = await supabase.from('profiles').update({
        full_name: fullName,
        gender: gender,
        phone_number: finalPhone, // Synced from logic above
        whatsapp_number: whatsapp,
        display_name: storeName,
        slug: slug,
        category: category,
        location: location,
        bio: bio,
        logo_url: logoUrl,
        cover_image_url: coverUrl,
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
      Alert.alert("Registry Error", "COULD NOT FINALIZE IDENTITY. PLEASE CHECK CONNECTION.");
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
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.badge, { backgroundColor: theme.surface }]}>
                <Sparkles size={12} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
                <Text style={styles.badgeText}>SHOP SETUP</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Create your{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>Storefront.</Text></Text>
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
                  placeholder="Your official name" 
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

            {/* Shop Branding */}
            <View style={styles.sectionHeader}>
               <Store size={18} color={theme.text} />
               <Text style={[styles.sectionTitle, { color: theme.text }]}>SHOP BRANDING</Text>
            </View>

            <View style={styles.assetContainer}>
               <TouchableOpacity style={[styles.coverBox, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => pickAsset('cover')} activeOpacity={0.9}>
                  {cover ? <Image source={{ uri: cover }} style={styles.coverImage} /> : 
                  <View style={styles.placeholder}>
                    <ImageIcon color={theme.border} size={32} />
                    <Text style={[styles.uploadLabel, { color: theme.subtext }]}>UPLOAD COVER PHOTO</Text>
                  </View>}
               </TouchableOpacity>
               <TouchableOpacity style={[styles.logoBox, { backgroundColor: theme.background, borderColor: theme.background }]} onPress={() => pickAsset('logo')} activeOpacity={0.9}>
                  {logo ? <Image source={{ uri: logo }} style={styles.logoImage} /> : <Camera size={24} color={theme.subtext} />}
               </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>SHOP NAME *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Store size={20} color={theme.subtext} />
                <TextInput 
                  placeholder="e.g. Zara Luxury" 
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

              {/* 🛡️ CATEGORY REGISTRY */}
              <Text style={[styles.label, { marginTop: 20 }]}>SHOP CATEGORY *</Text>
              <TouchableOpacity style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
                <Tag size={20} color={theme.subtext} />
                <Text style={[styles.input, { color: theme.text, lineHeight: 65 / 1.5 }]}>{category ? MERCHANT_CATEGORIES.find(c => c.slug === category)?.label : 'Select Category'}</Text>
                <ChevronDown size={20} color={theme.subtext} />
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={[styles.locationDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 250 }}>
                    {MERCHANT_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <TouchableOpacity 
                          key={cat.slug} 
                          style={styles.stateItem} 
                          onPress={() => { setCategory(cat.slug); setShowCategoryPicker(false); }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Icon size={16} color={category === cat.slug ? Colors.brand.emerald : theme.subtext} />
                            <Text style={[styles.stateText, { color: theme.text }, category === cat.slug && { color: Colors.brand.emerald }]}>{cat.label}</Text>
                          </View>
                          {category === cat.slug && <Check size={16} color={Colors.brand.emerald} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Geographic Anchor */}
              <Text style={[styles.label, { marginTop: 20 }]}>SHOP LOCATION (STATE) *</Text>
              <TouchableOpacity style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowLocationPicker(!showLocationPicker)}>
                <MapPin size={20} color={theme.subtext} />
                <Text style={[styles.input, { color: theme.text, lineHeight: 65 / 1.5 }]}>{location}</Text>
                <ChevronDown size={20} color={theme.subtext} />
              </TouchableOpacity>

              {showLocationPicker && (
                <View style={[styles.locationDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {NIGERIAN_STATES.map((state) => (
                      <TouchableOpacity 
                        key={state} 
                        style={styles.stateItem} 
                        onPress={() => { setLocation(state); setShowLocationPicker(false); }}
                      >
                        <Text style={[styles.stateText, { color: theme.text }, location === state && { color: Colors.brand.emerald }]}>{state}</Text>
                        {location === state && <Check size={16} color={Colors.brand.emerald} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Contact Handshake */}
              <Text style={[styles.label, { marginTop: 20 }]}>WHATSAPP BUSINESS NUMBER *</Text>
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
                <Text style={[styles.checkboxLabel, { color: theme.subtext }]}>Use as primary contact number</Text>
              </TouchableOpacity>

              {!isSameAsWhatsapp && (
                <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 5 }]}>
                  <Phone size={20} color={theme.subtext} />
                  <TextInput 
                    placeholder="Primary Contact Number" 
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.subtext}
                    style={[styles.input, { color: theme.text }]} 
                    value={phone} 
                    onChangeText={setPhone} 
                  />
                </View>
              )}

              {/* Description & Keyboard Protection */}
              <Text style={[styles.label, { marginTop: 20 }]}>SHOP DESCRIPTION</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, height: 120, alignItems: 'flex-start', paddingTop: 15 }]}>
                <TextInput 
                  placeholder="Tell customers about your shop..." 
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

            {/* Bottom Padding for Keyboard */}
            <View style={{ height: 120, backgroundColor: 'transparent' }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 30, paddingBottom: 60, paddingTop: 60 },
  header: { marginBottom: 40 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 18 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#10B981', letterSpacing: 1.5 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5, lineHeight: 40 },
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
  assetContainer: { height: 210, marginBottom: 40, position: 'relative' },
  coverBox: { height: 165, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderStyle: 'dashed' },
  logoBox: { width: 90, height: 90, borderRadius: 30, position: 'absolute', bottom: 0, left: 25, borderWidth: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  uploadLabel: { fontSize: 10, fontWeight: '900' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  logoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  slugPreview: { fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 10, marginLeft: 10 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, marginLeft: 5 },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxLabel: { fontSize: 13, fontWeight: '600' },
  locationDropdown: { borderRadius: 20, marginTop: -5, padding: 10, borderWidth: 1.5, marginBottom: 10 },
  stateItem: { paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stateText: { fontSize: 14, fontWeight: '700' },
  mainBtn: { height: 75, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40 },
  btnDisabled: { opacity: 0.15 },
  btnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 }
});