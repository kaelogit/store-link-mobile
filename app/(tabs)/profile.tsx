import React, { useCallback, useRef, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  Dimensions, RefreshControl, Alert, Animated, TouchableOpacity, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  MoreVertical, ChevronUp, Package, Video, User, Plus, ChevronLeft, Gem
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { DrawerMenu } from '../../src/components/DrawerMenu';
import { SocialListSheet } from '../../src/components/SocialListSheet';
import { ProfileHeader } from '../../src/components/profile/ProfileHeader';
import { ProfileGridItem } from '../../src/components/profile/ProfileGridItem';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

/**
 * 🏰 UNIFIED PROFILE v103.0
 * Purpose: A central hub for users to view their store or personal profile.
 * Features: Fast-loading product grids, video reels, and private wishlists.
 * Visual: High-fidelity scrolling animations and premium brand indicators.
 */
export default function UnifiedProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { id: visitorId } = useLocalSearchParams();
  const { profile: myProfile, refreshUserData } = useUserStore();
  const queryClient = useQueryClient();
  
  const isSelf = !visitorId || visitorId === myProfile?.id;
  const targetId = (isSelf ? myProfile?.id : visitorId as string) || "";

  // UI States
  const [activeTab, setActiveTab] = useState<'drops' | 'reels' | 'wardrobe'>('drops');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [socialType, setSocialType] = useState<'followers' | 'following'>('followers');
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const socialSheetRef = useRef<any>(null);

  /** 🛡️ LOADING DATA: Fetching profile information */
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', targetId],
    queryFn: async () => {
      if (isSelf && myProfile) return myProfile;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', targetId).single();
      if (error) throw error;
      // Pre-load profile photo for speed
      if (data.logo_url) Image.prefetch(data.logo_url);
      return data;
    },
    staleTime: 1000 * 60 * 10, 
  });

  /** 🛡️ GRID VIEW: Fetching products, reels, or saved items */
  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems, isRefetching } = useQuery({
    queryKey: ['profile-content', targetId, activeTab],
    queryFn: async () => {
      let res;
      if (activeTab === 'drops') {
        res = await supabase.from('products').select('*').eq('seller_id', targetId).eq('is_active', true).order('created_at', { ascending: false });
      } else if (activeTab === 'reels') {
        res = await supabase.from('reels').select('*').eq('seller_id', targetId).order('created_at', { ascending: false });
      } else {
        res = await supabase.from('orders').select('*, order_items(*, product:product_id(*))').eq('user_id', targetId).eq('status', 'completed');
      }
      
      const flatData = activeTab === 'wardrobe' ? (res?.data || []).flatMap((o: any) => o.order_items) : (res?.data || []);
      
      // Pre-load images for the first row
      flatData.slice(0, 6).forEach((item: any) => {
        const url = activeTab === 'reels' ? item.thumbnail_url : (item.image_urls?.[0] || item.product?.image_urls?.[0]);
        if (url) Image.prefetch(url);
      });
      
      return flatData;
    },
    enabled: !!profileData,
  });

  /** 🛡️ QUICK FOLLOW: Instant updates for the follow button */
  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', targetId],
    queryFn: async () => {
      if (isSelf) return false;
      const { data } = await supabase.from('follows').select('created_at').eq('follower_id', myProfile?.id).eq('seller_id', targetId).maybeSingle();
      return !!data;
    },
    enabled: !isSelf && !!myProfile?.id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        return supabase.from('follows').delete().eq('follower_id', myProfile?.id).eq('seller_id', targetId);
      } else {
        return supabase.from('follows').insert({ follower_id: myProfile?.id, seller_id: targetId });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['is-following', targetId] });
      const previousState = isFollowing;
      queryClient.setQueryData(['is-following', targetId], !previousState);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return { previousState };
    },
    onError: (err, newState, context) => {
      queryClient.setQueryData(['is-following', targetId], context?.previousState);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', targetId] });
    }
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshUserData();
    refetchItems();
  }, [targetId, activeTab]);

  // ANIMATION LOGIC
  const clampedScrollY = Animated.diffClamp(scrollY, 0, 100);
  const navTranslateY = clampedScrollY.interpolate({ inputRange: [0, 100], outputRange: [0, -100], extrapolate: 'clamp' });
  const navOpacity = clampedScrollY.interpolate({ inputRange: [0, 50, 100], outputRange: [1, 0.8, 0], extrapolate: 'clamp' });
  const scrollTopOpacity = scrollY.interpolate({ inputRange: [400, 500], outputRange: [0, 1], extrapolate: 'clamp' });

  if (profileLoading) return (
    <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  const isDiamond = profileData?.subscription_plan === 'diamond';
  const isExpired = profileData?.subscription_status === 'expired';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 🏰 FLOATING NAVIGATION */}
      <Animated.View style={[styles.floatingNav, { transform: [{ translateY: navTranslateY }], opacity: navOpacity, paddingTop: insets.top }]}>
        <View style={styles.navActionRow}>
          <TouchableOpacity style={styles.navButton} onPress={() => (isSelf ? router.push('/seller/post-product') : router.back())}>
            {isSelf ? <Plus color={theme.text} size={24} strokeWidth={2.5} /> : <ChevronLeft color={theme.text} size={26} strokeWidth={2.5} />}
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{profileData?.slug?.toUpperCase()}</Text>
            {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />}
          </View>
          <TouchableOpacity style={styles.navButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsMenuOpen(true); }}>
            <MoreVertical color={theme.text} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <AnimatedFlatList
        ref={flatListRef}
        data={items}
        numColumns={activeTab === 'drops' ? 2 : 3}
        key={activeTab + (activeTab === 'drops' ? '2col' : '3col')}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListHeaderComponent={
          <View style={[styles.headerTop, { paddingTop: insets.top + 60 }]}>
            <ProfileHeader 
              profileData={profileData} isSelf={isSelf} isFollowing={isFollowing} onFollow={() => followMutation.mutate()}
              onEdit={() => router.push('/profile/edit')} onMessage={() => router.push(`/chat/${targetId}`)}
              theme={theme} isDiamond={isDiamond} isExpired={isExpired} router={router} socialSheetRef={socialSheetRef} setSocialType={setSocialType}
            />
            
            {/* 🛡️ TAB SYSTEM */}
            <View style={styles.tabContainer}>
              {profileData?.is_seller && (isSelf || !isExpired) && (
                <TabButton icon={Package} label="Items" active={activeTab === 'drops'} theme={theme} onPress={() => setActiveTab('drops')} />
              )}
              {profileData?.is_seller && (isSelf || !isExpired) && (
                <TabButton icon={Video} label="Videos" active={activeTab === 'reels'} theme={theme} onPress={() => setActiveTab('reels')} />
              )}
              <TabButton icon={User} label="Saved" active={activeTab === 'wardrobe'} theme={theme} onPress={() => setActiveTab('wardrobe')} locked={!isSelf && profileData?.is_wardrobe_private} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <ProfileGridItem item={item} type={activeTab} theme={theme} router={router} index={index} activeTab={activeTab} />
        )}
        ListEmptyComponent={() => !itemsLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{activeTab === 'drops' ? '📦' : activeTab === 'reels' ? '🎥' : '👕'}</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: theme.subtext }]}>{isSelf ? `Add your first ${activeTab} to your profile` : 'This user has not posted any items yet.'}</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
        contentContainerStyle={styles.listContent}
      />

      {/* 🚀 SCROLL TO TOP */}
      <Animated.View style={[styles.scrollTopBtn, { opacity: scrollTopOpacity, transform: [{ scale: scrollTopOpacity }] }]}>
        <TouchableOpacity 
          style={[styles.scrollTopInner, { backgroundColor: isDiamond ? '#8B5CF6' : theme.text }]} 
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        >
          <ChevronUp color={theme.background} size={28} strokeWidth={3} />
        </TouchableOpacity>
      </Animated.View>

      <DrawerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} isSeller={isSelf && profileData?.is_seller} />
      <SocialListSheet sheetRef={socialSheetRef} targetId={targetId} type={socialType} />
    </View>
  );
}

const TabButton = ({ icon: Icon, label, active, onPress, theme, locked }: any) => (
  <TouchableOpacity onPress={() => !locked && onPress()} style={[styles.tabButton, active && { backgroundColor: theme.text, borderColor: theme.text }, locked && styles.lockedTab]}>
    <Icon size={16} color={active ? theme.background : (locked ? theme.border : theme.subtext)} strokeWidth={active ? 3 : 2} />
    <Text style={[styles.tabLabel, { color: active ? theme.background : (locked ? theme.border : theme.subtext) }]}>
      {label.toUpperCase()}{locked && ' 🔒'}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingNav: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1001, backgroundColor: 'transparent' },
  navActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 10 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  navButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTop: { width: '100%' },
  tabContainer: { flexDirection: 'row', gap: 10, marginVertical: 25, paddingHorizontal: 20 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent' },
  lockedTab: { opacity: 0.4 },
  tabLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 15 },
  emptyTitle: { fontSize: 14, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  emptySub: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18, opacity: 0.6 },
  listContent: { paddingBottom: 150 },
  scrollTopBtn: { position: 'absolute', bottom: 30, right: 25, zIndex: 1000 },
  scrollTopInner: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
});