import React, { useState } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, ShieldCheck, Info, 
  CreditCard, UserCheck, Zap, MessageSquare
} from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 RESOLUTION HUB v93.2 (Pure Build Sovereign Edition)
 * Audited: VII. Governance Protocols, Priority Routing, and Theme Handshake.
 */
export default function CreateSupportTicketScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();

  const [category, setCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: 'PAYMENT', label: 'Payment', icon: CreditCard, color: Colors.brand.emerald },
    { id: 'IDENTITY', label: 'Identity', icon: UserCheck, color: '#3B82F6' },
    { id: 'TECHNICAL', label: 'Technical', icon: Zap, color: Colors.brand.violet },
    { id: 'GENERAL', label: 'General', icon: Info, color: '#6B7280' },
  ];

  const handleSubmitTicket = async () => {
    if (!category || !subject.trim() || !message.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Incomplete Transmission", "Complete all protocols to initialize resolution.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 🛡️ TICKET INJECTION (Section VII Alignment)
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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Protocol Active", 
        "The resolution handshake is initialized. Support will contact you within 4 hours.",
        [{ text: "ACKNOWLEDGE", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Registry Error", e.message.toUpperCase());
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
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RESOLUTION HUB</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introBox}>
            <ShieldCheck size={42} color={Colors.brand.emerald} strokeWidth={2} />
            <Text style={styles.introTitle}>Direct Protocol</Text>
            <Text style={[styles.introSub, { color: theme.subtext }]}>
              Sovereign administrators are standing by to resolve identity or commercial friction.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>INQUIRY CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[
                    styles.catCard, 
                    { borderColor: theme.border },
                    isSelected && { borderColor: theme.text, backgroundColor: theme.surface }
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: isSelected ? theme.text : theme.surface }]}>
                    <Icon size={18} color={isSelected ? theme.background : cat.color} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.catText, { color: theme.subtext }, isSelected && { color: theme.text }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>SUBJECT</Text>
          <TextInput 
            style={[styles.subjectInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="Summarize the friction..."
            placeholderTextColor={theme.subtext}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.sectionLabel}>DETAILED TRANSMISSION</Text>
          <TextInput 
            style={[styles.messageInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            placeholder="Include order IDs, timestamps, or evidence context..."
            placeholderTextColor={theme.subtext}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: theme.text }, loading && styles.submitDisabled]} 
            onPress={handleSubmitTicket}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <>
                <MessageSquare size={18} color={theme.background} strokeWidth={2.5} />
                <Text style={[styles.submitBtnText, { color: theme.background }]}>INITIALIZE RESOLUTION</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.securityNote, { color: theme.subtext }]}>
            🛡️ ENCRYPTED VIA STORELINK CORE GOVERNANCE
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 15, paddingTop: 60, borderBottomWidth: 1.5 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  scrollContent: { padding: 25 },
  introBox: { alignItems: 'center', marginBottom: 40, backgroundColor: 'transparent' },
  introTitle: { fontSize: 28, fontWeight: '900', marginTop: 15, letterSpacing: -1 },
  introSub: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 22, fontWeight: '600' },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 2, marginBottom: 15 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 35, backgroundColor: 'transparent' },
  catCard: { width: (width - 62) / 2, padding: 18, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catText: { fontSize: 13, fontWeight: '800' },
  subjectInput: { borderRadius: 20, padding: 18, fontSize: 15, fontWeight: '700', borderWidth: 1.5, marginBottom: 25 },
  messageInput: { borderRadius: 28, padding: 22, fontSize: 15, fontWeight: '600', borderWidth: 1.5, height: 160, marginBottom: 35 },
  submitBtn: { height: 72, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  submitDisabled: { opacity: 0.2 },
  submitBtnText: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  securityNote: { textAlign: 'center', marginTop: 40, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }
});