import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { LayoutDashboard, Eye, EyeOff, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 LOGIN TERMINAL v70.1 (Pure Build Sovereign Edition)
 * Audited: Identity Hydration, MFA Resilience, and Kinetic Rejection.
 */
export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { refreshUserData } = useUserStore(); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsMFA, setNeedsMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const triggerRejectionPhysics = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password || loading) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Auth Handshake
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      if (error) throw error;

      // 2. Security Check: MFA detection
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.all?.some(f => f.status === 'verified')) {
        setNeedsMFA(true);
        setLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      // 3. 🏛️ PURE BUILD HYDRATION (Manifest Section I)
      await refreshUserData();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Logic: Root Layout Gatekeeper handles the final redirect based on profile state.
    } catch (e: any) {
      triggerRejectionPhysics();
      Alert.alert("Access Denied", e.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (mfaCode.length < 6 || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: (await supabase.auth.mfa.listFactors()).data?.all[0].id || '',
        code: mfaCode,
      });
      if (error) throw error;

      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      triggerRejectionPhysics();
      Alert.alert("Verification Failed", e.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <Animated.View style={[styles.mainWrapper, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {!needsMFA ? (
              <View style={styles.content}>
                <View style={styles.header}>
                  <View style={[styles.logoFrame, { backgroundColor: theme.surface }]}>
                    <LayoutDashboard size={44} color={Colors.brand.emerald} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.logoTitle}>StoreLink</Text>
                  <Text style={[styles.subHeader, { color: theme.subtext }]}>Welcome back to the marketplace</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Mail size={18} color={theme.subtext} style={styles.inputIcon} />
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
                    <Lock size={18} color={theme.subtext} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: theme.text }]} 
                      placeholder="Password" 
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

                  <TouchableOpacity 
                    style={styles.recoveryBtn} 
                    onPress={() => router.push('/auth/forgot-password')}
                  >
                    <Text style={[styles.recoveryText, { color: Colors.brand.emerald }]}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  activeOpacity={0.9}
                  style={[styles.mainBtn, { backgroundColor: theme.text }, (!email || !password) && styles.btnDisabled]} 
                  onPress={handleLogin}
                  disabled={loading || !email || !password}
                >
                  {loading ? <ActivityIndicator color={theme.background} /> : (
                    <>
                      <Text style={[styles.mainBtnText, { color: theme.background }]}>LOG IN</Text>
                      <ArrowRight size={18} color={theme.background} strokeWidth={3} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <View style={styles.dividerRow}>
                       <View style={[styles.line, { backgroundColor: theme.border }]} />
                       <Text style={[styles.orLabel, { color: theme.subtext }]}>OR</Text>
                       <View style={[styles.line, { backgroundColor: theme.border }]} />
                    </View>

                    <TouchableOpacity onPress={() => router.push('/auth/signup')} style={styles.signupAction}>
                       <Text style={[styles.footerText, { color: theme.subtext }]}>
                         New here? <Text style={[styles.signupBold, { color: theme.text }]}>Join StoreLink</Text>
                       </Text>
                    </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.vaultContent}>
                <View style={[styles.vaultIconBg, { backgroundColor: theme.surface }]}>
                  <ShieldCheck size={54} color={Colors.brand.emerald} strokeWidth={2} />
                </View>
                <Text style={styles.vaultTitle}>MFA Verification</Text>
                <Text style={[styles.vaultSub, { color: theme.subtext }]}>Enter the security code to access your profile.</Text>
                
                <TextInput 
                  style={[styles.otpField, { color: Colors.brand.emerald }]} 
                  placeholder="------" 
                  placeholderTextColor={theme.border}
                  keyboardType="number-pad" 
                  maxLength={6} 
                  value={mfaCode} 
                  onChangeText={setMfaCode}
                  autoFocus
                  selectionColor={Colors.brand.emerald}
                />

                <TouchableOpacity 
                  style={[styles.mainBtn, { backgroundColor: theme.text }]} 
                  onPress={handleVerifyMFA}
                  disabled={loading || mfaCode.length < 6}
                >
                  {loading ? <ActivityIndicator color={theme.background} /> : <Text style={[styles.mainBtnText, { color: theme.background }]}>VERIFY & ENTER</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setNeedsMFA(false)} style={styles.abortBtn}>
                  <Text style={[styles.abortText, { color: theme.subtext }]}>Go back</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainWrapper: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 35, paddingVertical: 50, justifyContent: 'center' },
  content: { width: '100%', backgroundColor: 'transparent' },
  header: { alignItems: 'center', marginBottom: 50, backgroundColor: 'transparent' },
  logoFrame: { 
    width: 85, height: 85, borderRadius: 28, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
  },
  logoTitle: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
  subHeader: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  formContainer: { gap: 16, backgroundColor: 'transparent' },
  inputGroup: { 
    flexDirection: 'row', alignItems: 'center', 
    borderRadius: 22, paddingHorizontal: 20, height: 68, 
    borderWidth: 1.5
  },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, fontSize: 16, fontWeight: '700' },
  recoveryBtn: { alignSelf: 'flex-end', marginTop: 4 },
  recoveryText: { fontSize: 13, fontWeight: '800' },
  mainBtn: { 
    height: 74, borderRadius: 24, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 12, marginTop: 35,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20
  },
  btnDisabled: { opacity: 0.4 },
  mainBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  footer: { marginTop: 60, backgroundColor: 'transparent' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 35, backgroundColor: 'transparent' },
  line: { flex: 1, height: 1 },
  orLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  signupAction: { alignSelf: 'center' },
  footerText: { fontSize: 14, fontWeight: '700' },
  signupBold: { fontWeight: '900' },
  vaultContent: { alignItems: 'center', backgroundColor: 'transparent' },
  vaultIconBg: { 
    width: 100, height: 100, borderRadius: 35, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 25 
  },
  vaultTitle: { fontSize: 26, fontWeight: '900' },
  vaultSub: { 
    fontSize: 15, textAlign: 'center', 
    marginTop: 12, paddingHorizontal: 30, lineHeight: 22, fontWeight: '600' 
  },
  otpField: { 
    fontSize: 52, fontWeight: '900', textAlign: 'center', 
    letterSpacing: 10, marginVertical: 45, width: '100%' 
  },
  abortBtn: { marginTop: 30 },
  abortText: { fontSize: 13, fontWeight: '900' }
});