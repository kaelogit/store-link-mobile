import React, { useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Dimensions, StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, MessageSquare, Clock, 
  CheckCircle2, AlertCircle, ChevronRight,
  Headphones
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

// 💎 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 SUPPORT HISTORY v1.1
 * Purpose: A transparent view of all help requests and their current progress.
 * Visual: High-fidelity status badges and clean typography.
 */
export default function SupportHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  /** 📡 TICKETS SYNC */
  const { 
    data: tickets = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['support-history', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('member_id', profile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const renderTicket = ({ item }: { item: any }) => {
    // 🎨 Status UI Config
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      OPEN: { color: '#3B82F6', icon: Clock, label: 'PENDING' },
      RESOLVED: { color: '#10B981', icon: CheckCircle2, label: 'RESOLVED' },
      CLOSED: { color: theme.subtext, icon: AlertCircle, label: 'CLOSED' },
    };

    const status = statusMap[item.status] || statusMap.OPEN;
    const StatusIcon = status.icon;

    return (
      <TouchableOpacity 
        style={[styles.ticketCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.selectionAsync();
          router.push({ pathname: '/activity/support-detail', params: { ticketId: item.id } });
        }}
      >
        <View style={styles.cardTop}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.background }]}>
            <Text style={[styles.categoryText, { color: theme.text }]}>{item.category || 'GENERAL'}</Text>
          </View>
          <View style={styles.statusRow}>
              <StatusIcon size={12} color={status.color} strokeWidth={3} />
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={[styles.subject, { color: theme.text }]} numberOfLines={1}>
          {item.subject.toUpperCase()}
        </Text>
        
        <Text style={[styles.messagePreview, { color: theme.subtext }]} numberOfLines={2}>
          {item.message}
        </Text>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.cardBottom}>
          <Text style={[styles.date, { color: theme.subtext }]}>
            LAST UPDATED: {format(new Date(item.updated_at), 'MMM dd').toUpperCase()}
          </Text>
          <ChevronRight size={16} color={theme.subtext} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={28} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>SUPPORT HISTORY</Text>
        <TouchableOpacity onPress={() => router.push('/activity/support-new')} style={styles.plusBtn}>
           <MessageSquare size={24} color={Colors.brand.emerald} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
        renderItem={renderTicket}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.surface }]}>
                 <Headphones size={40} color={theme.border} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>NO TICKETS YET</Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>
                Your help requests will appear here once you send them.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 100 }}>
                <ActivityIndicator color={Colors.brand.emerald} />
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  plusBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  
  listContent: { padding: 20 },
  
  ticketCard: { padding: 20, borderRadius: 28, borderWidth: 1.5, marginBottom: 15 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  subject: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 },
  messagePreview: { fontSize: 12, fontWeight: '600', lineHeight: 18, opacity: 0.7 },
  
  divider: { height: 1.5, marginVertical: 15, opacity: 0.5 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  emptySub: { fontSize: 12, fontWeight: '600', textAlign: 'center', opacity: 0.6 }
});