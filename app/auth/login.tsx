import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Animated, Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { LayoutDashboard, Eye, EyeOff, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🚀 SPEED ENGINE
import { useMutation, useQueryClient } from '@tanstack/react-query';

// App Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🔐 LOGIN SCREEN v73.0
 * Purpose: Secure entry into the app.
 * UX: Simple English, smooth animations, and hardware feedback.
 * Security: Integrated MFA Handshake.
 */
export default function LoginScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { refreshUserData } = useUserStore(); 
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // MFA State
  const [needsMFA, setNeedsMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smoothly fade in when the screen loads
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  /** 🛡️ REJECTION PHYSICS: Shakes the form if login fails */
  const triggerErrorShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  /** 🚀 LOGIN LOGIC */
  const loginMutation = useMutation({
    mutationFn: async () => {
      // 1. Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      if (error) throw error;

      // 2. Check if Two-Factor Auth is enabled
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors?.all?.find(f => f.status === 'verified' && f.factor_type === 'totp');

      if (verifiedFactor) {
        setNeedsMFA(true);
        setActiveFactorId(verifiedFactor.id); // 🛡️ Capture ID for step 2
        return 'MFA_REQUIRED';
      }

      // 3. Load the user's latest shop and profile data (if no MFA)
      await refreshUserData();
      return 'SUCCESS';
    },
    onMutate: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onSuccess: (status) => {
      if (status === 'SUCCESS') {
        // Clear old data and pre-load the new profile
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      } else {
        // MFA is required, UI stays on screen but switches view
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    },
    onError: (e: any) => {
      triggerErrorShake();
      Alert.alert("Login Failed", e.message || "Please check your credentials.");
    }
  });

  const handleVerifyMFA = async () => {
    if (mfaCode.length < 6 || !activeFactorId) return;
    
    // UI Feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: activeFactorId,
        code: mfaCode,
      });
      if (error) throw error;

      await refreshUserData();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      triggerErrorShake();
      setMfaCode(''); // Clear wrong code
      Alert.alert("Invalid Code", "The verification code you entered is incorrect.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
                  <Text style={[styles.logoTitle, { color: theme.text }]}>StoreLink</Text>
                  <Text style={[styles.subHeader, { color: theme.subtext }]}>Welcome back</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={[styles.inputGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Mail size={18} color={theme.subtext} style={styles.inputIcon} />
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
                    <Lock size={18} color={theme.subtext} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: theme.text }]} 
                      placeholder="Password" 
                      placeholderTextColor={`${theme.subtext}80`}
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
                    <Text style={[styles.recoveryText, { color: Colors.brand.emerald }]}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  activeOpacity={0.9}
                  style={[styles.mainBtn, { backgroundColor: theme.text }, (!email || !password) && styles.btnDisabled]} 
                  onPress={() => loginMutation.mutate()}
                  disabled={loginMutation.isPending || !email || !password}
                >
                  {loginMutation.isPending ? <ActivityIndicator color={theme.background} /> : (
                    <>
                      <Text style={[styles.mainBtnText, { color: theme.background }]}>LOGIN</Text>
                      <ArrowRight size={20} color={theme.background} strokeWidth={3} />
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
                         New here? <Text style={[styles.signupBold, { color: theme.text }]}>Create an Account</Text>
                       </Text>
                    </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.vaultContent}>
                <View style={[styles.vaultIconBg, { backgroundColor: theme.surface }]}>
                  <ShieldCheck size={54} color={Colors.brand.emerald} strokeWidth={2} />
                </View>
                <Text style={[styles.vaultTitle, { color: theme.text }]}>Security Check</Text>
                <Text style={[styles.vaultSub, { color: theme.subtext }]}>Please enter the six-digit code from your authenticator app.</Text>
                
                <TextInput 
                  style={[styles.otpField, { color: Colors.brand.emerald }]} 
                  placeholder="000000" 
                  placeholderTextColor={theme.border}
                  keyboardType="number-pad" 
                  maxLength={6} 
                  value={mfaCode} 
                  onChangeText={(v) => {
                    setMfaCode(v);
                    if (v.length === 6) Keyboard.dismiss();
                  }}
                  autoFocus
                  selectionColor={Colors.brand.emerald}
                />

                <TouchableOpacity 
                  style={[styles.mainBtn, { backgroundColor: theme.text }, mfaCode.length < 6 && styles.btnDisabled]} 
                  onPress={handleVerifyMFA}
                  disabled={mfaCode.length < 6}
                >
                  <Text style={[styles.mainBtnText, { color: theme.background }]}>VERIFY & ENTER</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => { setNeedsMFA(false); setMfaCode(''); }} style={styles.abortBtn}>
                  <Text style={[styles.abortText, { color: theme.subtext }]}>Back to Login</Text>
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
  mainWrapper: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingVertical: 50, justifyContent: 'center' },
  content: { width: '100%' },
  header: { alignItems: 'center', marginBottom: 50 },
  logoFrame: { 
    width: 90, height: 90, borderRadius: 32, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  logoTitle: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
  subHeader: { fontSize: 15, fontWeight: '700', marginTop: 8, opacity: 0.5 },
  formContainer: { gap: 16 },
  inputGroup: { 
    flexDirection: 'row', alignItems: 'center', 
    borderRadius: 24, paddingHorizontal: 22, height: 72, 
    borderWidth: 1.5
  },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, fontSize: 16, fontWeight: '700' },
  recoveryBtn: { alignSelf: 'flex-end', marginTop: 5 },
  recoveryText: { fontSize: 13, fontWeight: '900' },
  mainBtn: { 
    height: 75, borderRadius: 28, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 12, marginTop: 40,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
  },
  btnDisabled: { opacity: 0.3 },
  mainBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  footer: { marginTop: 60 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 35 },
  line: { flex: 1, height: 1.5 },
  orLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  signupAction: { alignSelf: 'center' },
  footerText: { fontSize: 14, fontWeight: '700' },
  signupBold: { fontWeight: '900' },
  
  // MFA VAULT STYLES
  vaultContent: { alignItems: 'center', width: '100%', marginTop: 20 },
  vaultIconBg: { 
    width: 110, height: 110, borderRadius: 40, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 30
  },
  vaultTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  vaultSub: { 
    fontSize: 15, textAlign: 'center', 
    marginTop: 15, paddingHorizontal: 25, lineHeight: 24, fontWeight: '600', opacity: 0.7 
  },
  otpField: { 
    fontSize: 48, fontWeight: '900', textAlign: 'center', 
    letterSpacing: 10, marginVertical: 40, width: '100%',
    fontVariant: ['tabular-nums']
  },
  abortBtn: { marginTop: 30, padding: 10 },
  abortText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});