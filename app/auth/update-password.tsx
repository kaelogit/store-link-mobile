import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { Lock, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 UPDATE PASSWORD TERMINAL v71.1 (Pure Build Sovereign Edition)
 * Audited: Session Purge, Identity Hardening, and Theme Handshake.
 */
export default function UpdatePasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { clearUser } = useUserStore(); 
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleUpdate = async () => {
    // 🛡️ SECURITY VALIDATION
    if (password.length < 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return Alert.alert("Security", "Password must be at least 8 characters.");
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert("Identity Conflict", "Passwords do not match.");
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. UPDATE THE AUTH USER
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 🏛️ PURE BUILD SECURITY PROTOCOL (Manifest Section I)
      Alert.alert(
        "Identity Hardened", 
        "Password updated. Please log in with your new credentials.",
        [{ text: "ENTER LOGIN", onPress: async () => {
           await supabase.auth.signOut();
           clearUser(); 
           router.replace('/auth/login');
        }}]
      );

    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Registry Update Failed", e.message.toUpperCase());
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
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
              <ShieldCheck size={34} color={Colors.brand.emerald} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Secure Your{"\n"}Access</Text>
            <Text style={[styles.subtext, { color: theme.subtext }]}>
              Set a strong, new password to keep your StoreLink identity and transaction data safe.
            </Text>
          </View>

          <View style={styles.form}>
             <Text style={styles.inputLabel}>NEW PASSWORD</Text>
             <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Lock size={18} color={theme.subtext} />
                <TextInput 
                  secureTextEntry={!showPassword}
                  placeholder="••••••••" 
                  placeholderTextColor={theme.subtext}
                  style={[styles.inputField, { color: theme.text }]} 
                  value={password} 
                  onChangeText={setPassword} 
                  selectionColor={Colors.brand.emerald}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} color={theme.text} /> : <Eye size={20} color={theme.subtext} />}
                </TouchableOpacity>
             </View>

             <Text style={[styles.inputLabel, { marginTop: 25 }]}>CONFIRM PASSWORD</Text>
             <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <CheckCircle2 size={18} color={password === confirmPassword && password.length > 0 ? Colors.brand.emerald : theme.subtext} />
                <TextInput 
                  secureTextEntry={!showPassword}
                  placeholder="••••••••" 
                  placeholderTextColor={theme.subtext}
                  style={[styles.inputField, { color: theme.text }]} 
                  value={confirmPassword} 
                  onChangeText={setConfirmPassword} 
                  selectionColor={Colors.brand.emerald}
                />
             </View>
          </View>

          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.mainButton, { backgroundColor: theme.text }, (!password || !confirmPassword) && styles.buttonDisabled]} 
            onPress={handleUpdate}
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.background }]}>UPDATE IDENTITY</Text>
            )}
          </TouchableOpacity>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 35, paddingTop: 60, backgroundColor: 'transparent' },
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
    justifyContent: 'center', alignItems: 'center', 
    marginTop: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
  },
  buttonDisabled: { opacity: 0.2 },
  buttonText: { fontWeight: '900', fontSize: 13, letterSpacing: 2 }
});