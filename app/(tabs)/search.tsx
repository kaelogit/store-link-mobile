import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Dimensions, TextInput, 
  RefreshControl, Platform, Keyboard, View as RNView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, X, MapPin, Gem, Zap, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
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
const COLUMN_GAP = 12;
const CARD_WIDTH = (width - 40 - COLUMN_GAP) / 2; // Exact width math

/**
 * 🏰 SEARCH SCREEN v105.0
 * Purpose: A high-fidelity discovery grid for Diamond members and local shops.
 * Design: "Editorial" aesthetic with clean lines and premium typography.
 */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser, refreshUserData } = useUserStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => [
    'All', 'Fashion', 'Beauty', 'Electronics', 
    'Home', 'Wellness', 'Services', 'Real Estate', 'Automotive'
  ], []);

  /** 🛡️ DISCOVERY ENGINE: Fetching weighted results */
  const { 
    data: merchants = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['discovery-merchants', searchQuery, selectedCategory, currentUser?.location_city],
    queryFn: async () => {
      // 🛡️ RPC Call with fallbacks
      try {
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

        // Pre-load top logos for buttery scrolling
        data?.slice(0, 12).forEach((m: any) => {
          if (m.logo_url) Image.prefetch(m.logo_url);
        });

        return data || [];
      } catch (err) {
        // Fallback: Standard Select if RPC fails or doesn't exist yet
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, slug, logo_url, location_city, subscription_plan, category')
          .eq('is_seller', true)
          .eq('is_store_open', true)
          .limit(20);
        return data || [];
      }
    },
    staleTime: 1000 * 60 * 5, 
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshUserData();
    refetch();
  }, [refetch]);

  const renderMerchantCard = useCallback(({ item }: { item: any }) => {
    const isDiamond = item.subscription_plan === 'diamond';
    const isLocal = item.location_city === currentUser?.location_city;
    
    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          { 
            backgroundColor: theme.surface,
            borderColor: isDiamond ? '#8B5CF6' : 'transparent',
            borderWidth: isDiamond ? 1.5 : 0,
            shadowColor: theme.text,
          }
        ]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.selectionAsync();
          router.push(item.id === currentUser?.id ? '/profile' : `/profile/${item.id}` as any);
        }}
      >
        <View style={styles.cardHeader}>
          {item.category && (
            <Text style={[styles.categoryBadge, { color: theme.subtext }]}>
              {item.category.toUpperCase()}
            </Text>
          )}
          {isDiamond && <Gem size={12} color="#8B5CF6" fill="#8B5CF6" />}
        </View>

        <View style={styles.imageContainer}>
          <Image 
            source={item.logo_url || 'https://via.placeholder.com/150'} 
            style={styles.logo}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={[styles.brandName, { color: theme.text }]} numberOfLines={1}>
            {(item.display_name || item.slug || 'Store').toUpperCase()}
          </Text>
          
          <View style={styles.metaRow}>
            <MapPin size={10} color={isLocal ? Colors.brand.emerald : theme.subtext} />
            <Text 
              style={[
                styles.metaText, 
                { color: isLocal ? Colors.brand.emerald : theme.subtext }
              ]} 
              numberOfLines={1}
            >
              {(item.location_city || 'Global').toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [theme, currentUser]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 📱 SEARCH HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
        <View style={styles.titleRow}>
           <Text style={[styles.title, { color: theme.text }]}>DISCOVER</Text>
           <Zap size={20} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <SearchIcon size={18} color={theme.subtext} strokeWidth={2.5} />
          <TextInput 
            placeholder="Search stores..."
            placeholderTextColor={theme.subtext}
            style={[styles.input, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              refetch();
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); refetch(); }}>
              <X size={18} color={theme.subtext} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 🧬 CATEGORY HORIZONTAL BAR */}
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
                  backgroundColor: selectedCategory === item ? theme.text : 'transparent',
                  borderColor: theme.border,
                  borderWidth: selectedCategory === item ? 0 : 1.5
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

      {/* 🛍️ MERCHANT GRID */}
      <FlatList 
        data={merchants}
        keyExtractor={(item) => `merchant-${item.id}`}
        renderItem={renderMerchantCard}
        
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }} // 🛡️ PERFECT GRID
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: COLUMN_GAP }}
        
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
        
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}

        ListEmptyComponent={() => {
          if (isLoading) return (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.brand.emerald} />
              <Text style={[styles.loaderText, { color: theme.subtext }]}>CURATING STORES...</Text>
            </View>
          );
          return (
            <View style={styles.emptyState}>
              <View style={[styles.emptyCircle, { backgroundColor: theme.surface }]}>
                <SlidersHorizontal size={32} color={theme.subtext} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>NO STORES FOUND</Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>
                Adjust your filters to discover more brands.
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 15, zIndex: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, borderRadius: 16, gap: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', height: '100%' },
  
  filterContainer: { marginBottom: 15 },
  filterList: { paddingHorizontal: 20, gap: 10 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  filterText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  
  // CARD STYLES
  card: { width: CARD_WIDTH, borderRadius: 24, padding: 15, alignItems: 'center', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  cardHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  
  imageContainer: { width: 70, height: 70, borderRadius: 25, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.03)', marginBottom: 12 },
  logo: { width: '100%', height: '100%' },
  
  cardInfo: { alignItems: 'center', width: '100%', gap: 4 },
  brandName: { fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: 0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loaderText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.5 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  emptyTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  emptySub: { fontSize: 12, fontWeight: '500', opacity: 0.6, textAlign: 'center', paddingHorizontal: 60 }
});