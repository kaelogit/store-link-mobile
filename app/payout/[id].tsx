import React from 'react';
import { 
  StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Share, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Landmark, Share2, ShieldCheck, 
  Copy, CheckCircle2, Clock 
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

// 💎 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

interface Payout {
  id: string;
  amount: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  reference: string;
  status: 'success' | 'pending' | 'failed';
  created_at: string;
}

/**
 * 🏰 PAYOUT DETAILS v1.1
 * Purpose: A high-fidelity receipt view for a specific bank transfer.
 * Logic: Fetches the detailed record using the ID from the URL.
 * Features: Copy Transaction ID and Share Receipt functionality.
 */
export default function PayoutDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];

  const { data: payout, isLoading } = useQuery<Payout>({
    queryKey: ['payout-detail', id],
    queryFn: async () => {
      if (!id) throw new Error("No payout ID provided");
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShare = async () => {
    if (!payout) return;
    try {
      await Share.share({
        message: `StoreLink Payout Receipt: ₦${payout.amount.toLocaleString()} to ${payout.bank_name}. ID: ${payout.reference}`,
      });
    } catch (error) {
      console.error("Sharing failed");
    }
  };

  if (isLoading || !payout) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
      </View>
    );
  }

  const isSuccess = payout.status === 'success';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>PAYMENT RECEIPT</Text>
        <TouchableOpacity onPress={handleShare} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Share2 color={theme.text} size={22} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        {/* RECEIPT CARD */}
        <View style={[styles.receiptCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statusSection}>
            <View style={[styles.statusIconHalo, { backgroundColor: isSuccess ? '#ECFDF5' : '#FFFBEB' }]}>
               {isSuccess ? (
                 <CheckCircle2 size={36} color={Colors.brand.emerald} strokeWidth={2.5} />
               ) : (
                 <Clock size={36} color="#F59E0B" strokeWidth={2.5} />
               )}
            </View>
            <Text style={[styles.amount, { color: theme.text }]}>₦{payout.amount.toLocaleString()}</Text>
            <Text style={[styles.statusLabel, { color: isSuccess ? Colors.brand.emerald : '#F59E0B' }]}>
              {payout.status.toUpperCase()}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* BANK DETAILS */}
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.metaLabel}>DESTINATION BANK</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{payout.bank_name}</Text>
            </View>
            <Landmark size={20} color={theme.subtext} />
          </View>

          <View style={styles.detailRow}>
            <View>
              <Text style={styles.metaLabel}>ACCOUNT NAME</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{payout.account_name.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View>
              <Text style={styles.metaLabel}>ACCOUNT NUMBER</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>****{payout.account_number.slice(-4)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* TRANSACTION INFO */}
          <View style={styles.detailRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>TRANSACTION ID</Text>
              <Text style={[styles.metaValue, { color: theme.text, fontSize: 12, letterSpacing: 0.5 }]}>{payout.reference}</Text>
            </View>
            <TouchableOpacity onPress={() => handleCopy(payout.reference)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Copy size={20} color={Colors.brand.emerald} />
            </TouchableOpacity>
          </View>

          <View style={styles.detailRow}>
            <View>
              <Text style={styles.metaLabel}>PAYMENT TIME</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>
                {format(new Date(payout.created_at), 'MMM dd, yyyy • h:mm a').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <ShieldCheck size={16} color={theme.subtext} />
          <Text style={[styles.footerText, { color: theme.subtext }]}>SECURE BANK TRANSFER RECORD</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { padding: 25 },
  
  receiptCard: { borderRadius: 32, padding: 30, borderWidth: 1.5 },
  statusSection: { alignItems: 'center', marginBottom: 30 },
  statusIconHalo: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  amount: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  statusLabel: { fontSize: 13, fontWeight: '900', marginTop: 10, letterSpacing: 1.5 },
  
  divider: { height: 1.5, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 25 },
  
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  metaLabel: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 6 },
  metaValue: { fontSize: 15, fontWeight: '700' },
  
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, opacity: 0.6 },
  footerText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }
});