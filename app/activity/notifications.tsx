import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    CheckCircle2,
    ChevronRight,
    Clock,
    Info,
    MessageSquare,
    ShieldAlert
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity
} from 'react-native';

// 🏛️ Sovereign Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 SYSTEM TERMINAL v93.1 (Pure Build Sovereign Edition)
 * Audited: Role-Targeted Broadcasts, Identity Integrity, and Section VI Protocols.
 */
export default function SystemTerminal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);

  useEffect(() => {
    fetchSystemTransmissions();
  }, [profile?.id]);

  /**
   * 📡 FETCH SYSTEM TRANSMISSIONS
   * Targeted signals based on Section I Identity (Seller/Buyer/All)
   */
  const fetchSystemTransmissions = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${profile.id},recipient_type.eq.ALL,recipient_type.eq.${profile.is_seller ? 'SELLERS' : 'BUYERS'}`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setNotifications(data || []);
    } catch (e) {
      console.error("Terminal Sync Conflict:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenNote = async (note: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNote(note);

    if (!note.is_read) {
      setNotifications(prev => prev.map(n => n.id === note.id ? {...n, is_read: true} : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', note.id);
    }
  };

  const initializeSupportTicket = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/activity/support-new');
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSystemTransmissions();
  }, [profile?.id]);

  if (loading && !refreshing) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {selectedNote ? (
          <TouchableOpacity onPress={() => setSelectedNote(null)} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
            <Text style={styles.backText}>NOTIFICATIONS</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inboxHeader}>
            <View>
              <Text style={styles.title}>NOTIFICATIONS</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>Official Network Signals</Text>
            </View>
            <TouchableOpacity onPress={initializeSupportTicket} style={[styles.supportCircle, { backgroundColor: theme.surface }]}>
               <ShieldAlert size={20} color={Colors.brand.emerald} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!selectedNote ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Bell size={32} color={theme.border} />
              </View>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>Monitoring the network...</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.noteRow, !item.is_read && { backgroundColor: theme.surface }, { borderBottomColor: theme.border }]} 
              onPress={() => handleOpenNote(item)}
            >
              <View style={[styles.iconCircle, 
                item.type === 'warning' ? { backgroundColor: '#FFFBEB' } : 
                item.type === 'success' ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#EFF6FF' }
              ]}>
                {item.type === 'warning' ? <AlertTriangle size={18} color="#F59E0B" strokeWidth={2.5} /> :
                 item.type === 'success' ? <CheckCircle2 size={18} color={Colors.brand.emerald} strokeWidth={2.5} /> :
                 <Info size={18} color="#3B82F6" strokeWidth={2.5} />}
              </View>

              <View style={styles.noteContent}>
                <View style={styles.noteTop}>
                  <Text style={[styles.noteTitle, { color: theme.subtext }, !item.is_read && { color: theme.text, fontWeight: '900' }]} numberOfLines={1}>
                    {item.title.toUpperCase()}
                  </Text>
                  <Text style={[styles.noteTime, { color: theme.subtext }]}>
                    {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.noteSnippet, { color: theme.subtext }]} numberOfLines={1}>{item.message}</Text>
              </View>
              <ChevronRight size={14} color={theme.border} strokeWidth={3} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.detailContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailMeta}>
              <Clock size={12} color={theme.subtext} strokeWidth={3} />
              <Text style={[styles.detailTime, { color: theme.subtext }]}>
                {new Date(selectedNote.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }).toUpperCase()}
              </Text>
            </View>
            
            <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedNote.title.toUpperCase()}</Text>
            <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
            <Text style={[styles.detailMessage, { color: theme.text }]}>{selectedNote.message}</Text>
          </View>

          <TouchableOpacity style={[styles.supportBtn, { backgroundColor: theme.text }]} onPress={initializeSupportTicket}>
            <MessageSquare color={theme.background} size={18} strokeWidth={2.5} />
            <Text style={[styles.supportBtnText, { color: theme.background }]}>CONTACT SUPPORT</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 25, paddingVertical: 20, paddingTop: 60, borderBottomWidth: 1.5 },
  inboxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  subtitle: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  supportCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent' },
  backText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  list: { paddingBottom: 60 },
  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 22, borderBottomWidth: 1, gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  noteContent: { flex: 1, backgroundColor: 'transparent' },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, backgroundColor: 'transparent' },
  noteTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  noteTime: { fontSize: 9, fontWeight: '900' },
  noteSnippet: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 120, gap: 20, backgroundColor: 'transparent' },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  emptyText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2.5 },
  detailContainer: { padding: 25 },
  detailCard: { borderRadius: 36, padding: 30, borderWidth: 1.5 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, backgroundColor: 'transparent' },
  detailTime: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  detailTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30 },
  detailDivider: { height: 1.5, marginVertical: 25 },
  detailMessage: { fontSize: 15, lineHeight: 26, fontWeight: '500' },
  supportBtn: { height: 64, borderRadius: 24, marginTop: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  supportBtnText: { fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }
});