import React, { useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, ActivityIndicator, 
  FlatList, Dimensions, RefreshControl 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Heart, MessageCircle, ChevronLeft, Zap, 
  Package, AlertTriangle, Clock,
  UserPlus, Gem
} from 'lucide-react-native';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
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

const { width } = Dimensions.get('window');

/**
 * 🏰 NOTIFICATIONS HUB v98.0
 * Purpose: Central hub for tracking interactions, orders, and account alerts.
 * Features: Real-time updates, user online status, and plan expiry warnings.
 */
export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  /** 📡 DATA SYNC: Fetching latest notifications */
  const { data: activities = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const [likes, comments, orders, follows] = await Promise.all([
        supabase.from('product_likes')
          .select('*, sender:user_id(id, slug, logo_url, last_seen_at, subscription_plan), products(id, name, image_urls, seller_id)')
          .eq('products.seller_id', profile.id)
          .order('created_at', { ascending: false }).limit(15),
        supabase.from('product_comments')
          .select('*, sender:user_id(id, slug, logo_url, last_seen_at, subscription_plan), products(id, name, image_urls, seller_id)')
          .eq('products.seller_id', profile.id)
          .order('created_at', { ascending: false }).limit(15),
        supabase.from('orders')
          .select('*, sender:user_id(id, slug, logo_url, last_seen_at), products:order_items(product:product_id(name, image_urls))')
          .or(`seller_id.eq.${profile.id},user_id.eq.${profile.id}`)
          .order('updated_at', { ascending: false }).limit(15),
        supabase.from('follows')
          .select('*, sender:follower_id(id, slug, logo_url, last_seen_at, subscription_plan)')
          .eq('following_id', profile.id)
          .order('created_at', { ascending: false }).limit(15)
      ]);

      const merged = [
        ...(likes.data || []).filter(l => l.products).map(l => ({ ...l, type: 'LIKE', created_at: l.created_at })),
        ...(comments.data || []).filter(c => c.products).map(c => ({ ...c, type: 'COMMENT', created_at: c.created_at })),
        ...(orders.data || []).map(o => ({ ...o, type: 'ORDER', sender: o.sender, created_at: o.updated_at })),
        ...(follows.data || []).map(f => ({ ...f, type: 'FOLLOW', sender: f.sender, created_at: f.created_at }))
      ];

      // Add subscription alerts
      if (profile.subscription_expiry) {
        const daysLeft = differenceInDays(new Date(profile.subscription_expiry), new Date());
        if (daysLeft >= 0 && daysLeft <= 3) {
          merged.push({
            id: 'expiry-alert',
            type: 'URGENT',
            content: `Your ${profile.subscription_plan} plan expires in ${daysLeft} days.`,
            created_at: new Date().toISOString()
          });
        }
      }

      return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    staleTime: 1000 * 30, 
  });

  /** ⚡ LIVE UPDATES: Listening for new events */
  useEffect(() => {
    const channel = supabase.channel('notification_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_likes' }, () => refetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_comments' }, () => refetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows' }, () => refetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const renderActivityItem = ({ item }: { item: any }) => {
    const isDiamond = item.sender?.subscription_plan === 'diamond';
    const type = item.type as string;
    
    // Check if user has been active in the last 5 minutes
    const isOnline = item.sender?.last_seen_at && 
      (new Date().getTime() - new Date(item.sender.last_seen_at).getTime()) / 60000 < 5;

    // CATEGORY SETTINGS
    const icons: Record<string, any> = {
      LIKE: Heart,
      COMMENT: MessageCircle,
      FOLLOW: UserPlus,
      ORDER: Package,
      URGENT: AlertTriangle,
    };

    const colors: Record<string, string> = {
      LIKE: '#EF4444',
      COMMENT: Colors.brand.emerald,
      FOLLOW: '#3B82F6',
      ORDER: Colors.brand.gold,
      URGENT: '#F59E0B',
    };

    const labels: Record<string, string> = {
      LIKE: 'liked your item',
      COMMENT: 'commented on',
      FOLLOW: 'followed you',
      ORDER: item.seller_id === profile?.id ? 'placed an order' : `updated order: ${item.status}`,
      URGENT: 'Reminder',
    };

    const IconComponent = icons[type] || Zap;
    const activeColor = colors[type] || theme.text;
    const activeLabel = labels[type] || 'updated';

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        style={[styles.activityRow, { borderBottomColor: theme.surface }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (type === 'ORDER') router.push('/seller/orders');
          else if (type === 'URGENT') router.push('/seller/settings');
          else if (item.product_id) router.push(`/product/${item.product_id}` as any);
          else if (type === 'FOLLOW') router.push(`/profile/${item.sender.id}`as any);
        }}
      >
        <View style={styles.avatarWrapper}>
          {type === 'URGENT' ? (
            <View style={[styles.urgentIcon, { backgroundColor: '#FFFBEB' }]}>
              <AlertTriangle color="#F59E0B" size={24} strokeWidth={2.5} />
            </View>
          ) : (
            <View style={[styles.avatarFrame, isDiamond && styles.diamondHalo]}>
              <Image source={item.sender?.logo_url} style={styles.avatar} contentFit="cover" transition={200} />
              {isOnline && <View style={[styles.onlineDot, { borderColor: theme.background }]} />}
              <View style={[styles.badge, { backgroundColor: activeColor, borderColor: theme.background }]}>
                <IconComponent size={10} color="white" strokeWidth={3} fill={type === 'LIKE' ? 'white' : 'none'} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.mainText, { color: theme.text }]}>
            {type === 'URGENT' ? (
              <Text style={styles.urgentText}>{item.content}</Text>
            ) : (
              <>
                <Text style={styles.bold}>@{item.sender?.slug || 'user'}</Text>
                {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" style={{marginLeft: 4}}/>}
                {` ${activeLabel} `}
                <Text style={styles.bold}>{item.products?.name || ''}</Text>
              </>
            )}
          </Text>
          <Text style={[styles.time, { color: theme.subtext }]}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true }).toUpperCase()}
          </Text>
        </View>

        {item.products?.image_urls?.[0] && (
          <Image source={item.products.image_urls[0]} style={styles.mediaPreview} contentFit="cover" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={theme.text} size={30} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>NOTIFICATIONS</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          {isRefetching ? <ActivityIndicator size="small" color={theme.text} /> : <Zap size={18} color={theme.text} fill={theme.text} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivityItem}
        keyExtractor={(item, index) => item.id || `act-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand.emerald} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
              <Text style={[styles.listHeaderText, { color: theme.text }]}>RECENT UPDATES</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Clock size={48} color={theme.surface} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>No new notifications.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  refreshBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  listHeader: { paddingHorizontal: 25, paddingVertical: 20 },
  listHeaderText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 18, borderBottomWidth: 1 },
  avatarWrapper: { position: 'relative' },
  avatarFrame: { width: 54, height: 54, borderRadius: 20, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  diamondHalo: { borderWidth: 2.5, borderColor: '#8B5CF6', padding: 2 },
  onlineDot: { position: 'absolute', top: -2, left: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.brand.emerald, borderWidth: 2, zIndex: 10 },
  urgentIcon: { width: 54, height: 54, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, marginLeft: 16, marginRight: 10 },
  mainText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  bold: { fontWeight: '900' },
  urgentText: { fontWeight: '900', color: '#B45309' },
  time: { fontSize: 9, fontWeight: '800', marginTop: 5, opacity: 0.5 },
  mediaPreview: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  empty: { flex: 1, alignItems: 'center', marginTop: 140, opacity: 0.5 },
  emptyText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});