import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, TextInput, Platform, Animated
} from 'react-native';
import BottomSheet, { BottomSheetFlatList, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Search, Gem, UserPlus, UserCheck, X, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

// App Connection
import { supabase } from '../lib/supabase';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface SocialItem {
  id: string;          
  slug: string;
  full_name?: string;
  display_name?: string;       
  logo_url?: string;   
  subscription_plan?: 'none' | 'standard' | 'diamond';
  is_seller?: boolean;
  verification_status?: string;
}

interface SocialListProps {
  sheetRef: any;
  targetId: string;
  type: 'followers' | 'following';
}

/**
 * 🏰 SOCIAL LIST SHEET v84.0
 * Purpose: Viewing followers and following lists with a premium feel.
 * Sorting: Premium accounts and mutual connections appear at the top.
 */
export const SocialListSheet = ({ sheetRef, targetId, type }: SocialListProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SocialItem[]>([]);
  const [filteredData, setFilteredData] = useState<SocialItem[]>([]);
  const [search, setSearch] = useState('');
  const [myFollows, setMyFollows] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const snapPoints = useMemo(() => ['65%', '95%'], []);

  useEffect(() => {
    if (targetId) {
      initSocialList();
    }
  }, [targetId, type]);

  const initSocialList = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      await fetchMyFollows(user.id);
    }
    await fetchSocialData();
    setLoading(false);
  };

  const fetchMyFollows = async (uid: string) => {
    try {
      const { data: follows } = await supabase
        .from('follows')
        .select('seller_id')
        .eq('follower_id', uid);
      setMyFollows(follows?.map(f => f.seller_id) || []);
    } catch (e) { console.error("Failed to load your follows"); }
  };

  const fetchSocialData = async () => {
    try {
      const isFollowerQuery = type === 'followers';
      const foreignKey = isFollowerQuery ? 'seller_id' : 'follower_id';
      const joinKey = isFollowerQuery ? 'follower_id' : 'seller_id';

      const { data: res, error } = await supabase
        .from('follows')
        .select(`
          profile:${joinKey}(
            id, slug, full_name, display_name, logo_url, 
            subscription_plan, is_seller, verification_status
          )
        `)
        .eq(foreignKey, targetId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: SocialItem[] = (res as any[])
        .filter(item => item.profile !== null)
        .map(item => item.profile);
      
      /** 🛡️ RECOMMENDED SORTING: Premium & Connections first */
      const sorted = formatted.sort((a, b) => {
        const scoreA = (a.subscription_plan === 'diamond' ? 100 : 0) + (myFollows.includes(a.id) ? 50 : 0);
        const scoreB = (b.subscription_plan === 'diamond' ? 100 : 0) + (myFollows.includes(b.id) ? 50 : 0);
        return scoreB - scoreA;
      });

      setData(sorted);
      setFilteredData(sorted);
    } catch (e) { console.error("Connection Error"); }
  };

  /** 🔍 FILTER SEARCH RESULTS */
  useEffect(() => {
    const term = search.toLowerCase().trim();
    if (!term) {
      setFilteredData(data);
      return;
    }
    setFilteredData(data.filter(item => 
      item.slug?.toLowerCase().includes(term) || 
      item.display_name?.toLowerCase().includes(term)
    ));
  }, [search, data]);

  const handleToggleFollow = async (id: string) => {
    if (!currentUserId || currentUserId === id) return;
    const isCurrentlyFollowing = myFollows.includes(id);
    
    if (isCurrentlyFollowing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMyFollows(prev => prev.filter(fid => fid !== id));
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('seller_id', id);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMyFollows(prev => [...prev, id]);
      await supabase.from('follows').insert({ follower_id: currentUserId, seller_id: id });
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />,
    []
  );

  const formatName = (name?: string, display?: string) => {
    const activeName = display || name || 'Member';
    return activeName.toUpperCase();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: theme.border, width: 40 }}
      backgroundStyle={{ backgroundColor: theme.background, borderRadius: 45 }}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* HEADER AREA */}
        <View style={[styles.header, { borderBottomColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {type === 'followers' ? 'FOLLOWERS' : 'FOLLOWING'} ({data.length})
          </Text>
        </View>
        
        {/* SEARCH BAR */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={18} color={theme.subtext} strokeWidth={2.5} />
          <TextInput 
            placeholder={`Search ${type}...`} 
            placeholderTextColor={theme.subtext}
            style={[styles.input, { color: theme.text }]} 
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator color={Colors.brand.emerald} size="large" /></View>
        ) : (
          <BottomSheetFlatList
            data={filteredData}
            keyExtractor={(item : any) => `user-${item.id}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: any }) => {
              const isFollowing = myFollows.includes(item.id);
              const isDiamond = item.subscription_plan === 'diamond';
              const isMe = currentUserId === item.id;
              const isVerified = item.verification_status === 'verified';
              
              return (
                <TouchableOpacity 
                  style={styles.userRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    sheetRef.current?.close();
                    router.push(`/profile/${item.id}` as any);
                  }}
                >
                  <View style={[styles.avatarFrame, isDiamond && styles.diamondHalo]}>
                    <Image 
                      source={{ uri: item.logo_url || 'https://via.placeholder.com/100' }} 
                      style={styles.avatar} 
                    />
                  </View>
                  
                  <View style={styles.userInfo}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                        {formatName(item.full_name, item.display_name)}
                      </Text>
                      {isVerified && <CheckCircle2 size={12} color={Colors.brand.emerald} fill={Colors.brand.emerald} />}
                    </View>
                    
                    <View style={styles.handleRow}>
                      <Text style={[styles.userSub, { color: theme.subtext }]}>
                        @{item.slug}
                      </Text>
                      {isDiamond && <Gem size={10} color="#A78BFA" fill="#A78BFA" style={{ marginLeft: 4 }} />}
                      <Text style={[styles.userSub, { color: theme.subtext }]}>
                        {" "}• {isDiamond ? 'ELITE' : item.is_seller ? 'STORE' : 'MEMBER'}
                      </Text>
                    </View>
                  </View>
                  
                  {!isMe && (
                    <TouchableOpacity 
                      style={[
                        styles.actionBtn, 
                        isFollowing ? { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border } : { backgroundColor: theme.text }
                      ]}
                      onPress={() => handleToggleFollow(item.id)}
                    >
                      <Text style={[styles.actionLabel, { color: isFollowing ? theme.text : theme.background }]}>
                        {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isMe && (
                    <View style={[styles.actionBtn, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.actionLabel, { color: theme.subtext }]}>YOU</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>NO USERS FOUND</Text>
                <Text style={[styles.emptySub, { color: theme.subtext }]}>Try searching for a different name or handle.</Text>
              </View>
            }
          />
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: 25, borderBottomWidth: 1.5, alignItems: 'center' },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  searchWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    margin: 20, 
    paddingHorizontal: 18, 
    borderRadius: 20, 
    height: 54, 
    gap: 12, 
    borderWidth: 1.5 
  },
  input: { flex: 1, fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 25, paddingBottom: 100 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 15 },
  avatarFrame: { padding: 2, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent', overflow: 'hidden' },
  diamondHalo: { borderColor: '#8B5CF6', borderWidth: 2 },
  avatar: { width: 48, height: 48, borderRadius: 13, backgroundColor: '#F3F4F6' },
  userInfo: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  handleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  userName: { fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
  userSub: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', opacity: 0.7 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  emptySub: { fontSize: 12, fontWeight: '600', marginTop: 8 }
});