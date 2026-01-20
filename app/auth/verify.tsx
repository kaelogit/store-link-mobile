import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated,
  ScrollView, Dimensions, Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw, Lock, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🚀 SPEED ENGINE
import { useMutation, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🔐 VERIFICATION SCREEN v82.0
 * Purpose: Securely verify the user's email using a 6-digit code.
 * UX: Countdown timer, auto-submission, and spam protection.
 */
export default function VerifyScreen() {
  const { email, type = 'signup' } = useLocalSearchParams();
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { refreshUserData } = useUserStore();
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30); // 🛡️ 30s Cooldown
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 🛡️ COUNTDOWN TIMER LOGIC
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (!email) router.replace('/auth/signup');
  }, [email]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 60, useNativeDriver: true, friction: 8 }),
      Animated.delay(2500),
      Animated.spring(toastAnim, { toValue: -100, useNativeDriver: true, friction: 8 })
    ]).start(() => setToastMessage(null));
  };

  const triggerErrorShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  /** 🚀 VERIFICATION LOGIC */
  const verifyMutation = useMutation({
    mutationFn: async (codeToVerify: string) => {
      // 1. Check code against database (Custom OTP Flow)
      const { data: otpData, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', email as string)
        .eq('code', codeToVerify)
        .maybeSingle(); // Safer than single()

      if (otpError || !otpData) throw new Error("The code you entered is invalid or expired.");

      // 2. Mark the profile as verified
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('email', email as string);

      if (profileError) throw profileError;

      // 3. Clean up the used code
      await supabase.from('otp_verifications').delete().eq('email', email as string);
      
      return true;
    },
    onSuccess: async () => {
      await refreshUserData();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
      
      if (type === 'recovery') {
        router.replace({ pathname: '/auth/update-password', params: { email } });
      } else {
        router.replace('/onboarding/role-setup');
      }
    },
    onError: (err: any) => {
      setCode(''); // Clear code on failure
      triggerErrorShake();
      Alert.alert("Verification Failed", err.message);
    }
  });

  const handleCodeInput = (v: string) => {
    const clean = v.replace(/[^0-9]/g, '');
    if (clean.length <= 6) setCode(clean);
    // Automatic submission when 6 digits are reached
    if (clean.length === 6) verifyMutation.mutate(clean);
  };

  const handleResend = async () => {
    if (resending || timer > 0 || !email) return;
    
    setResending(true);
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('otp_verifications').upsert({ email: email as string, code: newOtp }, { onConflict: 'email' });

      // 📧 CUSTOM EMAIL API HANDSHAKE
      await fetch("https://storelink.ng/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: newOtp, type: 'VERIFY_SIGNUP' }),
      });
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      showToast("NEW CODE SENT");
      setTimer(30); // Reset cooldown
    } catch (err) {
      Alert.alert("Error", "Could not send a new code. Please try again.");
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
          </TouchableOpacity>

          <Animated.View style={[styles.content, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>
                <ShieldCheck size={36} color={Colors.brand.emerald} strokeWidth={2.5} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Verify Account</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Enter the 6-digit code we sent to{"\n"}
                <Text style={[styles.bold, { color: theme.text }]}>{email}</Text>
              </Text>
            </View>

            {/* 🛡️ INPUT MATRIX */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.hiddenInput}
                value={code}
                onChangeText={handleCodeInput}
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
                    code.length === i && { borderColor: Colors.brand.emerald, borderWidth: 2 },
                    code.length > i && { borderColor: theme.text }
                  ]}>
                    <Text style={[styles.digitText, { color: theme.text }]}>{code[i] || ''}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.verifyBtn, { backgroundColor: theme.text }, (code.length < 6 || verifyMutation.isPending) && styles.btnDisabled]} 
              onPress={() => verifyMutation.mutate(code)}
              disabled={verifyMutation.isPending || code.length < 6}
            >
              {verifyMutation.isPending ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <Text style={[styles.btnLabel, { color: theme.background }]}>VERIFY NOW</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.resendBtn, timer > 0 && { opacity: 0.5 }]} 
              onPress={handleResend} 
              disabled={resending || timer > 0}
            >
              {resending ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <View style={styles.resendRow}>
                    <RefreshCw size={14} color={theme.subtext} />
                    <Text style={[styles.resendLabel, { color: theme.subtext }]}>
                      {timer > 0 ? `RESEND CODE IN ${timer}s` : "SEND A NEW CODE"}
                    </Text>
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
  backBtn: { paddingHorizontal: 25, paddingBottom: 10 },
  content: { paddingHorizontal: 30, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 84, height: 84, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 15, lineHeight: 22, fontWeight: '600', opacity: 0.7 },
  bold: { fontWeight: '900' },
  
  inputContainer: { width: '100%', height: 80, marginVertical: 30, justifyContent: 'center' },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0, zIndex: 10 },
  boxesRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 8 },
  digitBox: { 
    flex: 1,
    height: 64, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  digitText: { fontSize: 26, fontWeight: '900' },
  
  verifyBtn: { 
    width: '100%', 
    height: 75, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10
  },
  btnDisabled: { opacity: 0.2 },
  btnLabel: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  
  resendBtn: { marginTop: 40, padding: 15 },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resendLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  
  toast: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: Colors.brand.emerald, height: 56, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 9999, elevation: 10 },
  toastText: { color: 'white', fontWeight: '900', fontSize: 11, letterSpacing: 1 }
});