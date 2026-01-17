import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { ArrowLeft, KeyRound, Mail, SendHorizontal, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 RECOVERY TERMINAL v71.1 (Pure Build Sovereign Edition)
 * Audited: Identity Pre-Check, OTP Synchronization, and v75.0 Theme Sync.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleResetRequest = async () => {
    if (!email || loading) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
    }
    
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const cleanEmail = email.toLowerCase().trim();

    try {
      // 🕵️ 1. IDENTITY PRE-CHECK (Manifest Section I)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        throw new Error("No Identity found with this email address.");
      }

      // 📡 2. OTP GENERATION PROTOCOL
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. PERSIST RECOVERY TOKEN
      const { error: dbError } = await supabase
        .from("otp_verifications")
        .upsert({ 
            email: cleanEmail, 
            code: resetCode 
        }, { onConflict: 'email' });

      if (dbError) throw dbError;

      // 📧 4. DISPATCH PROTOCOL
      const response = await fetch("https://storelink.ng/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: cleanEmail, 
          code: resetCode, 
          type: 'PASSWORD_RESET' 
        }),
      });

      if (!response.ok) throw new Error("Dispatch Failure. Verify connection and retry.");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 🚀 5. NAVIGATION TO VERIFICATION GATE
      router.push({
        pathname: '/auth/verify',
        params: { email: cleanEmail, type: 'recovery' }
      });

    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Recovery Failure", e.message.toUpperCase());
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={28} />
        </TouchableOpacity>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
              <KeyRound size={34} color={Colors.brand.gold} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Forgot{"\n"}Password?</Text>
            <Text style={[styles.subtext, { color: theme.subtext }]}>
              A recovery code will be dispatched to the email linked to your account identity.
            </Text>
          </View>

          <View style={styles.form}>
              <Text style={styles.inputLabel}>RECOVERY EMAIL</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Mail size={18} color={theme.subtext} />
                <TextInput 
                  placeholder="Enter registered email" 
                  placeholderTextColor={theme.subtext}
                  style={[styles.inputField, { color: theme.text }]} 
                  value={email} 
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  selectionColor={Colors.brand.gold}
                />
              </View>
          </View>

          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.mainButton, { backgroundColor: theme.text }, (!email || loading) && styles.buttonDisabled]} 
            onPress={handleResetRequest}
            disabled={loading || !email}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <>
                <Text style={[styles.buttonText, { color: theme.background }]}>DISPATCH CODE</Text>
                <SendHorizontal size={18} color={theme.background} strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoRow}>
             <AlertCircle size={14} color={theme.subtext} />
             <Text style={[styles.infoText, { color: theme.subtext }]}>
               Code expires in 10 minutes.
             </Text>
          </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { paddingHorizontal: 30, paddingTop: 60 },
  content: { flex: 1, paddingHorizontal: 35, paddingTop: 30, backgroundColor: 'transparent' },
  header: { marginBottom: 40, backgroundColor: 'transparent' },
  iconCircle: { 
    width: 80, height: 80, borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', marginBottom: 25,
  },
  title: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, lineHeight: 44 },
  subtext: { fontSize: 15, marginTop: 15, fontWeight: '600', lineHeight: 22 },
  form: { marginTop: 10, backgroundColor: 'transparent' },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 12, marginLeft: 5 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 22, height: 74, borderRadius: 24, 
    gap: 12, borderWidth: 1.5
  },
  inputField: { flex: 1, fontSize: 16, fontWeight: '700' },
  mainButton: { 
    height: 75, borderRadius: 26, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    gap: 12, marginTop: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
  },
  buttonDisabled: { opacity: 0.2 },
  buttonText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  infoRow: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    gap: 8, marginTop: 40, backgroundColor: 'transparent'
  },
  infoText: { fontSize: 12, fontWeight: '700' }
});