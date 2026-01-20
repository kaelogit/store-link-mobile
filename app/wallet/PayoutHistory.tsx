import React from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

// App Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

interface PayoutItem {
  id: string;
  amount: number;
  status: 'processing' | 'success' | 'failed' | 'pending'; // Updated to match DB likely values
  created_at: string;
  bank_name?: string;
  reference?: string;
}

interface PayoutHistoryProps {
  payouts: PayoutItem[];
}

/**
 * 🏰 PAYOUT HISTORY v1.2
 * Purpose: Provides a clear, audited list of cash withdrawals.
 * Logic: Uses status badges to communicate real-time bank progress.
 * Interaction: Tapping a row opens the detailed Receipt view.
 */
export const PayoutHistory = ({ payouts }: PayoutHistoryProps) => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];

  const renderItem = ({ item }: { item: PayoutItem }) => {
    // 🎨 Status Color Mapping
    const statusConfig = {
      pending: { color: '#F59E0B', icon: Clock, label: 'PENDING' },
      processing: { color: '#F59E0B', icon: Clock, label: 'PROCESSING' },
      success: { color: '#10B981', icon: CheckCircle2, label: 'PAID' },
      failed: { color: '#EF4444', icon: AlertCircle, label: 'FAILED' },
    };

    // Fallback to processing if status is unknown
    const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.processing;
    const StatusIcon = config.icon;

    return (
      <TouchableOpacity 
        style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.selectionAsync();
          router.push({ pathname: '/payout/[id]', params: { id: item.id } });
        }}
      >
        <View style={styles.leftSection}>
          <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
            <ArrowUpRight size={18} color={theme.text} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={[styles.amount, { color: theme.text }]}>₦{item.amount.toLocaleString()}</Text>
            <Text style={[styles.bankInfo, { color: theme.subtext }]}>
                {item.bank_name || 'Bank Transfer'}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={[styles.statusBadge, { backgroundColor: `${config.color}15` }]}>
            <StatusIcon size={10} color={config.color} strokeWidth={3} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={[styles.date, { color: theme.subtext }]}>
            {format(new Date(item.created_at), 'MMM dd')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={payouts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false} // Usually nested inside a larger scroll view
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
            NO WITHDRAWAL HISTORY
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  list: { paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  amount: { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  bankInfo: { fontSize: 11, fontWeight: '700', marginTop: 2, opacity: 0.6 },
  
  rightSection: { alignItems: 'flex-end', gap: 6 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  date: { fontSize: 10, fontWeight: '700', opacity: 0.5 },
  
  empty: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },
});