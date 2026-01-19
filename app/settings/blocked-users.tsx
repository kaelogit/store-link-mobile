import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, UserX, ShieldCheck, UserMinus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🚫 BLOCKED USERS SCREEN
 * Purpose: Allows users to see and unblock people they have restricted.
 * Language: Simple English for clear privacy control.
 */
export default function BlockedUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  const [blockedPeople, setBlockedPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedList();
  }, []);

  /**
   * 📡 Load Blocked List
   * Pulls everyone you have blocked along with their profile info.
   */
  const loadBlockedList = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocked_id,
          profiles:blocked_id (
            display_name,
            slug,
            logo_url
          )
        `)
        .eq('blocker_id', profile?.id);

      if (error) throw error;
      setBlockedPeople(data || []);
    } catch (e) {
      console.error("Could not load blocked users:", e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔓 Unblock Logic
   * Removes the restriction and updates the list instantly.
   */
  const handleUnblock = async (rowId: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUnblockingId(rowId);

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBlockedPeople(prev => prev.filter(item => item.id !== rowId));
      Alert.alert("Unblocked", `${name} can now see your shop and items again.`);
    } catch (e) {
      Alert.alert("Error", "Could not unblock. Please check your connection.");
    } finally {
      setUnblockingId(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.userRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Image 
        source={item.profiles?.logo_url} 
        style={styles.avatar} 
        contentFit="cover"
        transition={200}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>
          {item.profiles?.display_name || 'Storelink User'}
        </Text>
        <Text style={[styles.userHandle, { color: theme.subtext }]}>
          @{item.profiles?.slug || 'user'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.unblockBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
        onPress={() => handleUnblock(item.id, item.profiles?.display_name)}
        disabled={unblockingId === item.id}
      >
        {unblockingId === item.id ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <>
            <UserMinus size={14} color={theme.text} strokeWidth={2.5} />
            <Text style={[styles.unblockText, { color: theme.text }]}>UNBLOCK</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top || 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>BLOCKED PEOPLE</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.infoBanner}>
        <ShieldCheck size={18} color={theme.subtext} />
        <Text style={[styles.infoText, { color: theme.subtext }]}>
          Blocked people cannot message you or see your items.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.text} size="large" />
        </View>
      ) : (
        <FlatList
          data={blockedPeople}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <UserX size={48} color={theme.border} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Blocked People</Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>
                Anyone you block will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, opacity: 0.8 },
  infoText: { fontSize: 12, fontWeight: '600', flex: 1 },
  list: { padding: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, marginBottom: 12, borderWidth: 1.5 },
  avatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)' },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontSize: 15, fontWeight: '800' },
  userHandle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  unblockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5 },
  unblockText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  emptyState: { marginTop: 100, alignItems: 'center', gap: 15 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center' }
});