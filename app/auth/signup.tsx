import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated, Keyboard 
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { 
  ArrowLeft, Mail, Lock, Eye, EyeOff, 
  ShieldCheck, ArrowRight, CheckCircle2 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 ACCOUNT CREATION v98.0
 * Purpose: Safe and simple user registration.
 * Features: Custom Email API, Auto-Username, and Password Physics.
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
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 800, 
      useNativeDriver: true 
    }).start();
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
   * 🛡️ SIGNUP PROCESS
   * Creates the user account, sets up the profile, and triggers your CUSTOM EMAIL API.
   */
  const handleSignup = async () => {
    if (!isFormValid || loading) return;
    
    setLoading(true);
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanEmail = email.toLowerCase().trim();

    try {
      // 1. Create Login Account
      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { 
            display_name: cleanEmail.split('@')[0].toUpperCase(),
          }
        }
      });

      let userId = data?.user?.id;

      // ⚠️ EDGE CASE: User exists? Try logging them in.
      if (authError) {
        if (authError.message.includes("already registered")) {
          // Attempt to sign in if they guessed the password right
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });
          
          if (signInError) {
            throw new Error("This email is already registered. Please log in.");
          }
          userId = signInData?.user?.id;
        } else {
          throw authError;
        }
      }

      if (!userId) throw new Error("Could not create user ID.");

      // 2. Set Up User Profile (Idempotent Upsert)
      const generatedSlug = cleanEmail.split('@')[0] + Math.floor(1000 + Math.random() * 9000);
      
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        slug: generatedSlug,
        display_name: cleanEmail.split('@')[0].toUpperCase(),
        onboarding_completed: false, 
        is_seller: false,
        coin_balance: 0, 
        prestige_weight: 1, 
        subscription_plan: 'none',
        subscription_status: 'none',
        verification_status: 'none',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      
      if (profileError) throw new Error("Failed to set up your profile database.");

      // 3. Generate Verification Code (OTP)
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const { error: otpError } = await supabase.from("otp_verifications").upsert({ 
        email: cleanEmail, 
        code: otpCode 
      }, { onConflict: 'email' });

      if (otpError) throw otpError;

      // 4. 📧 EXTERNAL API HANDSHAKE (As requested)
      // We fire and forget this to keep the UI snappy, or await it if strict confirmation is needed.
      // Keeping it non-blocking for better UX.
      fetch("https://storelink.ng/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: cleanEmail, 
            code: otpCode, 
            type: 'VERIFY_SIGNUP' 
          }),
      }).catch((err) => console.log("Email API Warning:", err));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 5. Navigate to Verification
      router.replace({ 
        pathname: '/auth/verify', 
        params: { email: cleanEmail, type: 'signup' } 
      });

    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Signup Issue", e.message);
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
              <ArrowLeft color={theme.text} size={32} strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Join the{"\n"}<Text style={{ color: Colors.brand.emerald }}>Marketplace.</Text></Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Create your account to start discovering brands.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Mail size={20} color={theme.subtext} style={styles.icon} strokeWidth={2.5} />
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="Email Address" 
                  placeholderTextColor={`${theme.subtext}80`}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  selectionColor={Colors.brand.emerald}
                />
              </View>

              <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Lock size={20} color={theme.subtext} style={styles.icon} strokeWidth={2.5} />
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="Create Password" 
                  placeholderTextColor={`${theme.subtext}80`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  selectionColor={Colors.brand.emerald}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={22} color={theme.text} strokeWidth={2} /> : <Eye size={22} color={theme.subtext} strokeWidth={2} />}
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ShieldCheck size={20} color={validation.match ? Colors.brand.emerald : theme.subtext} style={styles.icon} strokeWidth={2.5} />
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="Confirm Password" 
                  placeholderTextColor={`${theme.subtext}80`}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  selectionColor={Colors.brand.emerald}
                />
                {validation.match && <CheckCircle2 size={20} color={Colors.brand.emerald} strokeWidth={3} />}
              </View>

              <View style={styles.shieldGrid}>
                <ShieldIndicator met={validation.length} label="8+ Char" theme={theme} />
                <ShieldIndicator met={validation.number} label="Number" theme={theme} />
                <ShieldIndicator met={validation.capital} label="Upper" theme={theme} />
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
                  <ArrowRight size={20} color={theme.background} strokeWidth={3} />
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
  scrollContent: { paddingHorizontal: 30, paddingBottom: 60, paddingTop: 60, flexGrow: 1, justifyContent: 'center' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', marginBottom: 20 },
  header: { marginBottom: 45 },
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, lineHeight: 46 },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 15, lineHeight: 22, opacity: 0.7 },
  form: { gap: 20 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 22, height: 72, borderWidth: 1.5 },
  icon: { marginRight: 15 },
  input: { flex: 1, fontSize: 16, fontWeight: '700' },
  shieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingHorizontal: 5 },
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shieldDot: { width: 6, height: 6, borderRadius: 3 },
  shieldText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  mainBtn: { height: 75, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 50, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  btnDisabled: { opacity: 0.3 },
  btnLabel: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  footerLink: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 14, fontWeight: '700' },
  boldText: { fontWeight: '900' }
});