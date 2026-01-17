import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, TextInput, Platform 
} from 'react-native';
import BottomSheet, { BottomSheetFlatList, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Search, Gem, UserPlus, UserCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Ecosystem
import { supabase } from '../lib/supabase';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface SocialItem {
  id: string;          
  slug: string; // 🛡️ Identity Fix: Using slug instead of username
  display_name?: string;       
  logo_url?: string;   
  subscription_plan?: 'none' | 'standard' | 'diamond';
  prestige_weight?: number;
}

interface SocialListProps {
  sheetRef: any;
  targetId: string;
  type: 'followers' | 'following';
}

/**
 * 🏰 SOCIAL LIST SHEET v80.5
 * Fixed: Replaced all username references with slug.
 * Language: Removed technical jargon for clear user understanding.
 */
export const SocialListSheet = ({ sheetRef, targetId, type }: SocialListProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SocialItem[]>([]);
  const [search, setSearch] = useState('');
  const [myFollows, setMyFollows] = useState<string[]>([]);

  const snapPoints = useMemo(() => ['65%', '94%'], []);

  useEffect(() => {
    if (targetId) {
      fetchSocialData();
      fetchMyFollows();
    }
  }, [targetId, type]);

  const fetchMyFollows = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('follows').select('seller_id').eq('follower_id', user.id);
    setMyFollows(data?.map(f => f.seller_id) || []);
  };

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      let query;
      // 🛡️ DATA FIX: username column removed, using slug
      if (type === 'followers') {
        query = supabase
          .from('follows')
          .select(`profile:follower_id(id, slug, display_name, logo_url, prestige_weight, subscription_plan)`)
          .eq('seller_id', targetId);
      } else {
        query = supabase
          .from('follows')
          .select(`profile:seller_id(id, slug, display_name, logo_url, prestige_weight, subscription_plan)`)
          .eq('follower_id', targetId);
      }

      const { data: res, error } = await query;
      if (error) throw error;

      const formatted = (res as any[]).map((item) => item.profile);
      setData(formatted);
    } catch (e) {
      console.error("Social List Sync Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === id) return;

    const isCurrentlyFollowing = myFollows.includes(id);
    
    if (isCurrentlyFollowing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMyFollows(prev => prev.filter(fid => fid !== id));
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('seller_id', id);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMyFollows(prev => [...prev, id]);
      await supabase.from('follows').insert({ follower_id: user.id, seller_id: id });
    }
  }, [myFollows]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 🛡️ FILTER FIX: Search via slug
      const name = item.slug || item.display_name || '';
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [data, search]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />,
    []
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: theme.border, width: 36 }}
      backgroundStyle={{ backgroundColor: theme.background, borderRadius: 45 }}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.surface }]}>
            <Text style={[styles.title, { color: theme.text }]}>
                {type === 'followers' ? 'Followers' : 'Following'}
            </Text>
        </View>
        
        <View style={[styles.searchWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={16} color={theme.subtext} />
          <TextInput 
            placeholder="Search connections..." 
            placeholderTextColor={theme.subtext}
            style={[styles.input, { color: theme.text }]} 
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.brand.emerald} />
            <Text style={[styles.loadingText, { color: theme.subtext }]}>LOADING LIST...</Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={filteredData}
            keyExtractor={(item: SocialItem) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: SocialItem }) => {
              const isFollowing = myFollows.includes(item.id);
              const isDiamond = item.subscription_plan === 'diamond';
              
              return (
                <View style={styles.userRow}>
                  <View style={[styles.avatarFrame, { backgroundColor: theme.background, borderColor: isDiamond ? Colors.brand.violet : theme.border }, isDiamond && styles.diamondHalo]}>
                    <Image 
                      source={{ uri: item.logo_url || 'https://via.placeholder.com/100' }} 
                      style={styles.avatar} 
                    />
                  </View>
                  
                  <View style={styles.userInfo}>
                    <View style={styles.labelRow}>
                      {/* 🛡️ DISPLAY FIX: Show slug as handle */}
                      <Text style={[styles.userName, { color: theme.text }]}>@{item.slug?.toUpperCase()}</Text>
                      {isDiamond && <Gem size={10} color={Colors.brand.violet} fill={Colors.brand.violet} />}
                    </View>
                    <Text style={[styles.userSub, { color: theme.subtext }]}>
                      {isDiamond ? 'Diamond Merchant' : 'Member'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, isFollowing ? { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border } : { backgroundColor: theme.text }]}
                    onPress={() => handleToggleFollow(item.id)}
                  >
                    {isFollowing ? (
                      <UserCheck size={14} color={theme.subtext} strokeWidth={3} />
                    ) : (
                      <UserPlus size={14} color={theme.background} strokeWidth={3} />
                    )}
                    <Text style={[styles.actionLabel, { color: isFollowing ? theme.subtext : theme.background }]}>
                      {isFollowing ? 'CONNECTED' : 'FOLLOW'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: 20, borderBottomWidth: 1.5, alignItems: 'center' },
  title: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', margin: 20, paddingHorizontal: 18, borderRadius: 16, height: 52, gap: 12, borderWidth: 1 },
  input: { flex: 1, fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 25, paddingBottom: 50 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 15 },
  avatarFrame: { padding: 2, borderRadius: 16, borderWidth: 1.5 },
  diamondHalo: { borderWidth: 2.5 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6' },
  userInfo: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userName: { fontSize: 13, fontWeight: '900' },
  userSub: { fontSize: 8, fontWeight: '800', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 
  },
  actionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  centered: { marginTop: 100, alignItems: 'center', gap: 15 },
  loadingText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 }
});