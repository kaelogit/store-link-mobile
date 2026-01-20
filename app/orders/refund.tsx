import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, AlertTriangle, ShieldCheck, 
  MessageSquare, HelpCircle, ChevronRight, XCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 REFUND REQUEST v1.1
 * Purpose: Allows buyers to dispute an order held in escrow.
 * Logic: Alerts the StoreLink safety team to freeze the funds.
 * Visual: High-fidelity warning theme (Amber/Red alerts).
 */
export default function RefundRequestScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  // Safety Check: Redirect if no order ID
  useEffect(() => {
    if (!orderId) {
      Alert.alert("Error", "No order specified.");
      router.back();
    }
  }, [orderId]);

  const issues = [
    "I haven't received my order",
    "Items are damaged or broken",
    "Items don't match the description",
    "Seller is not responding"
  ];

  const handleSubmit = async () => {
    if (!selectedIssue || reason.length < 10) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert("More Info Needed", "Please select an issue and provide a short description (min 10 chars).");
    }

    setLoading(true);
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      // 1. Mark order as 'disputed' to freeze funds
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' }) // Using 'cancelled' as the dispute trigger per schema
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 2. Log the dispute in the system
      const { error: disputeError } = await supabase.from('disputes').insert({
        order_id: orderId,
        reason: selectedIssue,
        description: reason,
        status: 'open'
      });

      if (disputeError) throw disputeError;

      Alert.alert(
        "Request Received",
        "Your refund request has been filed. Our safety team will review this and contact you within 24 hours.",
        [{ text: "OK", onPress: () => router.push('/orders') }]
      );
    } catch (e) {
      Alert.alert("Error", "Could not submit your request. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>REFUND REQUEST</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            keyboardShouldPersistTaps="handled"
        >
          
          <View style={[styles.warningBox, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }]}>
             <AlertTriangle size={24} color="#D97706" />
             <Text style={styles.warningText}>
               Funds for this order are currently held by StoreLink. Requesting a refund will freeze the payment until our team reviews the case.
             </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.subtext }]}>WHAT IS THE ISSUE?</Text>
          {issues.map((issue) => (
            <TouchableOpacity 
              key={issue} 
              style={[
                styles.issueBtn, 
                { backgroundColor: theme.surface, borderColor: selectedIssue === issue ? Colors.brand.emerald : theme.border }
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedIssue(issue);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.issueText, { color: theme.text }]}>{issue}</Text>
              {selectedIssue === issue ? <ShieldCheck size={18} color={Colors.brand.emerald} /> : <HelpCircle size={18} color={theme.subtext} />}
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { color: theme.subtext, marginTop: 30 }]}>ADDITIONAL DETAILS</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="Tell us more about what happened..."
            placeholderTextColor={theme.subtext}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
            textAlignVertical="top" // Android fix
          />

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: theme.text }, loading && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <>
                <XCircle size={20} color={theme.background} />
                <Text style={[styles.submitText, { color: theme.background }]}>SUBMIT REFUND REQUEST</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
             <MessageSquare size={16} color={theme.subtext} />
             <Text style={[styles.footerText, { color: theme.subtext }]}>YOU CAN ALSO CHAT WITH THE SELLER TO RESOLVE THIS</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { padding: 25 },
  
  warningBox: { padding: 20, borderRadius: 24, borderLeftWidth: 8, flexDirection: 'row', gap: 15, marginBottom: 35, alignItems: 'center' },
  warningText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#92400E', lineHeight: 18 },
  
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  
  issueBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, borderRadius: 20, marginBottom: 10, borderWidth: 1.5 },
  issueText: { fontSize: 13, fontWeight: '700' },
  
  input: { borderRadius: 24, padding: 20, height: 120, borderWidth: 1.5, fontSize: 14, fontWeight: '600' },
  
  submitBtn: { height: 75, borderRadius: 26, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, gap: 12 },
  submitText: { fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30, paddingHorizontal: 20 },
  footerText: { fontSize: 8, fontWeight: '900', letterSpacing: 1, textAlign: 'center', lineHeight: 14 }
});