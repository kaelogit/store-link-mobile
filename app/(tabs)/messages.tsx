import React, { useMemo, useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  Dimensions, TextInput, Modal, RefreshControl, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { 
  Search, Zap, Trash2, Gem, 
  MessageSquare, ChevronRight, Store
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
import { Profile } from '../../src/types';

const { width } = Dimensions.get('window');

/**
 * 🏰 UNIFIED INBOX v113.0
 * Purpose: Central communication hub for all trade negotiations.
 * Features: Diamond Glow UX, Auto-Refresh on Focus, and Role Detection.
 */
export default function UnifiedInbox() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser } = useUserStore();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);

  /** 📡 DATA SYNC: Optimized for Unified Subscription */
  const { 
    data: threads = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['inbox-threads', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          seller:seller_id(id, display_name, slug, logo_url, subscription_plan, is_seller),
          buyer:buyer_id(id, display_name, slug, logo_url, subscription_plan, is_seller)
        `)
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id, // Only run if user is logged in
  });

  // ⚡ AUTO-REFRESH: Updates inbox whenever screen comes into focus (e.g. back from chat)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleAction = async (action: 'delete') => {
    if (!selectedThread) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowOptions(false);

    try {
      await supabase.from('chats').delete().eq('id', selectedThread.id);
      // Optimistic update
      queryClient.setQueryData(['inbox-threads', currentUser?.id], (old: any) => 
        old.filter((t: any) => t.id !== selectedThread.id)
      );
    } catch (e) {
      console.error("Delete failed");
      refetch(); // Revert on fail
    }
  };

  const filteredThreads = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return threads;
    return threads.filter((t: any) => {
      const partner = t.buyer_id === currentUser?.id ? t.seller : t.buyer;
      return partner?.display_name?.toLowerCase().includes(term) || 
             partner?.slug?.toLowerCase().includes(term) ||
             t.last_message?.toLowerCase().includes(term);
    });
  }, [threads, search, currentUser?.id]);

  const renderThread = ({ item }: { item: any }) => {
    // 🛡️ Safe Partner Logic
    const partner: Partial<Profile> = item.buyer_id === currentUser?.id ? item.seller : item.buyer;
    const isDiamond = partner?.subscription_plan === 'diamond';
    const isSellerPartner = partner?.is_seller; // Are we talking to a shop?

    // Safeguard against deleted users
    if (!partner) return null;

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        style={[
          styles.threadRow, 
          { borderBottomColor: theme.surface },
          isDiamond && { backgroundColor: `${Colors.brand.violet}08` }
        ]}
        onPress={() => router.push(`/chat/${item.id}`)}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setSelectedThread(item);
          setShowOptions(true);
        }}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarBorder, isDiamond && styles.diamondHalo]}>
             <Image 
              source={partner.logo_url || 'https://via.placeholder.com/150'} 
              style={styles.avatar}
              transition={200}
              contentFit="cover"
             />
          </View>
          {isDiamond && (
            <View style={[styles.gemBadge, { backgroundColor: theme.background }]}>
              <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />
            </View>
          )}
        </View>

        <View style={styles.threadInfo}>
          <View style={styles.threadHeader}>
            <View style={styles.nameRow}>
              <Text style={[styles.partnerName, { color: theme.text }]} numberOfLines={1}>
                {partner.display_name?.toUpperCase() || 'MEMBER'}
              </Text>
              {isSellerPartner && (
                <View style={styles.sellerTag}>
                   <Store size={8} color="#10B981" />
                   <Text style={styles.sellerTagText}>SHOP</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timeText, { color: theme.subtext }]}>
              {formatDistanceToNow(new Date(item.updated_at), { addSuffix: false }).replace('about ', '')}
            </Text>
          </View>
          
          <View style={styles.lastMsgRow}>
            <Text 
              style={[
                styles.lastMessage, 
                { color: item.unread_count > 0 ? theme.text : theme.subtext, fontWeight: item.unread_count > 0 ? '700' : '500' }
              ]} 
              numberOfLines={1}
            >
              {item.last_message || "Start a conversation..."}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                 <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 📱 PREMIUM HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>MESSAGES</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.surface }]}>
             <Text style={[styles.countText, { color: theme.text }]}>{threads.length}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.zapBtn}>
           <Zap size={20} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
        </TouchableOpacity>
      </View>

      {/* 🔍 SEARCH */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Search size={18} color={theme.subtext} strokeWidth={2.5} />
          <TextInput 
            placeholder="Search names or messages..." 
            placeholderTextColor={theme.subtext + '80'}
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            selectionColor={Colors.brand.emerald}
          />
        </View>
      </View>

      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        renderItem={renderThread}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color={theme.surface} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your inbox is empty</Text>
            <Text style={[styles.emptySub, { color: theme.subtext }]}>
              Conversations with sellers and buyers will appear here.
            </Text>
          </View>
        }
      />

      {/* 🎭 OPTIONS MODAL */}
      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowOptions(false)} activeOpacity={1}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} />
          <View style={[styles.menuCard, { backgroundColor: theme.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.menuHandle} />
            <TouchableOpacity style={styles.menuOption} onPress={() => handleAction('delete')}>
              <View style={styles.deleteCircle}>
                <Trash2 size={20} color="#FF3B30"/>
              </View>
              <Text style={styles.deleteText}>Delete Conversation</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 25, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '900' },
  zapBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { paddingHorizontal: 25, marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, height: 52, gap: 12 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600' },
  
  listContent: { paddingVertical: 5 },
  threadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 25, borderBottomWidth: 1 },
  avatarContainer: { position: 'relative' },
  avatarBorder: { padding: 2, borderRadius: 22, borderWidth: 1.5, borderColor: 'transparent' },
  diamondHalo: { borderColor: '#8B5CF6' },
  avatar: { width: 56, height: 56, borderRadius: 20 },
  gemBadge: { position: 'absolute', bottom: -2, right: -2, borderRadius: 8, padding: 4, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  
  threadInfo: { flex: 1, marginLeft: 16 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  partnerName: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  sellerTag: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerTagText: { fontSize: 8, fontWeight: '900', color: '#10B981' },
  timeText: { fontSize: 10, fontWeight: '700', opacity: 0.4 },
  
  lastMsgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, flex: 1, marginRight: 10 },
  unreadBadge: { backgroundColor: '#10B981', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: 'white', fontSize: 10, fontWeight: '900' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  menuCard: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  menuHandle: { width: 40, height: 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)', alignSelf: 'center', marginBottom: 20 },
  menuOption: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 10 },
  deleteCircle: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FF3B3010', justifyContent: 'center', alignItems: 'center' },
  deleteText: { color: '#FF3B30', fontWeight: '900', fontSize: 15 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 50 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 20, marginBottom: 10 },
  emptySub: { fontSize: 14, fontWeight: '500', textAlign: 'center', opacity: 0.5, lineHeight: 20 }
});