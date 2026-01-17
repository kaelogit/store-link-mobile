import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated,
  ScrollView, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw, MailSearch, LockKeyhole, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import * as ExpoHaptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 IDENTITY VERIFICATION TERMINAL v78.6 (Pure Build)
 * Audited: Section I Identity Layer & Custom OTP Handshake.
 * Resolved: "Handshake Failure" caused by Supabase internal OTP desync.
 */
export default function VerifyScreen() {
  const { email, type = 'signup' } = useLocalSearchParams();
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { refreshUserData } = useUserStore();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 🛡️ SECURITY GATE: Ensure email exists
  useEffect(() => {
    if (!email) router.replace('/auth/signup');
  }, [email]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 60, useNativeDriver: true, friction: 8 }),
      Animated.delay(3000),
      Animated.spring(toastAnim, { toValue: -100, useNativeDriver: true, friction: 8 })
    ]).start(() => setToastMessage(null));
  };

  const triggerRejection = () => {
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  /**
   * 🛡️ SOVEREIGN OTP HANDSHAKE
   * Logic: Manually validates code against the custom registry.
   */
  const handleVerify = async (manualCode?: string) => {
    const codeToVerify = manualCode || code;
    if (codeToVerify.length < 6 || loading || !email) return;

    setLoading(true);
    try {
      // 1. VALIDATE AGAINST CUSTOM OTP REGISTRY
      const { data: otpData, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', email as string)
        .eq('code', codeToVerify)
        .single();

      if (otpError || !otpData) {
        throw new Error("IDENTITY CODE IS INVALID OR HAS EXPIRED.");
      }

      // 🏛️ 2. PERFORM IDENTITY FLIP (Manifest Section I)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true, updated_at: new Date().toISOString() })
        .eq('email', email as string);

      if (profileError) throw profileError;

      // 🗑️ 3. CLEANUP REGISTRY
      await supabase.from('otp_verifications').delete().eq('email', email as string);

      // 4. HYDRATION & NAVIGATION
      await refreshUserData();
      await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
      
      if (type === 'recovery') {
        router.replace({ pathname: '/auth/update-password', params: { email } });
      } else {
        router.replace('/onboarding/role-setup');
      }
    } catch (err: any) {
      setLoading(false);
      triggerRejection();
      Alert.alert("Handshake Failure", err.message.toUpperCase());
    }
  };

  /**
   * 📡 RESEND PROTOCOL
   * Generates a fresh code in the registry and dispatches via API.
   */
  const handleResend = async () => {
    if (resending || !email) return;
    setResending(true);
    
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { error: upsertError } = await supabase
        .from('otp_verifications')
        .upsert({ email: email as string, code: newOtp }, { onConflict: 'email' });

      if (upsertError) throw upsertError;

      // DISPATCH via custom API
      await fetch("https://storelink.ng/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: newOtp, type: 'VERIFY_SIGNUP' }),
      });
      
      ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
      showToast("NEW TRANSMISSION DISPATCHED");
    } catch (err: any) {
      Alert.alert("Registry Error", "Failed to dispatch a new verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {toastMessage && (
        <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
          <CheckCircle2 color="white" size={18} strokeWidth={3} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={28} />
          </TouchableOpacity>

          <Animated.View style={[styles.content, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>
                <LockKeyhole size={32} color={Colors.brand.emerald} strokeWidth={2.5} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Confirm Identity</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                A 6-digit code has been dispatched to{"\n"}
                <Text style={[styles.bold, { color: theme.text }]}>{email}</Text>
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.hiddenInput}
                value={code}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9]/g, '');
                  if (clean.length <= 6) setCode(clean);
                  if (clean.length === 6) handleVerify(clean);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                selectionColor={Colors.brand.emerald}
              />
              <View style={styles.boxesRow} pointerEvents="none">
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={[
                    styles.digitBox, 
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    code.length === i && { borderColor: Colors.brand.emerald },
                    code.length > i && { borderColor: theme.text }
                  ]}>
                    <Text style={[styles.digitText, { color: theme.text }]}>{code[i] || ''}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.verifyBtn, { backgroundColor: theme.text }, (code.length < 6 || loading) && styles.btnDisabled]} 
              onPress={() => handleVerify()}
              disabled={loading || code.length < 6}
            >
              {loading ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <Text style={[styles.btnLabel, { color: theme.background }]}>AUTHENTICATE</Text>
              )}
            </TouchableOpacity>

            <View style={styles.helpBox}>
                <MailSearch size={14} color={theme.subtext} />
                <Text style={[styles.helpText, { color: theme.subtext }]}>
                  Missing the code? Check your <Text style={styles.bold}>Spam</Text> folder.
                </Text>
            </View>

            <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <View style={styles.resendRow}>
                    <RefreshCw size={14} color={theme.subtext} />
                    <Text style={[styles.resendLabel, { color: theme.subtext }]}>RESEND NEW CODE</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 50, paddingTop: 60 },
  backBtn: { paddingHorizontal: 30, paddingBottom: 10 },
  content: { paddingHorizontal: 35, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  iconBox: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 22, fontWeight: '500' },
  bold: { fontWeight: '800' },
  inputContainer: { width: '100%', height: 90, marginVertical: 35, justifyContent: 'center', alignItems: 'center' },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0, zIndex: 10 },
  boxesRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  digitBox: { 
    width: (width - 110) / 6, 
    height: 65, 
    borderRadius: 18, 
    borderWidth: 2, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  digitText: { fontSize: 28, fontWeight: '900' },
  verifyBtn: { 
    width: '100%', 
    height: 75, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15
  },
  btnDisabled: { opacity: 0.15 },
  btnLabel: { fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  helpBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 40, opacity: 0.6 },
  helpText: { fontSize: 13, fontWeight: '600' },
  resendBtn: { marginTop: 40, padding: 20 },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resendLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#10B981', height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 9999 },
  toastText: { color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 1 }
});