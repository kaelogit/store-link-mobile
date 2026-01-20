import React from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Gem } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// 🚀 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 PROFILE VIEWS v1.2
 * Purpose: High-fidelity list of store visitors with social cues.
 * Features: Online status, Diamond halos, and haptic feedback.
 */
export default function ProfileViewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  const { data: viewers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['profile-view-details', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('profile_views')
        .select('*, sender:viewer_id(id, slug, display_name, logo_url, last_seen_at, subscription_plan)')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    }
  });

  const renderViewer = ({ item }: { item: any }) => {
    const sender = item.sender;
    const isDiamond = sender?.subscription_plan === 'diamond';
    
    // 🟢 Online Logic: Active in last 5 minutes
    const isOnline = sender?.last_seen_at && 
      (new Date().getTime() - new Date(sender.last_seen_at).getTime()) / 60000 < 5;

    // Safe Date Parsing
    let timeAgo = 'Just now';
    try {
        timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true }).toUpperCase();
    } catch (e) {
        timeAgo = 'RECENTLY';
    }

    return (
      <TouchableOpacity 
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/profile/${sender.id}` as any);
        }}
      >
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarFrame, isDiamond && styles.diamondHalo, { backgroundColor: theme.surface }]}>
              <Image 
                source={sender.logo_url} 
                style={styles.avatar} 
                contentFit="cover" 
                transition={200}
                cachePolicy="memory-disk"
              />
          </View>
          {isOnline && <View style={[styles.onlineDot, { borderColor: theme.background }]} />}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {sender.display_name?.toUpperCase() || 'ANONYMOUS'}
            </Text>
            {isDiamond && <Gem size={12} color="#8B5CF6" fill="#8B5CF6" style={{ marginLeft: 4 }} />}
          </View>
          <Text style={[styles.slug, { color: theme.subtext }]}>
            @{sender.slug} • {timeAgo}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.viewBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push(`/profile/${sender.id}` as any)}
        >
           <Text style={[styles.viewBtnText, { color: theme.text }]}>VISIT</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* 📱 HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>VISITOR LOG</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={viewers}
        renderItem={renderViewer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.emerald} />}
        
        ListHeaderComponent={
          <View style={styles.listHeader}>
             <Text style={styles.listSub}>PEOPLE WHO VISITED YOUR STORE RECENTLY</Text>
          </View>
        }
        
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={[styles.emptyCircle, { backgroundColor: theme.surface }]}>
                 <Users size={40} color={theme.subtext} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No visitors yet</Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>
                When people check out your shop, they'll appear here.
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  list: { paddingHorizontal: 25 },
  listHeader: { paddingVertical: 30, alignItems: 'center' },
  listSub: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5 },
  
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  
  avatarWrapper: { position: 'relative' },
  avatarFrame: { width: 56, height: 56, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: '100%', height: '100%' },
  diamondHalo: { borderWidth: 2, borderColor: '#8B5CF6', padding: 2 },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2.5 },
  
  info: { flex: 1, marginLeft: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  slug: { fontSize: 10, fontWeight: '700', marginTop: 4, opacity: 0.6 },
  
  viewBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5 },
  viewBtnText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  empty: { alignItems: 'center', marginTop: 100 },
  emptyCircle: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '900', marginBottom: 8 },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', opacity: 0.5, paddingHorizontal: 40 }
});