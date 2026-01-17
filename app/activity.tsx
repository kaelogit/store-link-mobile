import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, Animated, Platform, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/useUserStore';
import { 
  Heart, MessageCircle, ChevronLeft, Zap, 
  ShieldCheck, TrendingUp, DollarSign, Star, Diamond 
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Sovereign Components
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

/**
 * 🏰 ACTIVITY FEED v94.0
 * Fixed: Username -> Slug migration, Nigerian Time (WAT) sync, and jargon removal.
 */
export default function ActivityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();
  
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchActivityFeed();

    // ⚡ REAL-TIME NOTIFICATIONS
    const activityChannel = supabase.channel('activity_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_comments' }, () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        fetchActivityFeed();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_likes' }, () => {
        fetchActivityFeed();
      })
      .subscribe();

    return () => { supabase.removeChannel(activityChannel); };
  }, [profile?.id]);

  // 🛠️ TIME CONVERSION: Real Nigerian Time (WAT) logic
  const getNigerianTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    // Standardizing to UTC then offset for West Africa Time (GMT+1)
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const fetchActivityFeed = async () => {
    try {
      if (!profile?.id) return;

      // 🛡️ DATA FIX: swapped 'username' for 'slug' in all queries
      const requests: any[] = [
        supabase.from('product_likes')
          .select('*, sender:user_id(id, slug, logo_url, prestige_weight), products(id, name, image_urls, seller_id)')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('product_comments')
          .select('*, sender:user_id(id, slug, logo_url, prestige_weight), products(id, name, image_urls, seller_id)')
          .order('created_at', { ascending: false })
          .limit(30)
      ];

      if (profile.is_seller) {
        // 🛡️ DATA FIX: swapped 'username' for 'slug'
        requests.push(supabase.from('orders').select('*, user_id(slug, logo_url)').eq('seller_id', profile.id).limit(10));
        const { count } = await supabase.from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', profile.id)
          .eq('status', 'pending');
        setPendingOrders(count || 0);
      }

      const results = await Promise.all(requests);
      
      const likes = (results[0].data || []).filter((l: any) => l.products?.seller_id === profile.id);
      const comments = (results[1].data || []).filter((c: any) => c.products?.seller_id === profile.id);
      const orders = profile.is_seller ? results[2].data || [] : [];

      const aggregatedLikes = likes.reduce((acc: any[], current: any) => {
        const existing = acc.find(a => a.product_id === current.product_id);
        if (existing) {
          existing.count = (existing.count || 1) + 1;
          return acc;
        }
        return [...acc, { ...current, type: 'LIKE' }];
      }, []);

      const merged = [
        ...orders.map((o: any) => ({ ...o, type: 'ORDER', sender: o.user_id })), 
        ...comments.map((c: any) => ({ ...c, type: 'COMMENT' })), 
        ...aggregatedLikes,
        { 
          id: 'sys-status', 
          type: 'SYSTEM', 
          content: profile.is_seller ? 'Shop status: Optimized' : 'Account: Active',
          created_at: new Date().toISOString() 
        }
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(merged);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) {
      console.error("Activity fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderActivityItem = ({ item }: { item: any }) => {
    const isDiamond = item.sender?.prestige_weight === 3;
    const type = item.type;
    const isOrder = type === 'ORDER';

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        style={[
          styles.activityRow, 
          { borderBottomColor: theme.surface },
          isOrder && { backgroundColor: Colors.brand.gold + '10' },
          isDiamond && { backgroundColor: '#8B5CF6' + '10' }
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          if (item.product_id) router.push(`/product/${item.product_id}`);
          if (isOrder) router.push(`/seller/orders`);
        }}
      >
        <View style={styles.avatarWrapper}>
          {type === 'SYSTEM' ? (
            <LinearGradient colors={['#111827', '#374151']} style={styles.systemIcon}>
              <ShieldCheck color={Colors.brand.emerald} size={20} strokeWidth={2.5} />
            </LinearGradient>
          ) : (
            <View style={[styles.avatarBorder, isDiamond && styles.diamondHalo]}>
              <Image source={{ uri: item.sender?.logo_url || 'https://via.placeholder.com/150' }} style={styles.avatar} />
            </View>
          )}
          
          <View style={[styles.badge, { backgroundColor: isOrder ? Colors.brand.gold : type === 'LIKE' ? '#EF4444' : Colors.brand.emerald, borderColor: theme.background }]}>
            {isOrder ? <DollarSign size={10} color="white" strokeWidth={3} /> : type === 'LIKE' ? <Heart size={10} color="white" fill="white" /> : <MessageCircle size={10} color="white" strokeWidth={3} />}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.mainText, { color: theme.text }]}>
            {type === 'SYSTEM' ? <Text style={styles.systemText}>{item.content}</Text> : (
              <>
                <Text style={styles.bold}>@{item.sender?.slug || 'member'}</Text>
                {isDiamond && <Diamond size={10} color="#8B5CF6" fill="#8B5CF6" style={{marginLeft: 4}}/>}
                {isOrder ? ` placed an order for ` : item.count > 1 ? ` and ${item.count - 1} others liked ` : type === 'LIKE' ? ` liked your product ` : ` commented on `}
                <Text style={styles.bold}>{item.products?.name || 'item'}</Text>
              </>
            )}
          </Text>
          {/* 🛠️ WAT Time applied here */}
          <Text style={[styles.time, { color: theme.subtext }]}>{getNigerianTimeAgo(item.created_at)}</Text>
        </View>

        {!isOrder && item.products?.image_urls?.[0] && (
          <Image source={{ uri: item.products.image_urls[0] }} style={styles.mediaPreview} />
        )}
        {isOrder && <TrendingUp size={18} color={Colors.brand.gold} strokeWidth={3} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={theme.text} size={28} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>NOTIFICATIONS</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); fetchActivityFeed(); }} style={[styles.refreshBtn, { backgroundColor: Colors.brand.emerald }]}>
          <Zap size={18} color="white" fill="white" />
        </TouchableOpacity>
      </View>

      {profile?.is_seller && !loading && (
        <View style={styles.vipContainer}>
          <LinearGradient colors={['#111827', '#1F2937']} style={styles.vipCard}>
            <View style={styles.vipStat}>
              <Text style={styles.vipLabel}>PENDING ORDERS</Text>
              <Text style={styles.vipValue}>{pendingOrders.toString().padStart(2, '0')}</Text>
            </View>
            <View style={styles.vipDivider} />
            <View style={styles.vipStat}>
              <Text style={styles.vipLabel}>ACCOUNT TIER</Text>
              <Text style={styles.vipValue}>{profile?.prestige_weight === 3 ? 'DIAMOND' : 'STANDARD'}</Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {loading ? (
        <View style={styles.centerLoad}><ActivityIndicator color={Colors.brand.emerald} size="large" /></View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={[styles.listHeader, { color: theme.text }]}>{profile?.is_seller ? 'Shop activity' : 'Your activity'}</Text>}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Star size={48} color={theme.surface} strokeWidth={1} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>No new activity.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 60 : 45, borderBottomWidth: 1 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  vipContainer: { paddingHorizontal: 20, marginVertical: 15 },
  vipCard: { flexDirection: 'row', borderRadius: 28, padding: 24, alignItems: 'center' },
  vipStat: { flex: 1, alignItems: 'center' },
  vipDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.1)' },
  vipLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  vipValue: { fontSize: 20, fontWeight: '900', color: 'white', marginTop: 6 },
  listHeader: { paddingHorizontal: 25, fontSize: 16, fontWeight: '900', marginTop: 15, marginBottom: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20, borderBottomWidth: 1 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 18 },
  avatarBorder: { padding: 2, borderRadius: 20 },
  diamondHalo: { borderWidth: 2, borderColor: '#8B5CF6' },
  systemIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, marginLeft: 15, marginRight: 10 },
  mainText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  bold: { fontWeight: '900' },
  systemText: { fontWeight: '900' },
  time: { fontSize: 9, fontWeight: '700', marginTop: 4 },
  mediaPreview: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F9FAFB' },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', marginTop: 120, opacity: 0.5 },
  emptyText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});