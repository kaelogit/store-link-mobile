import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, AtSign, Phone, ChevronRight, CheckCircle2, 
  AlertCircle, Check, MapPin, ChevronDown 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { CollectorSuccessModal } from '../../src/components/CollectorSuccessModal';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
].sort();

/**
 * 🏰 COLLECTOR PROFILE SETUP v80.0
 * Audited: Replaced username with slug. 
 * Logic: All other design elements remain unchanged.
 */
export default function CollectorSetupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  // --- FORM STATES ---
  const [fullName, setFullName] = useState('');
  const [slug, setSlug] = useState(''); // 🛡️ Changed from username to slug
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSameAsPhone, setIsSameAsPhone] = useState(true);
  const [location, setLocation] = useState('Lagos');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
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

  // Handle Check (probes 'slug' column)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (slug.length >= 3) checkSlugAvailability(slug);
      else setUserStatus('idle');
    }, 600);
    return () => clearTimeout(timer);
  }, [slug]);

  const checkSlugAvailability = async (name: string) => {
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

  const handleFinalize = async () => {
    const finalWhatsapp = isSameAsPhone ? phone : whatsapp;

    if (!fullName || userStatus !== 'available' || phone.length < 10 || !gender || !location) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert("Required Information", "Please fill in all details to complete your profile.");
    }

    setLoading(true);
    try {
      // 🛡️ DATA SYNC: Swapped username for slug
      const { error } = await supabase.from('profiles').update({
        full_name: fullName,
        display_name: fullName,
        slug: slug.toLowerCase().trim(), // 🛡️ Using slug
        phone_number: phone,
        whatsapp_number: finalWhatsapp,
        location: location,
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
      Alert.alert("Error", "We couldn't save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CollectorSuccessModal 
        visible={showSuccess} 
        onClose={() => router.replace('/(tabs)')} 
        onExplore={() => router.replace('/(tabs)')} 
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, backgroundColor: 'transparent' }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            
            <View style={styles.header}>
              <View style={[styles.badge, { backgroundColor: theme.surface }]}>
                 <Text style={styles.badgeText}>PROFILE SETUP</Text>
              </View>
              <Text style={styles.title}>Collector{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>Profile.</Text></Text>
              <Text style={[styles.sub, { color: theme.subtext }]}>Fill in your details to start browsing products.</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>FULL NAME *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <User size={20} color={theme.text} />
                <TextInput 
                  placeholder="First & Last Name" 
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text }]} 
                  value={fullName} 
                  onChangeText={setFullName} 
                />
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>HANDLE / SLUG *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }, userStatus === 'taken' && styles.errorInput]}>
                <AtSign size={20} color={theme.text} />
                <TextInput 
                  placeholder="unique_handle" 
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
                <TouchableOpacity onPress={() => { setSlug(suggestion); checkSlugAvailability(suggestion); }}>
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

              <Text style={[styles.label, { marginTop: 20 }]}>YOUR LOCATION *</Text>
              <TouchableOpacity style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowLocationPicker(!showLocationPicker)}>
                <MapPin size={20} color={theme.text} />
                <Text style={[styles.input, { color: theme.text }]}>{location}</Text>
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
                <Text style={[styles.checkboxLabel, { color: theme.subtext }]}>My WhatsApp number is the same</Text>
              </TouchableOpacity>

              {!isSameAsPhone && (
                <View style={{ backgroundColor: 'transparent' }}>
                  <Text style={styles.label}>WHATSAPP NUMBER *</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Phone size={20} color={theme.text} />
                    <TextInput 
                      placeholder="WhatsApp Number" 
                      keyboardType="phone-pad"
                      placeholderTextColor={theme.subtext}
                      style={[styles.input, { color: theme.text }]} 
                      value={whatsapp} 
                      onChangeText={setWhatsapp} 
                    />
                  </View>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>BIO / INTERESTS</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, height: 100, alignItems: 'flex-start', paddingTop: 15 }]}>
                <TextInput 
                  placeholder="What products do you love?" 
                  multiline
                  placeholderTextColor={theme.subtext}
                  style={[styles.input, { color: theme.text, textAlignVertical: 'top' }]} 
                  value={bio} 
                  onChangeText={setBio} 
                />
              </View>
              
              <TouchableOpacity 
                activeOpacity={0.9}
                style={[styles.mainBtn, { backgroundColor: theme.text }, (loading || userStatus !== 'available') && styles.btnDisabled]} 
                onPress={handleFinalize}
                disabled={loading || userStatus !== 'available'}
              >
                {loading ? <ActivityIndicator color={theme.background} /> : (
                  <>
                    <Text style={[styles.btnText, { color: theme.background }]}>COMPLETE SETUP</Text>
                    <ChevronRight color={theme.background} size={20} strokeWidth={3} />
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ height: 60, backgroundColor: 'transparent' }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 30, paddingBottom: 50, paddingTop: 30, backgroundColor: 'transparent' },
  header: { marginBottom: 35, backgroundColor: 'transparent' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 15 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#10B981', letterSpacing: 1.2 },
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, lineHeight: 44 },
  sub: { fontSize: 15, marginTop: 10, fontWeight: '600', lineHeight: 22 },
  form: { gap: 10, backgroundColor: 'transparent' },
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
  genderRow: { flexDirection: 'row', gap: 10, backgroundColor: 'transparent' },
  genderBtn: { 
    flex: 1, height: 55, borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5
  },
  genderText: { fontSize: 11, fontWeight: '900' },
  locationDropdown: { borderRadius: 20, marginTop: -5, padding: 10, borderWidth: 1.5, marginBottom: 10 },
  stateItem: { paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stateText: { fontSize: 14, fontWeight: '700' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, marginLeft: 5, backgroundColor: 'transparent' },
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