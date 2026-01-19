import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Dimensions, TextInput, 
  RefreshControl, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, X, MapPin, Gem, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { View, Text } from '../../src/components/Themed';
import { useColorScheme } from '../../src/components/useColorScheme';
import Colors from '../../src/constants/Colors';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const COLUMN_WIDTH = (width - 40) / 2;

/**
 * 🏰 SEARCH SCREEN v96.0
 * Purpose: A fast, searchable grid for finding local stores and shops.
 * Features: Category filters, premium store highlights, and real-time search.
 */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser, refreshUserData } = useUserStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => [
    'All', 'Fashion', 'Beauty', 'Electronics', 
    'Home', 'Wellness', 'Services', 'Real Estate', 'Automotive'
  ], []);

  /** 🛡️ LOADING STORES: Fetching the latest shop list */
  const { 
    data: merchants = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['discovery-merchants', searchQuery, selectedCategory, currentUser?.location_city],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weighted_merchants', {
        p_user_id: currentUser?.id || null,
        p_search: searchQuery.trim() || null,
        p_category: selectedCategory === 'All' ? null : selectedCategory.toLowerCase(),
        p_location_state: currentUser?.location_state || 'Lagos',
        p_location_city: currentUser?.location_city || null,
        p_limit: 40, 
        p_offset: 0
      });

      if (error) throw error;

      // Pre-load store logos for smoother scrolling
      data?.slice(0, 10).forEach((m: any) => {
        if (m.logo_url) Image.prefetch(m.logo_url);
      });

      return data || [];
    },
    staleTime: 1000 * 60 * 5, 
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshUserData();
    refetch();
  }, [refetch, refreshUserData]);

  const renderMerchantCard = useCallback(({ item, index }: { item: any; index: number }) => {
    const isPremium = item.prestige_weight === 3;
    const isLocal = item.location_city === currentUser?.location_city;
    const isLeftColumn = index % 2 === 0;
    
    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          { 
            backgroundColor: theme.surface,
            marginRight: isLeftColumn ? CARD_MARGIN : 0,
            marginLeft: !isLeftColumn ? CARD_MARGIN : 0,
            borderColor: isPremium ? '#8B5CF6' : theme.border,
            borderWidth: isPremium ? 1.5 : 1
          }
        ]}
        activeOpacity={0.85}
        onPress={() => router.push(item.id === currentUser?.id ? '/profile' : `/profile/${item.id}` as any)}
      >
        <View style={styles.imageWrapper}>
          <Image 
            source={item.logo_url || 'https://via.placeholder.com/150'} 
            style={styles.logo}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          {isPremium && (
            <View style={styles.diamondBadge}>
              <Gem size={10} color="white" fill="white" />
            </View>
          )}
        </View>
        
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
             <Text style={[styles.brandName, { color: theme.text }]} numberOfLines={1}>
               {(item.display_name || item.slug || 'Store').toUpperCase()}
             </Text>
             {isPremium && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />}
          </View>
          
          <View style={styles.metaRow}>
            <MapPin size={10} color={isLocal ? Colors.brand.emerald : theme.subtext} />
            <Text 
              style={[
                styles.metaText, 
                { color: isLocal ? Colors.brand.emerald : theme.subtext }
              ]} 
              numberOfLines={1}
            >
              {(item.location_city || 'Nigeria').toUpperCase()}
            </Text>
          </View>
          
          {item.category && (
            <View style={[styles.tagPill, { backgroundColor: theme.background }]}>
              <Text style={[styles.categoryTag, { color: theme.subtext }]}>
                {item.category.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [theme, currentUser]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      
      {/* 🏰 HEADER: Search Section */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Discover Stores</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
          <SearchIcon size={18} color={theme.subtext} strokeWidth={2.5} />
          <TextInput 
            placeholder="Search shops..."
            placeholderTextColor={`${theme.subtext}80`}
            style={[styles.input, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              Haptics.selectionAsync();
              refetch();
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => refetch(), 0); }}>
              <X size={18} color={theme.subtext} strokeWidth={3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 🧬 CATEGORY FILTER */}
      <View style={styles.filterContainer}>
        <FlatList 
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(item);
              }}
              style={[
                styles.filterTab, 
                { 
                  backgroundColor: selectedCategory === item ? theme.text : theme.surface,
                  borderColor: selectedCategory === item ? theme.text : theme.border,
                  borderWidth: 1
                }
              ]}
            >
              <Text style={[
                styles.filterText, 
                { color: selectedCategory === item ? theme.background : theme.subtext }
              ]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* 🛍️ STORE GRID */}
      <FlatList 
        data={merchants}
        numColumns={2}
        keyExtractor={(item) => `merchant-${item.id}`}
        renderItem={renderMerchantCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
        
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}

        ListEmptyComponent={() => {
          if (isLoading) return (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.brand.emerald} />
              <Text style={styles.loaderText}>LOADING SHOPS...</Text>
            </View>
          );
          return (
            <View style={styles.emptyState}>
              <Zap size={32} color={theme.border} />
              <Text style={[styles.emptyTitle, { color: theme.subtext }]}>NO STORES FOUND</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 15 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 15, marginTop: 5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, borderRadius: 20, gap: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '700' },
  filterContainer: { marginBottom: 20, paddingHorizontal: 20 },
  filterList: { gap: 10 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 },
  filterText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  listContent: { paddingHorizontal: 20 },
  card: { width: COLUMN_WIDTH - CARD_MARGIN, borderRadius: 24, padding: 15, marginBottom: 16, alignItems: 'center' },
  imageWrapper: { width: 74, height: 74, marginBottom: 12, position: 'relative' },
  logo: { width: 74, height: 74, borderRadius: 22, backgroundColor: '#F3F4F6' },
  diamondBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#8B5CF6', padding: 5, borderRadius: 10, borderWidth: 3, borderColor: 'white' },
  cardInfo: { alignItems: 'center', width: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  brandName: { fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: 0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  metaText: { fontSize: 9, fontWeight: '800' },
  tagPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  categoryTag: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loaderText: { marginTop: 15, fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 15 },
  emptyTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 }
});