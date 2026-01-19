import React, { useState } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, ShieldCheck, Info, 
  CreditCard, UserCheck, Zap, MessageSquare, 
  Headphones
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useMutation, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 HELP CENTER v96.0
 * Purpose: A secure way for users to contact support for help with payments, identity, or app issues.
 * Features: High-fidelity category picking and instant submission feedback.
 */
export default function CreateSupportTicketScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const categories = [
    { id: 'PAYMENT', label: 'PAYMENT', icon: CreditCard, color: Colors.brand.emerald },
    { id: 'IDENTITY', label: 'IDENTITY', icon: UserCheck, color: '#3B82F6' },
    { id: 'TECHNICAL', label: 'APP ISSUE', icon: Zap, color: Colors.brand.violet },
    { id: 'GENERAL', label: 'OTHER', icon: Info, color: '#6B7280' },
  ];

  /** 🛡️ SUBMISSION PROCESS */
  const ticketMutation = useMutation({
    mutationFn: async () => {
      if (!category || !subject.trim() || !message.trim()) {
        throw new Error("REQUIRED INFO: PLEASE FILL IN ALL FIELDS.");
      }

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          member_id: profile?.id,
          category,
          subject: subject.trim(),
          message: message.trim(),
          status: 'OPEN',
          priority: category === 'PAYMENT' || category === 'IDENTITY' ? 'HIGH' : 'NORMAL',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    },
    onMutate: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['support-history'] }); 
      Alert.alert(
        "REQUEST SENT", 
        "Your message has been received. Our safety team will respond within 4 hours.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("SUBMISSION ERROR", e.message.toUpperCase());
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* 📱 HEADER */}
        <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>CONTACT SUPPORT</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.introBox}>
            <View style={[styles.introIconHalo, { backgroundColor: Colors.brand.emerald + '15' }]}>
               <Headphones size={42} color={Colors.brand.emerald} strokeWidth={2.5} />
            </View>
            <Text style={[styles.introTitle, { color: theme.text }]}>How can we help?</Text>
            <Text style={[styles.introSub, { color: theme.subtext }]}>
              Send a message to our support team for help with your account or orders.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>CHOOSE A CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  activeOpacity={0.8}
                  style={[
                    styles.catCard, 
                    { borderColor: theme.border, backgroundColor: theme.surface },
                    isSelected && { borderColor: theme.text, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: isSelected ? theme.text : theme.background }]}>
                    <Icon size={20} color={isSelected ? theme.background : cat.color} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.catText, { color: isSelected ? theme.text : theme.subtext }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>SUBJECT</Text>
          <TextInput 
            style={[styles.subjectInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="Brief summary of the issue"
            placeholderTextColor={`${theme.subtext}80`}
            value={subject}
            onChangeText={setSubject}
            selectionColor={Colors.brand.emerald}
          />

          <Text style={styles.sectionLabel}>MESSAGE</Text>
          <TextInput 
            style={[styles.messageInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="Tell us more about your request..."
            placeholderTextColor={`${theme.subtext}80`}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            selectionColor={Colors.brand.emerald}
          />

          <TouchableOpacity 
            style={[
              styles.submitBtn, 
              { backgroundColor: theme.text }, 
              (ticketMutation.isPending || !category) && styles.submitDisabled
            ]} 
            onPress={() => ticketMutation.mutate()}
            disabled={ticketMutation.isPending || !category}
          >
            {ticketMutation.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <>
                <MessageSquare size={20} color={theme.background} strokeWidth={2.5} />
                <Text style={[styles.submitBtnText, { color: theme.background }]}>SEND MESSAGE</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.securityFooter}>
             <ShieldCheck size={14} color={theme.subtext} />
             <Text style={[styles.securityNote, { color: theme.subtext }]}>
               SECURE ENCRYPTED MESSAGING
             </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1.5 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  scrollContent: { padding: 25 },
  introBox: { alignItems: 'center', marginBottom: 45 },
  introIconHalo: { width: 100, height: 100, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  introTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  introSub: { fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 24, fontWeight: '600', opacity: 0.7 },
  sectionLabel: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
  catCard: { width: (width - 62) / 2, padding: 20, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconCircle: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  catText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  subjectInput: { borderRadius: 24, padding: 20, fontSize: 16, fontWeight: '700', borderWidth: 1.5, marginBottom: 30, height: 72 },
  messageInput: { borderRadius: 32, padding: 25, fontSize: 16, fontWeight: '600', borderWidth: 1.5, height: 200, marginBottom: 40 },
  submitBtn: { height: 75, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
  submitDisabled: { opacity: 0.2 },
  submitBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  securityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 45, opacity: 0.5 },
  securityNote: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }
});