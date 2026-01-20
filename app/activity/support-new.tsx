import React, { useState } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, Dimensions, Keyboard 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
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
 * 🏰 HELP CENTER v98.0
 * Purpose: Secure communication for account and payment help.
 * Logic: Pre-fills info if coming from a failed payout or order.
 */
export default function CreateSupportTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();
  const queryClient = useQueryClient();

  // 🛡️ AUTO-WIRING: Pre-fill category and subject if redirected
  const [category, setCategory] = useState<string | null>(params.category as string || null);
  const [subject, setSubject] = useState(params.subject as string || "");
  const [message, setMessage] = useState("");

  const categories = [
    { id: 'PAYMENT', label: 'PAYMENT', icon: CreditCard, color: Colors.brand.emerald },
    { id: 'IDENTITY', label: 'IDENTITY', icon: UserCheck, color: '#3B82F6' },
    { id: 'TECHNICAL', label: 'APP ISSUE', icon: Zap, color: '#8B5CF6' },
    { id: 'GENERAL', label: 'OTHER', icon: Info, color: '#6B7280' },
  ];

  /** 🛡️ SUBMISSION PROCESS */
  const ticketMutation = useMutation({
    mutationFn: async () => {
      if (!category || !subject.trim() || !message.trim()) {
        throw new Error("Please fill in all fields before sending.");
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
          // 🆕 Reference the specific transaction if applicable
          reference_id: params.refId || null 
        });

      if (error) throw error;
      return true;
    },
    onMutate: () => {
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['support-history'] }); 
      Alert.alert(
        "MESSAGE SENT", 
        "Our safety team has received your request. Expect a reply within 4 hours.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("SENDING FAILED", e.message.toUpperCase());
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>HELP CENTER</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
          <View style={styles.introBox}>
            <View style={[styles.introIconHalo, { backgroundColor: `${Colors.brand.emerald}15` }]}>
               <Headphones size={42} color={Colors.brand.emerald} strokeWidth={2.5} />
            </View>
            <Text style={[styles.introTitle, { color: theme.text }]}>Support Team</Text>
            <Text style={[styles.introSub, { color: theme.subtext }]}>
              Fast help for your payments, account safety, or technical issues.
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
                  style={[
                    styles.catCard, 
                    { backgroundColor: theme.surface, borderColor: isSelected ? theme.text : theme.border }
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: isSelected ? theme.text : theme.background }]}>
                    <Icon size={20} color={isSelected ? theme.background : cat.color} />
                  </View>
                  <Text style={[styles.catText, { color: isSelected ? theme.text : theme.subtext }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>SUBJECT</Text>
          <TextInput 
            style={[styles.subjectInput, { backgroundColor: theme.surface, color: theme.text }]}
            placeholder="What is this about?"
            placeholderTextColor={theme.subtext}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.sectionLabel}>MESSAGE</Text>
          <TextInput 
            style={[styles.messageInput, { backgroundColor: theme.surface, color: theme.text }]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={theme.subtext}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top" // Android fix
          />

          <TouchableOpacity 
            style={[
                styles.submitBtn, 
                { backgroundColor: theme.text }, 
                (!category || ticketMutation.isPending) && { opacity: 0.5 }
            ]} 
            onPress={() => ticketMutation.mutate()}
            disabled={ticketMutation.isPending || !category}
          >
            {ticketMutation.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text style={[styles.submitBtnText, { color: theme.background }]}>SEND REQUEST</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  
  scrollContent: { padding: 25 },
  
  introBox: { alignItems: 'center', marginBottom: 40 },
  introIconHalo: { width: 90, height: 90, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  introTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  introSub: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 22, fontWeight: '600', opacity: 0.6, paddingHorizontal: 20 },
  
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 15, marginLeft: 4 },
  
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 35 },
  catCard: { width: (width - 60) / 2, padding: 15, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  subjectInput: { borderRadius: 20, padding: 18, fontSize: 15, fontWeight: '600', marginBottom: 25 },
  messageInput: { borderRadius: 24, padding: 20, fontSize: 15, fontWeight: '500', height: 160, marginBottom: 35 },
  
  submitBtn: { height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  submitBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
});