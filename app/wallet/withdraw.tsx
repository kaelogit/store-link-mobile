import React, { useState } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, 
  KeyboardAvoidingView, Platform, ScrollView, StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 WITHDRAWAL FORM v1.1
 * Purpose: Moves "Internal Cash" to the user's physical bank via Paystack.
 * Features: Real-time currency formatting and secure balance checks.
 */
export default function WithdrawScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // 🛡️ Data Alignment: Accessing flat properties from profile (matching settlement.tsx)
  const availableBalance = profile?.escrow_balance || 0;
  const hasBankDetails = !!profile?.account_number && !!profile?.bank_code;

  const handleAmountChange = (text: string) => {
    // Remove non-numeric chars to get raw value
    const raw = text.replace(/[^0-9]/g, '');
    if (!raw) {
      setAmount('');
      return;
    }
    // Format with commas
    const formatted = parseInt(raw).toLocaleString();
    setAmount(formatted);
  };

  const handleWithdraw = async () => {
    const numericAmount = parseFloat(amount.replace(/,/g, ''));

    // 1. SAFETY CHECKS
    if (!hasBankDetails) {
      Alert.alert("Setup Required", "Please add your bank details in Profile Settings first.");
      return;
    }
    if (!numericAmount || numericAmount < 500) {
      Alert.alert("Invalid Amount", "Minimum withdrawal is ₦500");
      return;
    }
    if (numericAmount > availableBalance) {
      Alert.alert("Insufficient Funds", "You cannot withdraw more than your available balance.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 2. THE HANDSHAKE (RPC Call)
      const { error } = await supabase.rpc('initiate_payout_request', {
        p_user_id: profile?.id,
        p_amount: numericAmount,
        p_bank_code: profile?.bank_code,
        p_account_number: profile?.account_number,
        p_bank_name: profile?.bank_name
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        "Payout Initiated", 
        `₦${numericAmount.toLocaleString()} is on its way to your bank account.`,
        [{ text: "OK", onPress: () => {
            refreshUserData();
            router.back();
        }}]
      );

    } catch (err: any) {
      console.error(err);
      Alert.alert("Payout Failed", err.message || "Could not connect to Paystack.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={24} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>WITHDRAW CASH</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* BALANCE DISPLAY */}
          <Text style={styles.label}>AVAILABLE FOR WITHDRAWAL</Text>
          <Text style={[styles.balance, { color: theme.text }]}>₦{availableBalance.toLocaleString()}</Text>

          {/* AMOUNT INPUT */}
          <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
            <Text style={styles.currency}>₦</Text>
            <TextInput 
              style={[styles.input, { color: theme.text }]}
              placeholder="0"
              placeholderTextColor={theme.subtext}
              keyboardType="number-pad"
              value={amount}
              onChangeText={handleAmountChange}
              autoFocus
            />
          </View>

          {/* DESTINATION CARD */}
          <Text style={styles.label}>SENDING TO</Text>
          <View style={[styles.bankCard, { backgroundColor: theme.surface }]}>
            <View style={styles.bankInfo}>
              <Text style={[styles.bankName, { color: theme.text }]}>
                {profile?.bank_name || "No Bank Added"}
              </Text>
              <Text style={styles.accountNumber}>
                {profile?.account_number ? `****${profile.account_number.slice(-4)}` : "----"}
              </Text>
            </View>
            <ShieldCheck size={24} color={Colors.brand.emerald} />
          </View>

          <TouchableOpacity 
            style={[
                styles.withdrawBtn, 
                { backgroundColor: theme.text },
                (!amount || loading) && styles.disabledBtn
            ]} 
            onPress={handleWithdraw}
            disabled={loading || !amount}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <>
                <Text style={[styles.withdrawText, { color: theme.background }]}>CONFIRM WITHDRAWAL</Text>
                <ChevronRight size={18} color={theme.background} strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  content: { padding: 25 },
  
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: '#9CA3AF', marginBottom: 12 },
  balance: { fontSize: 36, fontWeight: '900', marginBottom: 40, letterSpacing: -1 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 25, borderRadius: 28, marginBottom: 35 },
  currency: { fontSize: 28, fontWeight: '900', marginRight: 10, color: '#9CA3AF' },
  input: { flex: 1, fontSize: 36, fontWeight: '900' },
  
  bankCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 22, borderRadius: 24, marginBottom: 40 },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '900' },
  accountNumber: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginTop: 4, letterSpacing: 1 },
  
  withdrawBtn: { height: 75, borderRadius: 26, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
  disabledBtn: { opacity: 0.2 },
  withdrawText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }
});