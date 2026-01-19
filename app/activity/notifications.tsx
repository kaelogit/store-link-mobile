import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, ScrollView, Platform, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  AlertTriangle, ArrowLeft, Bell, CheckCircle2, 
  ChevronRight, Clock, Info, MessageSquare, 
  ShieldAlert, Zap
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 NOTIFICATIONS v96.0
 * Purpose: A central hub for important account alerts and system updates.
 * Logic: Uses smart caching to load instantly and updates status when a message is opened.
 * Visual: High-fidelity details for important alerts and helpful icons for categories.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();
  const queryClient = useQueryClient();

  const [selectedNote, setSelectedNote] = useState<any | null>(null);

  /** 📡 DATA SYNC: Fetching latest alerts */
  const { 
    data: notifications = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${profile.id},recipient_type.eq.ALL,recipient_type.eq.${profile.is_seller ? 'SELLERS' : 'BUYERS'}`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  /** 🛡️ MARK AS READ PROCESS */
  const readMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return supabase.from('notifications').update({ is_read: true }).eq('id', noteId);
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', profile?.id] });
      const previous = queryClient.getQueryData(['notifications', profile?.id]);
      
      // Update the screen instantly
      queryClient.setQueryData(['notifications', profile?.id], (old: any) => 
        old?.map((n: any) => n.id === noteId ? { ...n, is_read: true } : n)
      );
      
      return { previous };
    },
    onError: (err, noteId, context) => {
      queryClient.setQueryData(['notifications', profile?.id], context?.previous);
    }
  });

  const handleOpenNote = (note: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedNote(note);
    if (!note.is_read) readMutation.mutate(note.id);
  };

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  if (isLoading && notifications.length === 0) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={styles.loaderText}>CHECKING FOR UPDATES...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 📱 HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: insets.top + 10 }]}>
        {selectedNote ? (
          <TouchableOpacity onPress={() => setSelectedNote(null)} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
            <Text style={[styles.backText, { color: theme.text }]}>NOTIFICATIONS</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inboxHeader}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>INBOX</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>Latest System Alerts</Text>
            </View>
            <TouchableOpacity 
                onPress={() => router.push('/activity/support-new')} 
                style={[styles.supportCircle, { backgroundColor: theme.surface }]}
            >
              <ShieldAlert size={22} color={Colors.brand.emerald} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!selectedNote ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => `note-${item.id}`}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
          
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Bell size={32} color={theme.border} />
              </View>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>YOU ARE ALL CAUGHT UP</Text>
            </View>
          )}

          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[
                styles.noteRow, 
                !item.is_read && { backgroundColor: theme.surface + '80' }, 
                { borderBottomColor: theme.surface }
              ]} 
              onPress={() => handleOpenNote(item)}
            >
              <View style={[styles.iconCircle, 
                item.type === 'warning' ? { backgroundColor: '#FEF2F2' } : 
                item.type === 'success' ? { backgroundColor: '#ECFDF5' } : { backgroundColor: theme.surface }
              ]}>
                {item.type === 'warning' ? <AlertTriangle size={20} color="#EF4444" strokeWidth={2.5} /> :
                 item.type === 'success' ? <CheckCircle2 size={20} color={Colors.brand.emerald} strokeWidth={2.5} /> :
                 <Info size={20} color={theme.subtext} strokeWidth={2.5} />}
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
                <Text style={[styles.noteSnippet, { color: theme.subtext }, !item.is_read && { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                    {item.message}
                </Text>
              </View>
              {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: Colors.brand.emerald }]} />}
              <ChevronRight size={14} color={theme.border} strokeWidth={3} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.detailContainer, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailMeta}>
              <Clock size={12} color={theme.subtext} strokeWidth={3} />
              <Text style={[styles.detailTime, { color: theme.subtext }]}>
                {new Date(selectedNote.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }).toUpperCase()}
              </Text>
            </View>
            
            <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedNote.title.toUpperCase()}</Text>
            <View style={[styles.detailDivider, { backgroundColor: theme.border, opacity: 0.3 }]} />
            <Text style={[styles.detailMessage, { color: theme.text }]}>{selectedNote.message}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.supportBtn, { backgroundColor: theme.text }]} 
            onPress={() => router.push('/activity/support-new')}
          >
            <MessageSquare color={theme.background} size={20} strokeWidth={2.5} />
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
  loaderText: { marginTop: 15, fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.4 },
  header: { paddingHorizontal: 25, paddingBottom: 20, borderBottomWidth: 1.5 },
  inboxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  subtitle: { fontSize: 10, fontWeight: '800', marginTop: 4, opacity: 0.5 },
  supportCircle: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' },
  backText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  list: { paddingBottom: 60 },
  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 22, borderBottomWidth: 1.5, gap: 15 },
  iconCircle: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  noteContent: { flex: 1, backgroundColor: 'transparent' },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, backgroundColor: 'transparent' },
  noteTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  noteTime: { fontSize: 9, fontWeight: '900', opacity: 0.5 },
  noteSnippet: { fontSize: 13, fontWeight: '500' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 140, gap: 20, backgroundColor: 'transparent' },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  emptyText: { fontSize: 9, fontWeight: '900', letterSpacing: 2.5, opacity: 0.5 },
  detailContainer: { padding: 25 },
  detailCard: { borderRadius: 32, padding: 30, borderWidth: 1.5 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, backgroundColor: 'transparent' },
  detailTime: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  detailTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8, lineHeight: 32 },
  detailDivider: { height: 1.5, marginVertical: 30 },
  detailMessage: { fontSize: 16, lineHeight: 28, fontWeight: '500', opacity: 0.9 },
  supportBtn: { height: 70, borderRadius: 24, marginTop: 35, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 4 },
  supportBtnText: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5 }
});