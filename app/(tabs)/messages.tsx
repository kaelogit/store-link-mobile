import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Dimensions, TextInput, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; // 🛠️ Added useFocusEffect
import { 
  ShoppingBag, ChevronRight, Search, 
  Zap, Inbox
} from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';

// Components
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 UNIFIED INBOX v85.0
 * Fixed: Auto-sync on focus for real-time identity updates.
 * Audited: Clean UI hierarchy and partner name persistence.
 */
export default function UnifiedInbox() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile: currentUser } = useUserStore();
  
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'business' | 'social'>('all');
  const [search, setSearch] = useState("");
  const isMounted = useRef(true);

  /** 🛠️ AUTO-SYNC: Refreshes threads when user navigates to Inbox */
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        fetchThreads();
      }
      return () => {};
    }, [currentUser?.id])
  );

  useEffect(() => {
    isMounted.current = true;
    fetchThreads();
    
    const channel = supabase
      .channel('inbox_live_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations'
      }, () => {
        if (isMounted.current) fetchThreads();
      })
      .subscribe();

    return () => { 
      isMounted.current = false;
      supabase.removeChannel(channel); 
    };
  }, [currentUser?.id]);

  const fetchThreads = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          seller:participant_one(id, display_name, logo_url, slug, subscription_plan),
          buyer:participant_two(id, display_name, logo_url, slug)
        `)
        .or(`participant_one.eq.${currentUser.id},participant_two.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (isMounted.current) setThreads(data || []);
    } catch (e) {
      console.error("Inbox Sync Error:", e);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const isBusiness = t.product_id !== null || t.order_id !== null;
      const matchesTab = 
        activeTab === 'all' ? true : 
        activeTab === 'business' ? isBusiness : !isBusiness;

      const partner = t.participant_one === currentUser?.id ? t.buyer : t.seller;
      const partnerName = partner?.display_name || partner?.slug || '';
      
      const matchesSearch = 
        partnerName.toLowerCase().includes(search.toLowerCase()) || 
        (t.last_message && t.last_message.toLowerCase().includes(search.toLowerCase()));

      return matchesTab && matchesSearch;
    });
  }, [threads, activeTab, search, currentUser?.id]);

  if (loading && threads.length === 0) return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🏛️ HEADER */}
      <View style={styles.header}>
        <View style={{ backgroundColor: 'transparent' }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>CHAT</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerSub}>NETWORK ACTIVE</Text>
          </View>
        </View>
        
      
      </View>

      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Search size={16} color={theme.subtext} />
          <TextInput 
            placeholder="Search messages..." 
            placeholderTextColor={theme.subtext}
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {['all', 'business', 'social'].map((tab) => (
          <TouchableOpacity 
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setActiveTab(tab as any);
            }}
            style={[styles.tab, activeTab === tab && { borderBottomColor: theme.text }]}
          >
            <Text style={[styles.tabText, { color: theme.subtext }, activeTab === tab && { color: theme.text }]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Inbox size={32} color={theme.subtext} strokeWidth={1} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Messages</Text>
            <Text style={styles.emptySub}>Your conversations will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMeParticipantOne = item.participant_one === currentUser?.id;
          const partner = isMeParticipantOne ? item.buyer : item.seller;
          const partnerIsDiamond = partner?.subscription_plan === 'diamond';
          
          return (
            <TouchableOpacity 
              style={[styles.threadRow, { borderBottomColor: theme.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/chat/${item.id}`);
              }}
            >
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarBorder, partnerIsDiamond && { borderColor: Colors.brand.violet, borderWidth: 2 }]}>
                   <Image 
                    source={{ uri: partner?.logo_url || 'https://via.placeholder.com/150' }} 
                    style={styles.avatar} 
                   />
                </View>
                {partnerIsDiamond && (
                  <View style={[styles.diamondBadge, { backgroundColor: Colors.brand.violet, borderColor: theme.background }]}>
                    <Zap size={8} color="white" fill="white" />
                  </View>
                )}
              </View>

              <View style={styles.threadInfo}>
                <View style={styles.threadHeader}>
                  <Text style={[styles.partnerName, { color: theme.text }]} numberOfLines={1}>
                    {(partner?.display_name || partner?.slug || 'Member').toUpperCase()}
                  </Text>
                  <Text style={[styles.timeText, { color: theme.subtext }]}>
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: false })}
                  </Text>
                </View>
                
                <Text style={[styles.lastMessage, { color: theme.subtext }, item.unread_count > 0 && { color: theme.text, fontWeight: '800' }]} numberOfLines={1}>
                  {item.last_message || "New message sequence..."}
                </Text>

                <View style={styles.tagRow}>
                   {item.product_id && (
                     <View style={[styles.productBadge, { backgroundColor: theme.surface }]}>
                        <ShoppingBag size={10} color={theme.text} />
                        <Text style={[styles.productBadgeText, { color: theme.text }]}>PRODUCT</Text>
                     </View>
                   )}
                   {item.order_id && (
                     <View style={[styles.dealBadge, { backgroundColor: Colors.brand.emerald + '15' }]}>
                        <Zap size={10} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
                        <Text style={[styles.dealBadgeText, { color: Colors.brand.emerald }]}>ORDER</Text>
                     </View>
                   )}
                </View>
              </View>

              {item.unread_count > 0 && (
                <View style={[styles.unreadCounter, { backgroundColor: theme.text }]}>
                   <Text style={[styles.unreadCountText, { color: theme.background }]}>{item.unread_count}</Text>
                </View>
              )}
              {!item.unread_count && <ChevronRight size={16} color={theme.border} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: 'transparent' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  headerSub: { fontSize: 9, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1 },
  miniLogo: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  miniLogoText: { fontSize: 12, fontWeight: '900' },
  searchBarContainer: { paddingHorizontal: 25, marginTop: 15, backgroundColor: 'transparent' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '700' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 25, gap: 20, marginTop: 20, borderBottomWidth: 1, backgroundColor: 'transparent' },
  tab: { paddingBottom: 15, borderBottomWidth: 2, borderColor: 'transparent' },
  tabText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  listContent: { paddingBottom: 120 },
  threadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 25, borderBottomWidth: 1, backgroundColor: 'transparent' },
  avatarContainer: { position: 'relative' },
  avatarBorder: { padding: 2, borderRadius: 20, borderColor: 'transparent' },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#F3F4F6' },
  diamondBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  threadInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  partnerName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  timeText: { fontSize: 10, fontWeight: '800' },
  lastMessage: { fontSize: 13, fontWeight: '500' },
  unreadCounter: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  unreadCountText: { fontSize: 10, fontWeight: '900' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  productBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  productBadgeText: { fontSize: 8, fontWeight: '900' },
  dealBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dealBadgeText: { fontSize: 8, fontWeight: '900' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  emptySub: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' }
});