import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { 
  ArrowLeft, Mail, Lock, Eye, EyeOff, 
  ShieldCheck, ArrowRight, CheckCircle2 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 ACCOUNT CREATION SCREEN v95.0
 * Fixed: Replaced username with slug.
 * Language: Removed all technical jargon for human clarity.
 */
export default function SignupScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const validation = {
    length: password.length >= 8,
    number: /\d/.test(password),
    capital: /[A-Z]/.test(password),
    special: /[@$!%*?&]/.test(password),
    match: password === confirmPassword && confirmPassword.length > 0
  };

  const isFormValid = 
    validation.length && validation.number && 
    validation.capital && validation.special && 
    validation.match && email.includes('@');

  /**
   * 🛡️ CREATE ACCOUNT PROCESS
   * Steps: Create Auth Login -> Setup Profile -> Send Verification Code.
   */
  const handleSignup = async () => {
    if (!isFormValid || loading) return;
    
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanEmail = email.toLowerCase().trim();

    try {
      // 1. Create the Login Account
      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { 
            display_name: cleanEmail.split('@')[0],
          }
        }
      });

      let userId = data?.user?.id;

      // If user already exists, we try to recover their ID to fix their profile
      if (authError) {
        if (authError.message.includes("already registered")) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });
          userId = signInData?.user?.id;
        } else {
          throw authError;
        }
      }

      if (!userId) throw new Error("Could not create account ID.");

      // 🏛️ 2. SETUP PROFILE DATA
      // 🛠️ FIX: Replaced 'username' with 'slug'
      const generatedSlug = cleanEmail.split('@')[0] + Math.floor(1000 + Math.random() * 9000);
      
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        slug: generatedSlug, // 🛡️ Using slug now
        display_name: cleanEmail.split('@')[0],
        onboarding_completed: false, 
        is_seller: false,
        coin_balance: 0, 
        prestige_weight: 1, 
        subscription_plan: 'none',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      
      if (profileError) {
        console.error("Profile Setup Error:", profileError.message);
        throw new Error("Failed to set up your profile details.");
      }

      // 📡 3. CREATE VERIFICATION CODE
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const { error: otpError } = await supabase.from("otp_verifications").upsert({ 
        email: cleanEmail, 
        code: otpCode 
      }, { onConflict: 'email' });

      if (otpError) throw otpError;

      // 📧 4. SEND THE EMAIL
      fetch("https://storelink.ng/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: cleanEmail, 
            code: otpCode, 
            type: 'VERIFY_SIGNUP' 
          }),
      }).catch(() => console.log("Email sending delayed."));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      router.replace({ 
        pathname: '/auth/verify', 
        params: { email: cleanEmail, type: 'signup' } 
      });

    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Signup Failed", e.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft color={theme.text} size={28} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Create your{"\n"}<Text style={{ color: Colors.brand.emerald, fontStyle: 'italic' }}>Account.</Text></Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Join the marketplace and start discovering unique brands today.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Mail size={18} color={theme.subtext} style={styles.icon} />
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="Email Address" 
                  placeholderTextColor={theme.subtext}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  selectionColor={Colors.brand.emerald}
                />
              </View>

              <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Lock size={18} color={theme.subtext} style={styles.icon} />
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="Create Password" 
                  placeholderTextColor={theme.subtext}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  selectionColor={Colors.brand.emerald}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} color={theme.text} /> : <Eye size={20} color={theme.subtext} />}
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ShieldCheck size={18} color={validation.match ? Colors.brand.emerald : theme.subtext} style={styles.icon} />
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="Confirm Password" 
                  placeholderTextColor={theme.subtext}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  selectionColor={Colors.brand.emerald}
                />
                {validation.match && <CheckCircle2 size={18} color={Colors.brand.emerald} strokeWidth={3} />}
              </View>

              <View style={styles.shieldGrid}>
                <ShieldIndicator met={validation.length} label="8+ Characters" theme={theme} />
                <ShieldIndicator met={validation.number} label="Number" theme={theme} />
                <ShieldIndicator met={validation.capital} label="Uppercase" theme={theme} />
                <ShieldIndicator met={validation.special} label="Symbol" theme={theme} />
                <ShieldIndicator met={validation.match} label="Match" theme={theme} />
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.9}
              style={[styles.mainBtn, { backgroundColor: theme.text }, !isFormValid && styles.btnDisabled]} 
              onPress={handleSignup} 
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <>
                  <Text style={[styles.btnLabel, { color: theme.background }]}>CREATE ACCOUNT</Text>
                  <ArrowRight size={18} color={theme.background} strokeWidth={3} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.footerLink}>
              <Text style={[styles.footerText, { color: theme.subtext }]}>
                Already have an account? <Text style={[styles.boldText, { color: theme.text }]}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const ShieldIndicator = ({ met, label, theme }: { met: boolean; label: string; theme: any }) => (
  <View style={styles.shieldRow}>
    <View style={[styles.shieldDot, { backgroundColor: theme.border }, met && { backgroundColor: Colors.brand.emerald }]} />
    <Text style={[styles.shieldText, { color: theme.subtext }, met && { color: theme.text }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 35, paddingBottom: 60, paddingTop: 60, flexGrow: 1, justifyContent: 'center' },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  header: { marginTop: 20, marginBottom: 40 },
  title: { fontSize: 44, fontWeight: '900', letterSpacing: -2, lineHeight: 48 },
  subtitle: { fontSize: 15, fontWeight: '600', marginTop: 15, lineHeight: 24 },
  form: { gap: 18 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 22, height: 70, borderWidth: 1.5 },
  icon: { marginRight: 15 },
  input: { flex: 1, fontSize: 16, fontWeight: '700' },
  shieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginTop: 12, paddingHorizontal: 8 },
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shieldDot: { width: 6, height: 6, borderRadius: 3 },
  shieldText: { fontSize: 11, fontWeight: '700' },
  mainBtn: { height: 75, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 50 },
  btnDisabled: { opacity: 0.3 },
  btnLabel: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  footerLink: { marginTop: 35, alignItems: 'center' },
  footerText: { fontSize: 14, fontWeight: '700' },
  boldText: { fontWeight: '900' }
});