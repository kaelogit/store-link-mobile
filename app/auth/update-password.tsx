import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, ScrollView, Keyboard 
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { Lock, CheckCircle2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useMutation, useQueryClient } from '@tanstack/react-query';

// App Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 UPDATE PASSWORD v74.0
 * Purpose: Securely changing the user's password.
 * Logic: Updates account security and requires a fresh login for safety.
 */
export default function UpdatePasswordScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { clearUser } = useUserStore(); 
  const queryClient = useQueryClient();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 1000, 
      useNativeDriver: true 
    }).start();
  }, []);

  /** 🛡️ PASSWORD UPDATE PROCESS */
  const updateMutation = useMutation({
    mutationFn: async () => {
      // Security Check
      if (password.length < 8) throw new Error("PASSWORD MUST BE AT LEAST 8 CHARACTERS.");
      if (password !== confirmPassword) throw new Error("PASSWORDS DO NOT MATCH.");

      // Update the user account
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      return true;
    },
    onMutate: () => {
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Safety protocol: log out and ask to sign back in
      Alert.alert(
        "PASSWORD UPDATED", 
        "Your account security has been updated. Please log in again with your new password.",
        [{ 
          text: "GO TO LOGIN", 
          onPress: async () => {
            await supabase.auth.signOut();
            clearUser(); 
            queryClient.clear(); // Clear app data for safety
            router.replace('/auth/login');
          }
        }]
      );
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("UPDATE FAILED", e.message.toUpperCase());
    }
  });

  const isFormValid = password.length >= 8 && password === confirmPassword;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
                <ShieldCheck size={36} color={Colors.brand.emerald} strokeWidth={2.5} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Secure Your{"\n"}Account.</Text>
              <Text style={[styles.subtext, { color: theme.subtext }]}>
                Choose a strong new password to keep your profile and personal data safe.
              </Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Lock size={20} color={theme.subtext} strokeWidth={2.5} />
                  <TextInput 
                    secureTextEntry={!showPassword}
                    placeholder="Set New Password" 
                    placeholderTextColor={`${theme.subtext}80`}
                    style={[styles.inputField, { color: theme.text }]} 
                    value={password} 
                    onChangeText={setPassword} 
                    selectionColor={Colors.brand.emerald}
                  />
                  <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setShowPassword(!showPassword); }}>
                    {showPassword ? <EyeOff size={22} color={theme.text} /> : <Eye size={22} color={theme.subtext} />}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 30 }]}>CONFIRM PASSWORD</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <CheckCircle2 size={20} color={password === confirmPassword && password.length > 0 ? Colors.brand.emerald : theme.subtext} strokeWidth={2.5} />
                  <TextInput 
                    secureTextEntry={!showPassword}
                    placeholder="Type Password Again" 
                    placeholderTextColor={`${theme.subtext}80`}
                    style={[styles.inputField, { color: theme.text }]} 
                    value={confirmPassword} 
                    onChangeText={setConfirmPassword} 
                    selectionColor={Colors.brand.emerald}
                  />
                </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.85}
              style={[
                styles.mainButton, 
                { backgroundColor: theme.text }, 
                (!isFormValid || updateMutation.isPending) && styles.buttonDisabled
              ]} 
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !isFormValid}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <>
                  <Text style={[styles.buttonText, { color: theme.background }]}>UPDATE PASSWORD</Text>
                  <ArrowRight size={20} color={theme.background} strokeWidth={3} />
                </>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 35, paddingVertical: 60 },
  header: { marginBottom: 50 },
  iconCircle: { 
    width: 90, height: 90, borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center', marginBottom: 25,
    elevation: 4
  },
  title: { fontSize: 42, fontWeight: '900', letterSpacing: -2, lineHeight: 46 },
  subtext: { fontSize: 15, marginTop: 15, fontWeight: '600', lineHeight: 24, opacity: 0.7 },
  form: { marginTop: 10 },
  inputLabel: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 22, height: 75, borderRadius: 28, 
    gap: 15, borderWidth: 1.5
  },
  inputField: { flex: 1, fontSize: 16, fontWeight: '700' },
  mainButton: { 
    height: 75, borderRadius: 30, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    gap: 12, marginTop: 50,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
  },
  buttonDisabled: { opacity: 0.15 },
  buttonText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 }
});