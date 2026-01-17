import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TextInput, TouchableOpacity, 
  Image, ActivityIndicator, Dimensions, Platform 
} from 'react-native';
import { Search as SearchIcon, MapPin, Gem, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router'; // 🛠️ Added useFocusEffect

// Components
import { View, Text } from '../../src/components/Themed';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

/**
 * 🏰 DISCOVERY HUB v90.0 (High-Fidelity Build)
 * Audited: Standard UI Compatibility & Balanced Identity Layer.
 * Fixed: Auto-sync on focus for real-time merchant updates.
 */
export default function SearchScreen() {
  const router = useRouter();
  const { profile: currentUser, refreshUserData } = useUserStore();
  const theme = Colors[useColorScheme() ?? 'light'];

  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const categories = [
    'All', 'Fashion', 'Beauty', 'Electronics', 
    'Home', 'Wellness', 'Services', 'Real Estate', 'Automotive'
  ];

  /** 🛠️ AUTO-SYNC: Refreshes discovery list when user navigates back */
  useFocusEffect(
    useCallback(() => {
      fetchMerchants(0, true);
      return () => {};
    }, [selectedCategory, currentUser?.location])
  );

  const fetchMerchants = async (pageIndex: number, isNewSearch: boolean) => {
    try {
      if (isNewSearch) {
        setLoading(true);
        setPage(0);
      }
      
      let query = supabase
        .from('profiles')
        .select('id, slug, display_name, logo_url, location, prestige_weight, category')
        .eq('is_seller', true);

      query = query
        .order('prestige_weight', { ascending: false })
        .order('display_name', { ascending: true })
        .range(pageIndex * 30, (pageIndex + 1) * 30 - 1);

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory.toLowerCase());
      }

      if (searchQuery) {
        query = query.or(`display_name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        // Apply social gravity: Prioritize local matches
        const localizedData = [...data].sort((a, b) => {
          if (a.prestige_weight !== b.prestige_weight) return 0;
          const aMatch = a.location === currentUser?.location;
          const bMatch = b.location === currentUser?.location;
          return (aMatch === bMatch) ? 0 : aMatch ? -1 : 1;
        });

        setMerchants(prev => isNewSearch ? localizedData : [...prev, ...localizedData]);
        setHasMore(data.length === 30);
      }
    } catch (e) {
      console.error("Discovery Sync Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMerchants(nextPage, false);
    }
  };

  const handleSearchTrigger = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchMerchants(0, true);
  };

  const renderMerchantCard = ({ item }: { item: any }) => {
    const isDiamond = item.prestige_weight === 3;
    const isLocal = item.location === currentUser?.location;
    const isMe = item.id === currentUser?.id;
    
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.surface }]}
        activeOpacity={0.9}
        onPress={() => {
          Haptics.selectionAsync();
          if (isMe) {
            router.push('/profile');
          } else {
            router.push(`/profile/${item.id}`);
          }
        }}
      >
        <View style={styles.imageWrapper}>
          <View style={[styles.logoContainer, isDiamond && styles.diamondBorder]}>
            <Image 
              source={{ uri: item.logo_url || 'https://via.placeholder.com/150' }} 
              style={styles.logo} 
            />
          </View>
          {isDiamond && (
            <View style={styles.diamondBadge}>
              <Gem size={10} color="white" fill="white" />
            </View>
          )}
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={[styles.brandName, { color: theme.text }]} numberOfLines={1}>
            {(item.display_name || item.slug || 'Merchant').toUpperCase()}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={10} color={isLocal ? Colors.brand.emerald : theme.subtext} />
            <Text style={[styles.metaText, { color: isLocal ? Colors.brand.emerald : theme.subtext }]} numberOfLines={1}>
              {item.location?.toUpperCase() || 'NIGERIA'}
            </Text>
          </View>
          <View style={[styles.tagPill, { backgroundColor: theme.background }]}>
            <Text style={styles.categoryTag}>{item.category?.toUpperCase() || 'SHOP'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <SearchIcon size={18} color={theme.subtext} />
          <TextInput 
            placeholder="Search brands or @handle"
            placeholderTextColor={theme.subtext}
            style={[styles.input, { color: theme.text }]}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text === "") fetchMerchants(0, true);
            }}
            onSubmitEditing={handleSearchTrigger}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchMerchants(0, true); }}>
              <X size={16} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FlatList 
          horizontal
          data={categories}
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
                { backgroundColor: theme.surface },
                selectedCategory === item && { backgroundColor: Colors.brand.emerald }
              ]}
            >
              <Text style={[
                styles.filterText, 
                { color: theme.subtext },
                selectedCategory === item && { color: 'white' }
              ]}>{item.toUpperCase()}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && page === 0 ? (
        <View style={styles.center}><ActivityIndicator color={Colors.brand.emerald} size="large" /></View>
      ) : (
        <FlatList 
          data={merchants}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={renderMerchantCard}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          onRefresh={() => {
              refreshUserData();
              fetchMerchants(0, true);
          }}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ margin: 20 }} color={Colors.brand.emerald} /> : null}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Text style={{ color: theme.subtext, fontWeight: '800', letterSpacing: 1 }}>NO BRANDS DISCOVERED</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, height: 56, borderRadius: 20, gap: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '700' },
  filterContainer: { marginBottom: 24 },
  filterList: { paddingHorizontal: 20, gap: 10 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  filterText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  row: { justifyContent: 'space-between' },
  
  // 📸 NEW: Premium Card Design
  card: { 
    width: COLUMN_WIDTH, 
    borderRadius: 24, 
    padding: 16, 
    marginBottom: 20, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  imageWrapper: { width: 80, height: 80, marginBottom: 15, position: 'relative' },
  logoContainer: { width: 80, height: 80, borderRadius: 28, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  logo: { width: '100%', height: '100%', resizeMode: 'cover' },
  diamondBorder: { borderWidth: 3, borderColor: Colors.brand.violet },
  diamondBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: Colors.brand.violet, padding: 6, borderRadius: 12, borderWidth: 3, borderColor: '#FFF' },
  
  cardInfo: { alignItems: 'center', width: '100%' },
  brandName: { fontSize: 12, fontWeight: '900', textAlign: 'center', letterSpacing: 0.3, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  metaText: { fontSize: 9, fontWeight: '800' },
  
  tagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryTag: { fontSize: 8, fontWeight: '900', color: Colors.brand.emerald, letterSpacing: 0.5 },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }
});