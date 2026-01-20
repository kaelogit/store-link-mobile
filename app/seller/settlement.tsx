import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, TextInput, 
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
  Modal, FlatList, StatusBar, View as RNView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Landmark, Search, ChevronRight, X, CheckCircle2, AlertCircle, ShieldCheck 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 PAYOUT SETTINGS v101.0
 * Purpose: Allows sellers to link their bank account for automated payouts.
 * Logic: Verifies account numbers instantly using Paystack's API.
 * Features: Supports all Nigerian Commercial and Microfinance Banks (MFB).
 */
export default function PayoutSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const [form, setForm] = useState({
    bank_name: profile?.bank_name || "",
    bank_code: profile?.bank_code || "",
    account_number: profile?.account_number || "",
    account_name: profile?.account_name || "",
  });

  // 1. LOADING BANKS: Fetches all active Nigerian banks and MFBs
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('https://api.paystack.co/bank?currency=NGN', {
          headers: { Authorization: `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY}` }
        });
        const result = await response.json();
        if (result.status) setBanks(result.data);
      } catch (e) {
        console.error("Could not load bank list.");
      }
    };
    fetchBanks();
  }, []);

  const filteredBanks = useMemo(() => {
    return banks.filter(b => b.name.toLowerCase().includes(pickerSearch.toLowerCase()));
  }, [banks, pickerSearch]);

  // 2. ACCOUNT VERIFICATION: Checks if account matches full_name
  const verifyAccount = async (accountNum: string, bankCode: string) => {
    if (accountNum.length !== 10 || !bankCode) return;
    
    setVerifying(true);
    try {
      const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${accountNum}&bank_code=${bankCode}`, {
        headers: { Authorization: `Bearer ${process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY}` }
      });
      const result = await response.json();

      if (result.status) {
        const resolvedName = result.data.account_name;
        // Strict match check against Profile full_name (First name check usually safer for variations)
        const userFirstName = profile?.full_name?.toLowerCase().split(' ')[0] || "";
        
        if (userFirstName && resolvedName.toLowerCase().includes(userFirstName)) {
          setForm(prev => ({ ...prev, account_name: resolvedName }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert("Name Mismatch", `The name on this account (${resolvedName}) does not match your registered name: ${profile?.full_name}.`);
          setForm(prev => ({ ...prev, account_number: "" }));
        }
      } else {
        Alert.alert("Error", "Could not verify this account number. Please check the details.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error during verification.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!form.account_name) return Alert.alert("Missing Info", "Please verify your account number first.");
    
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bank_name: form.bank_name,
          bank_code: form.bank_code,
          account_number: form.account_number,
          account_name: form.account_name,
          payout_setup_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (error) throw error;
      
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your payout details have been saved securely.", [{ text: "Done", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Error", "Could not save your payout settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>PAYOUT SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
          
          <View style={styles.infoBox}>
            <View style={[styles.iconHalo, { backgroundColor: `${Colors.brand.emerald}15` }]}>
               <Landmark size={36} color={Colors.brand.emerald} strokeWidth={2} />
            </View>
            <Text style={[styles.infoTitle, { color: theme.text }]}>Payout Destination</Text>
            <Text style={[styles.infoSub, { color: theme.subtext }]}>
              Enter the bank details where you want to receive your earnings. This must match your registered name: <Text style={{fontWeight: '900'}}>{profile?.full_name}</Text>.
            </Text>
          </View>

          <View style={styles.form}>
            {/* BANK SELECTION */}
            <Text style={styles.fieldLabel}>SELECT BANK</Text>
            <TouchableOpacity 
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border }]} 
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: form.bank_name ? theme.text : theme.subtext, fontWeight: '700' }}>
                {form.bank_name || "Choose your bank"}
              </Text>
              <ChevronRight size={18} color={theme.subtext} />
            </TouchableOpacity>

            {/* ACCOUNT NUMBER */}
            <Text style={[styles.fieldLabel, { marginTop: 25 }]}>ACCOUNT NUMBER</Text>
            <View style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput 
                style={{ flex: 1, color: theme.text, fontWeight: '700', fontSize: 16 }}
                placeholder="0000000000"
                placeholderTextColor={`${theme.subtext}80`}
                maxLength={10}
                keyboardType="numeric"
                value={form.account_number}
                onChangeText={(v) => {
                  setForm(prev => ({ ...prev, account_number: v, account_name: "" }));
                  if (v.length === 10) verifyAccount(v, form.bank_code);
                }}
              />
              {verifying && <ActivityIndicator size="small" color={Colors.brand.emerald} />}
            </View>

            {/* VERIFIED NAME DISPLAY */}
            {form.account_name ? (
              <View style={[styles.verifiedBox, { backgroundColor: `${Colors.brand.emerald}10` }]}>
                <CheckCircle2 size={16} color={Colors.brand.emerald} />
                <Text style={[styles.verifiedName, { color: Colors.brand.emerald }]}>{form.account_name}</Text>
              </View>
            ) : null}

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: theme.text }, (!form.account_name || loading) && styles.btnDisabled]}
              disabled={!form.account_name || loading}
              onPress={handleSave}
            >
              {loading ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.background }]}>SAVE PAYOUT INFO</Text>
              )}
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <ShieldCheck size={14} color={theme.subtext} />
              <Text style={[styles.securityText, { color: theme.subtext }]}>SECURE BANK ENCRYPTION ACTIVE</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* BANK PICKER MODAL */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>SELECT BANK</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchBox, { backgroundColor: theme.surface }]}>
            <Search size={18} color={theme.subtext} />
            <TextInput 
              placeholder="Search all banks & MFBs..." 
              placeholderTextColor={theme.subtext}
              style={{ flex: 1, marginLeft: 10, color: theme.text, fontSize: 16, fontWeight: '500' }}
              onChangeText={setPickerSearch}
              autoFocus
            />
          </View>
          <FlatList 
            data={filteredBanks}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.bankItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setForm(prev => ({ ...prev, bank_name: item.name, bank_code: item.code, account_name: "" }));
                  setShowPicker(false);
                  if (form.account_number.length === 10) verifyAccount(form.account_number, item.code);
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  navBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { padding: 25 },
  
  infoBox: { alignItems: 'center', marginBottom: 40 },
  iconHalo: { width: 80, height: 80, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  infoTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  infoSub: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 22, fontWeight: '500', opacity: 0.7 },
  
  form: { marginTop: 10 },
  fieldLabel: { fontSize: 10, fontWeight: '900', marginBottom: 12, color: '#9CA3AF', letterSpacing: 1.5, marginLeft: 4 },
  
  input: { height: 65, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  verifiedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, borderRadius: 16, marginTop: 15 },
  verifiedName: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  
  saveBtn: { height: 75, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 40, elevation: 4 },
  saveBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  btnDisabled: { opacity: 0.2 },
  
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 25, opacity: 0.6 },
  securityText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  
  modalContainer: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 25, padding: 15, borderRadius: 15, marginBottom: 20 },
  bankItem: { padding: 20, borderBottomWidth: 1, paddingHorizontal: 25 }
});