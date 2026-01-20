import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, Keyboard 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { ArrowLeft, KeyRound, Mail, Send, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🚀 SPEED ENGINE
import { useMutation } from '@tanstack/react-query';

// App Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🔐 FORGOT PASSWORD SCREEN v74.0
 * Purpose: Allows users to reset their password via email verification.
 * Language: Simple English for a stress-free recovery process.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const [email, setEmail] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smoothly fade in the recovery form
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  /** 🚀 RESET PASSWORD LOGIC */
  const resetMutation = useMutation({
    mutationFn: async (targetEmail: string) => {
      const cleanEmail = targetEmail.toLowerCase().trim();

      // 1. Check if the user actually exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error("This email is not registered in our system.");

      // 2. Generate a 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 3. Save the code to the database for verification
      const { error: dbError } = await supabase
        .from("otp_verifications")
        .upsert({ 
            email: cleanEmail, 
            code: resetCode,
            updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (dbError) throw dbError;

      // 4. Send the reset email (Custom API)
      const response = await fetch("https://storelink.ng/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: cleanEmail, 
          code: resetCode, 
          type: 'PASSWORD_RESET' 
        }),
      });

      if (!response.ok) throw new Error("Could not send email. Please try again later.");
      
      return cleanEmail;
    },
    onMutate: () => {
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onSuccess: (cleanEmail) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Route to the verification screen
      router.push({
        pathname: '/auth/verify',
        params: { email: cleanEmail, type: 'recovery' }
      });
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Reset Failed", e.message);
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* BACK NAVIGATION (Safe Area Aware) */}
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { marginTop: insets.top + 10 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
        </TouchableOpacity>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
              <KeyRound size={36} color={Colors.brand.emerald} strokeWidth={2.5} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Forgot{"\n"}Password?</Text>
            <Text style={[styles.subtext, { color: theme.subtext }]}>
              Don't worry! Enter your email address below and we'll send you a code to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Mail size={20} color={theme.subtext} strokeWidth={2.5} />
                <TextInput 
                  placeholder="Enter your email..." 
                  placeholderTextColor={`${theme.subtext}80`}
                  style={[styles.inputField, { color: theme.text }]} 
                  value={email} 
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  selectionColor={Colors.brand.emerald}
                />
              </View>
          </View>

          <TouchableOpacity 
            activeOpacity={0.9}
            style={[
              styles.mainButton, 
              { backgroundColor: theme.text }, 
              (!email || resetMutation.isPending) && styles.buttonDisabled
            ]} 
            onPress={() => resetMutation.mutate(email)}
            disabled={resetMutation.isPending || !email}
          >
            {resetMutation.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <>
                <Text style={[styles.buttonText, { color: theme.background }]}>SEND RESET CODE</Text>
                <Send size={18} color={theme.background} strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoRow}>
              <ShieldCheck size={14} color={Colors.brand.emerald} strokeWidth={2.5} />
              <Text style={[styles.infoText, { color: theme.subtext }]}>
                Your account security is our priority
              </Text>
          </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { paddingHorizontal: 25, paddingBottom: 10 },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 10 },
  header: { marginBottom: 40 },
  iconCircle: { 
    width: 84, height: 84, borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', marginBottom: 25,
  },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: -1.5, lineHeight: 42 },
  subtext: { fontSize: 15, marginTop: 15, fontWeight: '600', lineHeight: 22, opacity: 0.7 },
  form: { marginTop: 5 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 12, marginLeft: 5 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 22, height: 72, borderRadius: 24, 
    gap: 15, borderWidth: 1.5
  },
  inputField: { flex: 1, fontSize: 16, fontWeight: '700' },
  mainButton: { 
    height: 75, borderRadius: 28, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    gap: 12, marginTop: 40,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10
  },
  buttonDisabled: { opacity: 0.15 },
  buttonText: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  infoRow: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 8, marginTop: 40, opacity: 0.6
  },
  infoText: { fontSize: 11, fontWeight: '800' }
});