import React from 'react';
import { 
  StyleSheet, TouchableOpacity, ActivityIndicator, 
  FlatList, Dimensions, RefreshControl, Platform, StatusBar, View as RNView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Heart, MessageCircle, ChevronLeft, Zap, 
  Package, Wallet, Users,
  UserPlus, Gem, ChevronRight, Clock
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// 🚀 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';

// App Connection
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/useUserStore';
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';
import { Profile } from '../src/types';

// 🛠️ TYPE DEFINITIONS (Local for this screen)
interface ActivityItem {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'ORDER' | 'FOLLOW' | 'MONEY';
  created_at: string;
  sender?: Partial<Profile>;
  amount?: number;
  status?: string;
  seller_id?: string;
  product_id?: string;
  products?: {
    name: string;
    image_urls: string[];
  };
  likes_count?: number; // Optional fields for polymorphic types
  comments_count?: number;
}

interface ActivityData {
  feed: ActivityItem[];
  todayViews: number;
}

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  /** 📡 DATA SYNC: Unified Social, Financial, and View Engine */
  const { data: activities, isLoading, refetch, isRefetching } = useQuery<ActivityData>({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { feed: [], todayViews: 0 };

      const [likes, comments, orders, follows, money, views] = await Promise.all([
        supabase.from('product_likes')
          .select('*, sender:user_id(id, slug, logo_url, last_seen_at, subscription_plan), products(id, name, image_urls, seller_id)')
          .eq('products.seller_id', profile.id)
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('product_comments')
          .select('*, sender:user_id(id, slug, logo_url, last_seen_at, subscription_plan), products(id, name, image_urls, seller_id)')
          .eq('products.seller_id', profile.id)
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('orders')
          .select('*, sender:user_id(id, slug, logo_url, last_seen_at), products:order_items(product:product_id(name, image_urls))')
          .or(`seller_id.eq.${profile.id},user_id.eq.${profile.id}`)
          .order('updated_at', { ascending: false }).limit(10),
        supabase.from('follows')
          .select('*, sender:follower_id(id, slug, logo_url, last_seen_at, subscription_plan)')
          .eq('following_id', profile.id)
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('cash_transactions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('profile_views')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('view_date', new Date().toISOString().split('T')[0])
      ]);

      const merged: ActivityItem[] = [
        ...(likes.data || []).filter(l => l.products).map(l => ({ ...l, type: 'LIKE' as const, created_at: l.created_at })),
        ...(comments.data || []).filter(c => c.products).map(c => ({ ...c, type: 'COMMENT' as const, created_at: c.created_at })),
        ...(orders.data || []).map(o => ({ 
            ...o, 
            type: 'ORDER' as const, 
            sender: o.sender, 
            created_at: o.updated_at,
            // Map the first product from order items for preview
            products: o.products?.[0]?.product 
        })),
        ...(follows.data || []).map(f => ({ ...f, type: 'FOLLOW' as const, sender: f.sender, created_at: f.created_at })),
        ...(money.data || []).map(m => ({ ...m, type: 'MONEY' as const, created_at: m.created_at }))
      ];

      return {
        feed: merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        todayViews: views.data?.length || 0
      };
    },
    staleTime: 1000 * 30, 
  });

  const renderActivityItem = ({ item }: { item: ActivityItem }) => {
    const type = item.type;
    const isDiamond = item.sender?.subscription_plan === 'diamond';
    // 🛡️ Safe Date Parsing
    const lastSeen = item.sender?.last_seen_at ? new Date(item.sender.last_seen_at).getTime() : 0;
    const isOnline = lastSeen && (new Date().getTime() - lastSeen) / 60000 < 5;

    const config: Record<string, { icon: any, color: string, label: string }> = {
      LIKE: { icon: Heart, color: '#FF3B30', label: 'liked your item' },
      COMMENT: { icon: MessageCircle, color: '#34C759', label: 'commented on' },
      FOLLOW: { icon: UserPlus, color: '#007AFF', label: 'followed you' },
      ORDER: { icon: Package, color: '#FFCC00', label: item.seller_id === profile?.id ? 'placed an order' : `updated order: ${item.status}` },
      MONEY: { icon: Wallet, color: '#32D74B', label: item.type === 'MONEY' && item.amount ? (item.amount > 0 ? 'Payout sent to bank' : 'Refund processed') : 'Wallet update' },
    };

    const ui = config[type] || { icon: Zap, color: theme.text, label: 'updated' };

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        style={[styles.activityRow, { borderBottomColor: theme.surface }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (type === 'ORDER') router.push('/seller/orders');
          else if (type === 'MONEY') router.push('/(tabs)/wallet');
          else if (type === 'FOLLOW' && item.sender?.id) router.push(`/profile/${item.sender.id}` as any);
          else if (item.product_id) router.push(`/product/${item.product_id}` as any);
        }}
      >
        <View style={styles.avatarWrapper}>
          {type === 'MONEY' ? (
            <View style={[styles.moneyIcon, { backgroundColor: '#F2F2F7' }]}>
               <Wallet color="#32D74B" size={24} strokeWidth={2.5} />
            </View>
          ) : (
            <View style={[styles.avatarFrame, isDiamond && styles.diamondHalo]}>
              <Image 
                source={item.sender?.logo_url || 'https://via.placeholder.com/100'} 
                style={styles.avatar} 
                contentFit="cover" 
                transition={200}
                cachePolicy="memory-disk"
              />
              {isOnline && <View style={[styles.onlineDot, { borderColor: theme.background }]} />}
              <View style={[styles.badge, { backgroundColor: ui.color, borderColor: theme.background }]}>
                <ui.icon size={10} color="white" strokeWidth={3} fill={type === 'LIKE' ? 'white' : 'none'} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.mainText, { color: theme.text }]}>
            {type === 'MONEY' ? (
              <Text style={styles.bold}>{item.amount ? `₦${item.amount.toLocaleString()}` : ''} {ui.label}</Text>
            ) : (
              <>
                <Text style={styles.bold}>@{item.sender?.slug || 'user'}</Text>
                {isDiamond && <Gem size={10} color="#5856D6" fill="#5856D6" style={{marginLeft: 4}}/>}
                {` ${ui.label} `}
                <Text style={styles.bold}>{item.products?.name || ''}</Text>
              </>
            )}
          </Text>
          <Text style={[styles.time, { color: theme.subtext }]}>
            {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }).toUpperCase() : 'JUST NOW'}
          </Text>
        </View>

        {item.products?.image_urls?.[0] && (
          <Image 
            source={item.products.image_urls[0]} 
            style={styles.mediaPreview} 
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* 📱 CLEAN HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeft color={theme.text} size={32} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>NOTIFICATIONS</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          {isRefetching ? <ActivityIndicator size="small" color={theme.text} /> : <Zap size={20} color={theme.text} fill={theme.text} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities?.feed || []}
        renderItem={renderActivityItem}
        keyExtractor={(item, index) => item.id || `act-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#34C759" />}
        ListHeaderComponent={
          <View>
            {/* 👁️ TIKTOK STYLE VIEW BAR */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/activity/profile-views');
              }}
              style={[styles.viewHeader, { backgroundColor: theme.surface }]}
            >
              <View style={styles.viewLeft}>
                <View style={styles.viewIconCircle}>
                  <Users size={20} color="#34C759" strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={[styles.viewTitle, { color: theme.text }]}>Profile views</Text>
                  <Text style={[styles.viewSub, { color: theme.subtext }]}>
                    {activities?.todayViews && activities.todayViews > 0 
                      ? `${activities.todayViews} people visited today` 
                      : 'See who visited your store'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={theme.border} strokeWidth={3} />
            </TouchableOpacity>

            <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { color: theme.text }]}>RECENT UPDATES</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Clock size={48} color={theme.surface} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>No new activity yet.</Text>
            </View>
          ) : (
            <View style={[styles.empty, { marginTop: 40 }]}>
              <ActivityIndicator color={theme.text} />
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  refreshBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  
  viewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 20, padding: 18, borderRadius: 28 },
  viewLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  viewIconCircle: { width: 48, height: 48, borderRadius: 18, backgroundColor: 'rgba(52, 199, 89, 0.1)', justifyContent: 'center', alignItems: 'center' },
  viewTitle: { fontSize: 16, fontWeight: '800' },
  viewSub: { fontSize: 12, fontWeight: '600', marginTop: 2, opacity: 0.6 },

  listHeader: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 10 },
  listHeaderText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 18, borderBottomWidth: 1 },
  avatarWrapper: { position: 'relative' },
  avatarFrame: { width: 56, height: 56, borderRadius: 22, overflow: 'hidden', backgroundColor: '#F2F2F7' },
  avatar: { width: '100%', height: '100%' },
  diamondHalo: { borderWidth: 2.5, borderColor: '#5856D6', padding: 2 },
  onlineDot: { position: 'absolute', top: -2, left: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#34C759', borderWidth: 3, zIndex: 10 },
  moneyIcon: { width: 56, height: 56, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  
  content: { flex: 1, marginLeft: 16, marginRight: 10 },
  mainText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  bold: { fontWeight: '900' },
  time: { fontSize: 9, fontWeight: '800', marginTop: 5, letterSpacing: 0.5, opacity: 0.4 },
  mediaPreview: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.05)' },
  
  empty: { flex: 1, alignItems: 'center', marginTop: 100, opacity: 0.5 },
  emptyText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});