import React, { useState } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, Platform, RefreshControl, StatusBar, View as RNView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, UserX, ShieldCheck, UserMinus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// 💎 SPEED ENGINE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🚫 BLOCKED USERS HUB v102.0
 * Purpose: Secure management of restricted accounts.
 * Logic: Uses React Query for instant list updates and cache management.
 */
export default function BlockedUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  /** 📡 DATA SYNC: Fetching blocked list */
  const { data: blockedPeople = [], isLoading, refetch } = useQuery({
    queryKey: ['blocked-list', profile?.id],
    queryFn: async () => {
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
      return data || [];
    },
  });

  /** 🔓 UNBLOCK MUTATION: Atomic removal and cache update */
  const unblockMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from('blocked_users').delete().eq('id', rowId);
      if (error) throw error;
    },
    onMutate: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['blocked-list'] });
    },
    onError: () => {
      Alert.alert("Error", "Could not unblock at this time.");
    }
  });

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.userRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Image 
        source={item.profiles?.logo_url || 'https://via.placeholder.com/150'} 
        style={styles.avatar} 
        contentFit="cover"
        transition={200}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>
          {(item.profiles?.display_name || 'Member').toUpperCase()}
        </Text>
        <Text style={[styles.userHandle, { color: theme.subtext }]}>
          @{item.profiles?.slug}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.unblockBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
        onPress={() => unblockMutation.mutate(item.id)}
        disabled={unblockMutation.isPending}
      >
        <UserMinus size={14} color={theme.text} strokeWidth={2.5} />
        <Text style={[styles.unblockText, { color: theme.text }]}>UNBLOCK</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft color={theme.text} size={28} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>BLOCKED PEOPLE</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.infoBanner}>
        <ShieldCheck size={18} color={theme.subtext} />
        <Text style={[styles.infoText, { color: theme.subtext }]}>
          People you block cannot message you or browse your store.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.brand.emerald} size="large" />
        </View>
      ) : (
        <FlatList
          data={blockedPeople}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.brand.emerald} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <UserX size={48} color={theme.border} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Blocked People</Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>Your restricted accounts list is empty.</Text>
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
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 25, opacity: 0.8 },
  infoText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 18 },
  
  list: { padding: 20 },
  
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, marginBottom: 12, borderWidth: 1.5 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)' },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  userHandle: { fontSize: 11, fontWeight: '600', marginTop: 2, opacity: 0.6 },
  
  unblockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5 },
  unblockText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  emptyState: { marginTop: 100, alignItems: 'center', gap: 15 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', opacity: 0.5 }
});