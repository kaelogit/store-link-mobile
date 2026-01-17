import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, FlatList, 
  TouchableOpacity, ActivityIndicator, Dimensions, 
  Platform, RefreshControl, Share, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'; // 🛠️ Added useFocusEffect
import { 
  Menu, Grid, Play, ShoppingBag, 
  Share2, Gem, MessageCircle, Lock, 
  ChevronLeft, MapPin, Tag, Zap, ChevronUp 
} from 'lucide-react-native';

// Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { DrawerMenu } from '../../src/components/DrawerMenu';
import { SocialListSheet } from '../../src/components/SocialListSheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 UNIVERSAL PROFILE HUB v90.0
 * Fixed: Auto-refresh on screen focus (useFocusEffect).
 * Fixed: full_name rendering persistence after edit.
 * Feature: Optimized asset fetching and smooth return navigation.
 */
export default function UnifiedProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { id: visitorId } = useLocalSearchParams();
  const { profile: myProfile, refreshUserData } = useUserStore();
  
  const isSelf = !visitorId || visitorId === myProfile?.id;
  const targetId = (isSelf ? myProfile?.id : visitorId as string) || "";

  // --- States ---
  const [profileData, setProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'drops' | 'reels' | 'wardrobe'>('wardrobe');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const isMounted = useRef(true);
  
  const flatListRef = useRef<FlatList>(null);
  const socialSheetRef = useRef<any>(null);
  const [socialType, setSocialType] = useState<'followers' | 'following'>('followers');

  const formatName = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  /** 🛠️ AUTO-REFRESH ON FOCUS: Ensures changes from Edit Profile render immediately */
  useFocusEffect(
    useCallback(() => {
      if (isSelf) {
        initTerminal();
      }
      return () => {};
    }, [targetId])
  );

  const handleShareProfile = async () => {
    if (!profileData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const shareUrl = `https://storelink.ng/@${profileData.slug}`;
      await Share.share({
        message: `Check out ${profileData.display_name} (@${profileData.slug}) on StoreLink!\n\n${shareUrl}`,
        url: shareUrl, 
      });
    } catch (e) { console.error("Sharing failed"); }
  };

  const scrollToTop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    if (yOffset > 400 && !showScrollTop) setShowScrollTop(true);
    else if (yOffset <= 400 && showScrollTop) setShowScrollTop(false);
  };

  const handleFollow = async () => {
    if (!myProfile?.id || isSelf || !targetId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prevState = isFollowing;
    setIsFollowing(!prevState);
    try {
      if (prevState) {
        await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('seller_id', targetId);
      } else {
        await supabase.from('follows').insert({ follower_id: myProfile.id, seller_id: targetId });
      }
      const { data } = await supabase.from('profiles').select('follower_count').eq('id', targetId).single();
      if (data) setProfileData((prev: any) => ({ ...prev, follower_count: data.follower_count }));
    } catch (e) {
      setIsFollowing(prevState);
      Alert.alert("Error", "Could not update follow status.");
    }
  };

  // EFFECT 1: Load Identity (Initial load & target change)
  useEffect(() => {
    isMounted.current = true;
    initTerminal();
    return () => { isMounted.current = false; };
  }, [targetId]);

  // EFFECT 2: Load Tab Items
  useEffect(() => {
    if (profileData) fetchTabContent();
  }, [activeTab, targetId, profileData?.id]);

  const initTerminal = async () => {
    if (!targetId) return;
    if (isSelf) {
      await refreshUserData();
      if (isMounted.current && myProfile) {
        setProfileData(myProfile);
        if (myProfile.is_seller && activeTab === 'wardrobe') setActiveTab('drops');
      }
    } else {
      await fetchTargetProfile();
    }
    setLoading(false);
  };

  const fetchTargetProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', targetId).single();
      if (data && isMounted.current) {
        setProfileData(data);
        const { data: follow } = await supabase.from('follows')
          .select('created_at').eq('follower_id', myProfile?.id).eq('seller_id', targetId).maybeSingle();
        setIsFollowing(!!follow);
      }
    } catch (e) { console.error("Profile load failed"); }
  };

  const fetchTabContent = async () => {
    if (!targetId) return;
    setContentLoading(true);
    try {
      let res;
      if (activeTab === 'drops') {
        res = await supabase.from('products').select('*').eq('seller_id', targetId).eq('is_active', true).order('created_at', { ascending: false });
      } else if (activeTab === 'reels') {
        res = await supabase.from('reels').select('*').eq('seller_id', targetId).order('created_at', { ascending: false });
      } else {
        res = await supabase.from('orders').select('*, order_items(*, product:product_id(*))').eq('user_id', targetId).eq('status', 'completed');
      }
      const rawData = res?.data || [];
      if (isMounted.current) {
        setItems(activeTab === 'wardrobe' ? rawData.flatMap((o: any) => o.order_items) : rawData);
      }
    } catch (e) { console.error("Content fetch failed"); }
    finally { setContentLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initTerminal();
    await fetchTabContent();
    setRefreshing(false);
  }, [targetId, activeTab]);

  if (loading || !profileData) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
      </View>
    );
  }

  const isMerchant = profileData.is_seller === true;
  const isDiamond = profileData.subscription_plan === 'diamond';
  const isWardrobePrivate = profileData.is_wardrobe_private === true;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fixedTopNav} pointerEvents="box-none" edges={['top']}>
        <View style={styles.navActionRow}>
          {!isSelf ? (
            <TouchableOpacity style={[styles.navCircle, { backgroundColor: theme.surface }]} onPress={() => router.back()}>
              <ChevronLeft color={theme.text} size={24} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : <View />}
          <TouchableOpacity 
            style={[styles.navCircle, { backgroundColor: theme.surface }]} 
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsMenuOpen(true);
            }}
          >
            <Menu color={theme.text} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={items}
        numColumns={3}
        key={activeTab}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />}
        ListHeaderComponent={() => (
          <View style={styles.headerRoot}>
            <View style={styles.coverWrapper}>
              {profileData.cover_image_url && (
                <Image source={{ uri: profileData.cover_image_url }} style={styles.coverImage} />
              )}
              <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', theme.background]} style={StyleSheet.absoluteFill} />
            </View>

            <View style={styles.headerContent}>
              <View style={styles.standardHeaderRow}>
                <View style={[styles.avatarFrame, { backgroundColor: theme.background }, isDiamond && styles.diamondHalo]}>
                  {profileData.logo_url && (
                    <Image source={{ uri: profileData.logo_url }} style={styles.avatar} />
                  )}
                </View>
                <View style={styles.statsLayout}>
                   <StatItem label={isMerchant ? "Drops" : "Items"} value={profileData.wardrobe_count || 0} theme={theme} />
                   <StatItem label="Followers" value={profileData.follower_count || 0} theme={theme} onPress={() => { setSocialType('followers'); socialSheetRef.current?.expand(); }} />
                   <StatItem label="Following" value={profileData.following_count || 0} theme={theme} onPress={() => { setSocialType('following'); socialSheetRef.current?.expand(); }} />
                </View>
              </View>

              <View style={styles.nameBlock}>
                <View style={styles.titleRow}>
                  {/* 🛠️ FIXED: Rendering fresh full_name from profileData */}
                  <Text style={[styles.fullName, { color: theme.text }]}>{formatName(profileData.full_name)}</Text>
                  {isDiamond && <Gem size={14} color="#8B5CF6" fill="#8B5CF6" />}
                </View>
                <Text style={[styles.displaySlug, { color: theme.subtext }]}>@{profileData.slug}</Text>
                
                {profileData.bio && (
                  <View style={styles.bioWrapper}>
                    <Text numberOfLines={bioExpanded ? undefined : 2} style={[styles.bioText, { color: theme.text }]}>
                      {profileData.bio}
                    </Text>
                    {profileData.bio.length > 60 && (
                      <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                        <Text style={styles.moreText}>{bioExpanded ? "See less" : "...see more"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.metaRow}>
                   <View style={styles.badgeItem}>
                      <MapPin size={10} color={theme.subtext} />
                      <Text style={[styles.metaText, { color: theme.subtext }]}>{profileData.location?.toUpperCase()}</Text>
                   </View>
                   {profileData.category && (
                      <View style={styles.badgeItem}>
                        <Tag size={10} color={Colors.brand.emerald} />
                        <Text style={[styles.metaText, { color: Colors.brand.emerald }]}>{profileData.category.toUpperCase()}</Text>
                      </View>
                   )}
                </View>
              </View>

              <View style={styles.actionRow}>
                {isSelf ? (
                  <>
                    <TouchableOpacity style={[styles.primaryAction, { backgroundColor: theme.text }]} onPress={() => router.push('/profile/edit')}>
                      <Text style={[styles.actionText, { color: theme.background }]}>EDIT PROFILE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryAction, { backgroundColor: theme.surface }]} onPress={handleShareProfile}>
                      <Share2 size={20} color={theme.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{flexDirection: 'row', gap: 10, flex: 1}}>
                    <TouchableOpacity style={[styles.primaryAction, { backgroundColor: theme.text }]} onPress={handleFollow}>
                      <Text style={[styles.actionText, { color: theme.background }]}>{isFollowing ? 'FOLLOWING' : 'FOLLOW'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryAction, { backgroundColor: theme.surface }]} onPress={() => router.push(`/chat/${targetId}`)}>
                      <MessageCircle size={20} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
                 {isMerchant && (
                   <>
                    <TabButton icon={Grid} active={activeTab === 'drops'} theme={theme} onPress={() => setActiveTab('drops')} />
                    <TabButton icon={Play} active={activeTab === 'reels'} theme={theme} onPress={() => setActiveTab('reels')} />
                   </>
                 )}
                 <TabButton icon={ShoppingBag} active={activeTab === 'wardrobe'} theme={theme} onPress={() => setActiveTab('wardrobe')} />
              </View>
            </View>
          </View>
        )}
        renderItem={({ item }) => <GridItem item={item} type={activeTab} theme={theme} router={router} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {contentLoading ? (
               <ActivityIndicator color={Colors.brand.emerald} size="small" style={{marginTop: 40}} />
            ) : (
              activeTab === 'wardrobe' && !isSelf && isWardrobePrivate ? (
                <>
                  <View style={[styles.lockCircle, { backgroundColor: theme.surface }]}><Lock size={32} color={theme.subtext} /></View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Private Wardrobe</Text>
                  <Text style={styles.emptySub}>This collection is hidden.</Text>
                </>
              ) : (
                <Text style={styles.emptySub}>No transmissions found.</Text>
              )
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {showScrollTop && (
        <TouchableOpacity style={[styles.scrollTopBtn, { backgroundColor: theme.text }]} onPress={scrollToTop} activeOpacity={0.9}>
          <ChevronUp color={theme.background} size={28} strokeWidth={3} />
        </TouchableOpacity>
      )}

      <DrawerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} isSeller={isSelf && isMerchant} />
      <SocialListSheet sheetRef={socialSheetRef} targetId={targetId} type={socialType} />
    </View>
  );
}

// --- Sub-Components ---
const StatItem = ({ label, value, onPress, theme }: any) => (
  <TouchableOpacity style={styles.statBox} onPress={onPress} disabled={!onPress}>
    <Text style={[styles.statNum, { color: theme.text }]}>{value > 999 ? (value/1000).toFixed(1)+'K' : value}</Text>
    <Text style={[styles.statLabel, { color: theme.subtext }]}>{label.toUpperCase()}</Text>
  </TouchableOpacity>
);

const TabButton = ({ icon: Icon, active, onPress, theme }: any) => (
  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} style={[styles.tab, active && { borderBottomColor: theme.text, borderBottomWidth: 3 }]}>
    <Icon size={22} color={active ? theme.text : theme.border} strokeWidth={active ? 3 : 2} />
  </TouchableOpacity>
);

const GridItem = ({ item, type, router, theme }: any) => {
  const imageUrl = type === 'wardrobe' ? item.product?.image_urls?.[0] : (item.image_urls?.[0] || item.thumbnail_url);
  if (!imageUrl) return null;
  return (
    <TouchableOpacity 
      style={[styles.gridCard, { backgroundColor: theme.surface }]} 
      onPress={() => router.push(type === 'reels' ? `/explore?id=${item.id}` : `/product/${item.product?.id || item.id}`)}
    >
      <Image source={{ uri: imageUrl }} style={styles.gridImg} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fixedTopNav: { position: 'absolute', top: 0, width: '100%', zIndex: 1000 },
  navActionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  headerRoot: { width: '100%' },
  coverWrapper: { height: 160, width: '100%', position: 'relative' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  navCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.1, elevation: 2 },
  headerContent: { paddingHorizontal: 20 },
  standardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: -40, justifyContent: 'space-between' },
  avatarFrame: { padding: 4, borderRadius: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 },
  diamondHalo: { borderWidth: 3, borderColor: '#8B5CF6' },
  avatar: { width: 86, height: 86, borderRadius: 20 },
  statsLayout: { flex: 1, flexDirection: 'row', marginLeft: 20, justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  nameBlock: { marginTop: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fullName: { fontSize: 14, fontWeight: '700' },
  displaySlug: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  bioWrapper: { marginTop: 8 },
  bioText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  moreText: { fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 10 },
  badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 9, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryAction: { flex: 1, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  secondaryAction: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontWeight: '900', fontSize: 12 },
  tabBar: { flexDirection: 'row', marginTop: 25, borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  gridCard: { width: (width - 4) / 3, margin: 0.6, height: (width / 3) * 1.2 },
  gridImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  lockCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emptyTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  emptySub: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8, fontWeight: '600' },
  scrollTopBtn: { position: 'absolute', bottom: 30, right: 25, width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 }
});