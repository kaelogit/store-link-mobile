import React, { useMemo, useRef, useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Dimensions, TextInput, Platform,
  Modal, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'; 
import { 
  Search, Zap, Trash2, CheckCheck, 
  Archive, User, ArchiveRestore, Gem, Inbox
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { BlurView } from 'expo-blur';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 MESSAGES HUB v103.0
 * Purpose: A high-speed inbox for managing customer and store conversations.
 * Features: Real-time chat previews, archive management, and premium user badges.
 */
export default function UnifiedInbox() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser } = useUserStore();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'archived'>('all');
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);

  /** 🛡️ UPDATING CHATS: Fetching latest conversations */
  const { 
    data: threads = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['inbox-threads', activeTab, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const isP1 = `participant_one.eq.${currentUser.id}`;
      const isP2 = `participant_two.eq.${currentUser.id}`;
      
      let query = supabase
        .from('conversations')
        .select(`
          *,
          seller:participant_one(id, display_name, logo_url, slug, subscription_plan, is_seller),
          buyer:participant_two(id, display_name, logo_url, slug, is_seller)
        `)
        .or(`${isP1},${isP2}`)
        .order('updated_at', { ascending: false });

      // Sort by the selected tab
      if (activeTab === 'all') {
        query = query.eq(isP1 ? 'is_archived_by_p1' : 'is_archived_by_p2', false).eq('is_request', false);
      } else if (activeTab === 'requests') {
        query = query.eq('is_request', true);
      } else if (activeTab === 'archived') {
        query = query.eq(isP1 ? 'is_archived_by_p1' : 'is_archived_by_p2', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Pre-load profile photos for the top 10 conversations
      data?.slice(0, 10).forEach((t: any) => {
        const partner = t.participant_one === currentUser.id ? t.buyer : t.seller;
        if (partner?.logo_url) Image.prefetch(partner.logo_url);
      });

      return data || [];
    },
    staleTime: 1000 * 60, 
  });

  /** 🛡️ INBOX CONTROLS: Managing specific chats */
  const handleAction = async (action: 'read' | 'archive' | 'delete' | 'unarchive') => {
    if (!selectedThread || !currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isP1 = selectedThread.participant_one === currentUser.id;
    
    // 1. Instant Updates: Refresh the screen immediately
    queryClient.setQueryData(['inbox-threads', activeTab, currentUser.id], (old: any) => {
      if (action === 'delete' || action === 'archive' || action === 'unarchive') {
        return old?.filter((t: any) => t.id !== selectedThread.id);
      }
      return old?.map((t: any) => {
        if (t.id === selectedThread.id && action === 'read') {
          return { ...t, [isP1 ? 'p1_unread_count' : 'p2_unread_count']: 0 };
        }
        return t;
      });
    });

    setShowOptions(false);

    // 2. Save changes to the account
    try {
      if (action === 'delete') {
        await supabase.from('conversations').delete().eq('id', selectedThread.id);
      } else {
        let updateData: any = {};
        if (action === 'read') updateData[isP1 ? 'p1_unread_count' : 'p2_unread_count'] = 0;
        if (action === 'archive') updateData[isP1 ? 'is_archived_by_p1' : 'is_archived_by_p2'] = true;
        if (action === 'unarchive') updateData[isP1 ? 'is_archived_by_p1' : 'is_archived_by_p2'] = false;
        
        await supabase.from('conversations').update(updateData).eq('id', selectedThread.id);
      }
    } catch (e) {
      refetch(); // Reload if something goes wrong
    }
  };

  const filteredThreads = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return threads;
    return threads.filter((t: any) => {
      const partner = t.participant_one === currentUser?.id ? t.buyer : t.seller;
      return partner?.display_name?.toLowerCase().includes(term) || 
             partner?.slug?.toLowerCase().includes(term) || 
             t.last_message?.toLowerCase().includes(term);
    });
  }, [threads, search, currentUser?.id]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MESSAGES</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
           <Zap size={22} color={Colors.brand.emerald} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
          <Search size={18} color={theme.subtext} strokeWidth={2.5} />
          <TextInput 
            placeholder="Search chats..." 
            placeholderTextColor={theme.subtext}
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {['all', 'requests', 'archived'].map((tab) => (
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
        keyExtractor={(item) => `thread-${item.id}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
        
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}

        renderItem={({ item }) => {
          const isMeP1 = item.participant_one === currentUser?.id;
          const partner = isMeP1 ? item.buyer : item.seller;
          const unreadCount = isMeP1 ? item.p1_unread_count : item.p2_unread_count;
          const isDiamond = partner?.subscription_plan === 'diamond';
          
          return (
            <TouchableOpacity 
              style={[styles.threadRow, { borderBottomColor: theme.surface }]}
              activeOpacity={0.7}
              onPress={() => router.push(`/chat/${item.id}` as any)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setSelectedThread(item);
                setShowOptions(true);
              }}
            >
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarBorder, isDiamond && { borderColor: '#8B5CF6', borderWidth: 2 }]}>
                   <Image 
                    source={partner?.logo_url || 'https://via.placeholder.com/150'} 
                    style={styles.avatar} 
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                   />
                </View>
                {isDiamond && (
                  <View style={[styles.diamondBadge, { backgroundColor: '#8B5CF6', borderColor: theme.background }]}>
                    <Zap size={8} color="white" fill="white" />
                  </View>
                )}
              </View>

              <View style={styles.threadInfo}>
                <View style={styles.threadHeader}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.partnerName, { color: theme.text }]} numberOfLines={1}>
                      {(partner?.display_name || partner?.slug || 'Member').toUpperCase()}
                    </Text>
                    {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />}
                  </View>
                  <Text style={[styles.timeText, { color: theme.subtext }]}>
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: false })}
                  </Text>
                </View>
                
                <Text style={[styles.lastMessage, { color: theme.subtext }, unreadCount > 0 && { color: theme.text, fontWeight: '800' }]} numberOfLines={1}>
                  {item.last_message || "Chat started..."}
                </Text>
              </View>

              {unreadCount > 0 && (
                <View style={[styles.unreadCounter, { backgroundColor: theme.text }]}>
                   <Text style={[styles.unreadCountText, { color: theme.background }]}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => {
          if (isLoading) return null;
          return (
            <View style={styles.emptyState}>
              <Inbox size={48} color={theme.border} strokeWidth={1} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>NO MESSAGES IN {activeTab.toUpperCase()}</Text>
            </View>
          );
        }}
      />

      {/* INBOX CONTROLS MODAL */}
      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.menuCard, { backgroundColor: theme.background, bottom: insets.bottom + 20 }]}>
            <Text style={[styles.menuTitle, { color: theme.subtext }]}>CHAT OPTIONS</Text>
            
            <MenuOption 
              icon={<User size={20} color={theme.text}/>} 
              label="View Profile" 
              onPress={() => { setShowOptions(false); router.push(`/profile/${selectedThread?.participant_one === currentUser?.id ? selectedThread?.buyer?.id : selectedThread?.seller?.id}`); }} 
              theme={theme} 
            />
            <MenuOption 
              icon={<CheckCheck size={20} color={theme.text}/>} 
              label="Mark as Read" 
              onPress={() => handleAction('read')} 
              theme={theme} 
            />
            <MenuOption 
              icon={activeTab === 'archived' ? <ArchiveRestore size={20} color="#F59E0B"/> : <Archive size={20} color="#F59E0B"/>} 
              label={activeTab === 'archived' ? "Move to Primary" : "Archive Chat"} 
              onPress={() => handleAction(activeTab === 'archived' ? 'unarchive' : 'archive')} 
              theme={theme} 
            />
            <View style={[styles.menuDivider, { backgroundColor: theme.surface }]} />
            <MenuOption 
              icon={<Trash2 size={20} color="#EF4444"/>} 
              label="Delete Chat" 
              onPress={() => handleAction('delete')} 
              theme={theme} 
              isLast 
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const MenuOption = ({ icon, label, onPress, theme, isLast }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.menuOption, isLast && { marginTop: 5 }]}>
    {icon}
    <Text style={[styles.menuLabel, { color: theme.text }, label === 'Delete Chat' && { color: '#EF4444' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 25, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  searchBarContainer: { paddingHorizontal: 25, marginTop: 5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, height: 54, gap: 12 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '700' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 25, gap: 24, marginTop: 20, borderBottomWidth: 1.5 },
  tab: { paddingBottom: 15, borderBottomWidth: 2.5, borderColor: 'transparent' },
  tabText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  listContent: { paddingHorizontal: 0 },
  threadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 25, borderBottomWidth: 1 },
  avatarContainer: { position: 'relative' },
  avatarBorder: { padding: 2, borderRadius: 20 },
  avatar: { width: 56, height: 56, borderRadius: 18 },
  diamondBadge: { position: 'absolute', bottom: -1, right: -1, width: 20, height: 20, borderRadius: 10, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  threadInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  partnerName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  timeText: { fontSize: 9, fontWeight: '800', opacity: 0.5 },
  lastMessage: { fontSize: 14, fontWeight: '500', opacity: 0.6 },
  unreadCounter: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  unreadCountText: { fontSize: 10, fontWeight: '900' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  menuCard: { borderRadius: 36, padding: 25, width: '100%', elevation: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
  menuTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 25, textAlign: 'center', opacity: 0.5 },
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 16 },
  menuLabel: { fontSize: 15, fontWeight: '900' },
  menuDivider: { height: 1.5, marginVertical: 5, width: '100%' },
  emptyState: { padding: 120, alignItems: 'center', gap: 18 },
  emptyText: { fontSize: 9, fontWeight: '900', letterSpacing: 2, opacity: 0.4 }
});