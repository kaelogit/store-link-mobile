import React, { useCallback, useRef, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  Dimensions, RefreshControl, Animated, TouchableOpacity, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  MoreVertical, Package, Video, User, Plus, ChevronLeft, Gem, Lock
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { DrawerMenu } from '../../src/components/DrawerMenu';
import { SocialListSheet } from '../../src/components/SocialListSheet';
import { ProfileHeader } from '../../src/components/profile/ProfileHeader';
import { ProfileGridItem } from '../../src/components/profile/ProfileGridItem';

// 🆕 INTEGRATED COMPONENTS
import { StatusBanner } from '../../src/components/profile/StatusBanner';
import { ShareStore } from '../../src/components/profile/ShareStore';

import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

interface TabButtonProps {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
  theme: any;
  locked?: boolean;
}

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
  const [bioExpanded, setBioExpanded] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const socialSheetRef = useRef<any>(null);

  /** 🛡️ BIO TRUNCATION LOGIC: Internal fix for ProfileHeader crash */
  const BIO_LIMIT = 85;

  /** 👁️ ENGAGEMENT ENGINE: Record Profile View */
  useEffect(() => {
    const recordProfileVisit = async () => {
      if (isSelf || !targetId || !myProfile?.id) return;
      await supabase.from('profile_views').insert({
        viewer_id: myProfile.id,
        profile_id: targetId,
        view_date: new Date().toISOString().split('T')[0]
      });
    };
    recordProfileVisit();
  }, [targetId, isSelf]);

  /** 📡 DATA SYNC */
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', targetId],
    queryFn: async () => {
      if (!targetId) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', targetId).single();
      if (error) throw error;
      if (data.logo_url) Image.prefetch(data.logo_url);
      return data;
    },
    enabled: !!targetId,
    staleTime: 1000 * 60 * 5, 
  });

  /** 📡 CHAT HANDSHAKE */
  const handleOpenChat = async () => {
    if (isSelf || !targetId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { data: chat } = await supabase.from('chats').upsert({ 
        buyer_id: myProfile?.id, 
        seller_id: targetId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'buyer_id,seller_id' }).select().single();
    if (chat) router.push(`/chat/${chat.id}`);
  };

  const isDiamond = profileData?.subscription_plan === 'diamond';
  const isExpired = profileData?.subscription_status === 'expired';
  const isWardrobePrivate = !isSelf && profileData?.is_wardrobe_private;
  const bioNeedsTruncation = (profileData?.bio?.length || 0) > BIO_LIMIT;

  /** 📡 CONTENT SYNC */
  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems, isRefetching } = useQuery({
    queryKey: ['profile-content', targetId, activeTab],
    queryFn: async () => {
      if (!targetId) return [];
      if (activeTab === 'wardrobe' && isWardrobePrivate) return [];

      let res;
      if (activeTab === 'drops') {
        res = await supabase.from('products').select('*').eq('seller_id', targetId).eq('is_active', true).order('created_at', { ascending: false });
      } else if (activeTab === 'reels') {
        res = await supabase.from('reels').select('*').eq('seller_id', targetId).order('created_at', { ascending: false });
      } else {
        res = await supabase.from('wishlists').select('*, product:product_id(*)').eq('user_id', targetId);
      }
      
      if (activeTab === 'wardrobe') {
         return (res?.data || []).map((w: any) => w.product).filter(Boolean);
      }
      return res?.data || [];
    },
    enabled: !!profileData,
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshUserData();
    queryClient.invalidateQueries({ queryKey: ['profile', targetId] });
    refetchItems();
  }, [targetId, refreshUserData, queryClient, refetchItems]);

  if (profileLoading) return (
    <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 🏰 NAVIGATION BAR */}
      <Animated.View style={[styles.floatingNav, { paddingTop: insets.top }]}>
        <BlurView intensity={80} tint={theme.background === '#000' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.navActionRow}>
          <TouchableOpacity style={styles.navButton} onPress={() => (isSelf ? router.push('/seller/post-product') : router.back())}>
            {isSelf ? <Plus color={theme.text} size={24} strokeWidth={2.5} /> : <ChevronLeft color={theme.text} size={26} strokeWidth={2.5} />}
          </TouchableOpacity>
          <Animated.View style={[styles.headerTitleContainer, { opacity: headerOpacity }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{profileData?.slug?.toUpperCase()}</Text>
            {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" style={{ marginLeft: 4 }} />}
          </Animated.View>
          <TouchableOpacity style={styles.navButton} onPress={() => setIsMenuOpen(true)}>
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
        ListHeaderComponent={
          <View style={[styles.headerTop, { paddingTop: insets.top + 60 }]}>
            <ProfileHeader 
              profileData={profileData} isSelf={isSelf} 
              onEdit={() => router.push('/profile/edit')} 
              onMessage={handleOpenChat}
              theme={theme} isDiamond={isDiamond} router={router} socialSheetRef={socialSheetRef} setSocialType={setSocialType}
              bioExpanded={bioExpanded} setBioExpanded={setBioExpanded}
              bioNeedsTruncation={bioNeedsTruncation}
              formatNumber={(n: number) => n.toLocaleString()}
              getTruncatedBio={() => profileData?.bio?.substring(0, BIO_LIMIT).trim() + "..."}
              isFollowing={false} // Connect your follow status logic here
              onFollow={() => {}} // Connect your follow function here
            />
            <StatusBanner isOnline={profileData?.is_store_open} />
            {isSelf && <ShareStore slug={profileData?.slug} displayName={profileData?.display_name} />}
            <View style={styles.tabContainer}>
              {profileData?.is_seller && (isSelf || !isExpired) && (
                <TabButton icon={Package} label="Items" active={activeTab === 'drops'} theme={theme} onPress={() => setActiveTab('drops')} />
              )}
              {profileData?.is_seller && (isSelf || !isExpired) && (
                <TabButton icon={Video} label="Videos" active={activeTab === 'reels'} theme={theme} onPress={() => setActiveTab('reels')} />
              )}
              <TabButton icon={User} label="Saved" active={activeTab === 'wardrobe'} theme={theme} onPress={() => setActiveTab('wardrobe')} locked={isWardrobePrivate} />
            </View>
          </View>
        }
        renderItem={({ item, index }: any) => (
          <ProfileGridItem item={item} type={activeTab} theme={theme} router={router} index={index} activeTab={activeTab} />
        )}
        ListEmptyComponent={
          !itemsLoading ? (
            <View style={styles.emptyState}>
               {activeTab === 'wardrobe' && isWardrobePrivate ? (
                 <>
                   <Lock size={32} color={theme.subtext} style={{opacity: 0.5, marginBottom: 10}} />
                   <Text style={[styles.emptyText, { color: theme.subtext }]}>THIS WARDROBE IS PRIVATE</Text>
                 </>
               ) : (
                 <Text style={[styles.emptyText, { color: theme.subtext }]}>
                   {activeTab === 'wardrobe' && !isSelf ? "This wardrobe is empty." : "No items yet."}
                 </Text>
               )}
            </View>
          ) : (<ActivityIndicator style={{ marginTop: 50 }} color={theme.subtext} />)
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <DrawerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} isSeller={isSelf && profileData?.is_seller} />
      <SocialListSheet sheetRef={socialSheetRef} targetId={targetId} type={socialType} />
    </View>
  );
}

const TabButton = ({ icon: Icon, label, active, onPress, theme, locked }: TabButtonProps) => (
  <TouchableOpacity 
    onPress={() => {
      if (locked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }} 
    style={[
      styles.tabButton, 
      active && { backgroundColor: theme.text, borderColor: theme.text }, 
      locked && styles.lockedTab
    ]}
    activeOpacity={locked ? 1 : 0.7}
  >
    <Icon size={16} color={active ? theme.background : (locked ? theme.border : theme.subtext)} strokeWidth={active ? 3 : 2} />
    <Text style={[styles.tabLabel, { color: active ? theme.background : (locked ? theme.border : theme.subtext) }]}>
      {label.toUpperCase()}{locked && ' 🔒'}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingNav: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1001, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  navActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 10 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  navButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTop: { width: '100%' },
  tabContainer: { flexDirection: 'row', gap: 10, marginTop: 15, paddingHorizontal: 20, marginBottom: 15 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent' },
  lockedTab: { opacity: 0.5, backgroundColor: 'rgba(0,0,0,0.02)' },
  tabLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  listContent: { paddingBottom: 150 },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }
});