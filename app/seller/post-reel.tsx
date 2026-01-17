import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, Dimensions, Image, FlatList, Switch, Platform,
  SafeAreaView
} from 'react-native';

import { useRouter } from 'expo-router';
import { 
  ChevronLeft, X, ShoppingBag, 
  CheckCircle2, Film, Sparkles,
  Zap, Clock, Search, Scissors
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video'; 
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 VIDEO STUDIO v79.1 (Pure Build Hardened)
 * Audited: Section V Cinematic Layer & Section I Identity Anchoring.
 * Fixed: Storage Handshake, 12H Story Mirroring, and SafeArea Clipping.
 */
export default function PostReelScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0); 
  const [description, setDescription] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [mirrorToStory, setMirrorToStory] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
    if (videoUri) p.play();
  });

  useEffect(() => {
    if (profile?.id) fetchVendorProducts();
  }, [profile?.id]);

  const fetchVendorProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_urls')
        .eq('seller_id', profile?.id)
        .eq('is_active', true);
      
      setProducts(data || []);
    } catch (e) {
      console.error("Registry Catalog Sync Failure", e);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }, [catalogSearch, products]);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60, // 🏛️ Manifest Section V Limit: 60 Seconds
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setVideoDuration(result.assets[0].duration ? result.assets[0].duration / 1000 : 0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  /**
   * 🛡️ VIDEO BROADCAST PROTOCOL
   * Logic: Uploads to sovereign storage and registers the reel + optional story mirror.
   */
  const handlePost = async () => {
    if (!videoUri || !selectedProduct || !description || !profile?.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert("Required Info", "Please tag a product and add a caption to deploy your reel.");
    }

    setLoading(true);
    setUploadProgress(10);

    try {
      // 1. Storage Handshake
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const fileName = `${profile.id}/reel_${Date.now()}.mp4`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('reels') 
        .upload(fileName, blob, { 
            contentType: 'video/mp4',
            upsert: true
        });

      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(fileName);
      setUploadProgress(70);

      // 2. Register in Video Registry (Manifest Section V)
      const { error: dbError } = await supabase.from('reels').insert({
        seller_id: profile.id,
        video_url: publicUrl,
        product_id: selectedProduct.id,
        caption: description.trim(),
        duration: videoDuration
      });

      if (dbError) throw dbError;

      // 3. 🛡️ 12H VORTEX MIRRORING
      if (mirrorToStory) {
        const expiryTime = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

        await supabase.from('stories').insert({
          seller_id: profile.id,
          media_url: publicUrl,
          type: 'video',
          linked_product_id: selectedProduct.id,
          expires_at: expiryTime 
        });
      }

      setUploadProgress(100);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
      
    } catch (e: any) {
      console.error("Video Registry Failure:", e.message);
      Alert.alert("Registry Error", "Could not broadcast transmission. Please check your data connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={theme.text} size={28} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>VIDEO STUDIO</Text>
        <TouchableOpacity 
          onPress={handlePost} 
          disabled={loading || !selectedProduct || !videoUri}
          style={[styles.deployBtn, { backgroundColor: theme.text }, (loading || !selectedProduct || !videoUri) && styles.deployDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.background} />
          ) : (
            <Text style={[styles.deployText, { color: theme.background }]}>POST</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={[styles.videoHero, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={pickVideo}
        >
          {videoUri ? (
            <View style={styles.previewContainer}>
                <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
                <View style={styles.previewOverlay}>
                  <BlurView intensity={35} tint="dark" style={styles.durationBadge}>
                    <Clock color="white" size={12} />
                    <Text style={styles.durationText}>{videoDuration.toFixed(0)}s / 60s</Text>
                  </BlurView>
                  <TouchableOpacity style={styles.trimBtn} onPress={pickVideo}>
                    <Scissors color="white" size={14} />
                    <Text style={styles.trimText}>CHANGE</Text>
                  </TouchableOpacity>
                </View>
            </View>
          ) : (
            <View style={{backgroundColor: 'transparent', alignItems: 'center'}}>
              <View style={[styles.playCircle, { backgroundColor: Colors.brand.emerald + '20' }]}>
                <Film color={Colors.brand.emerald} size={32} />
              </View>
              <Text style={[styles.placeholderTitle, { color: theme.text }]}>Upload Video</Text>
              <Text style={[styles.placeholderSub, { color: theme.subtext }]}>9:16 vertical video (Max 60s)</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
            <Zap size={14} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>TAG A PRODUCT *</Text>
        </View>

        {selectedProduct ? (
          <View style={[styles.selectedCard, { backgroundColor: theme.surface, borderColor: Colors.brand.emerald }]}>
            <Image source={{ uri: selectedProduct.image_urls[0] }} style={styles.selectedImg} />
            <View style={{flex: 1, marginLeft: 15, backgroundColor: 'transparent'}}>
              <Text style={[styles.selectedName, { color: theme.text }]}>{selectedProduct.name.toUpperCase()}</Text>
              <Text style={styles.selectedPrice}>₦{selectedProduct.price.toLocaleString()}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.removeBtn}>
                <X color="#EF4444" size={16} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.tagBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowProductPicker(true)}>
            <ShoppingBag color={theme.text} size={20} />
            <Text style={[styles.tagBtnText, { color: theme.subtext }]}>Select product to tag...</Text>
          </TouchableOpacity>
        )}

        <View style={styles.form}>
            <Text style={[styles.sectionLabel, { marginTop: 25, marginBottom: 10 }]}>VIDEO CAPTION</Text>
            <TextInput 
              placeholder="Write a cinematic description..." 
              placeholderTextColor={theme.subtext}
              style={[styles.captionInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]} 
              multiline 
              value={description}
              onChangeText={setDescription}
            />
        </View>

        <View style={[styles.mirrorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <View style={[styles.row, { backgroundColor: 'transparent' }]}>
                  <Sparkles size={16} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
                  <Text style={[styles.mirrorTitle, { color: theme.text }]}>SHARE TO STORIES</Text>
              </View>
              <Text style={[styles.mirrorSub, { color: theme.subtext }]}>This will promote your video in the Story Vortex for 12 hours.</Text>
            </View>
            <Switch 
              value={mirrorToStory} 
              onValueChange={setMirrorToStory}
              trackColor={{ false: theme.border, true: Colors.brand.emerald }}
              thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
            />
        </View>
      </ScrollView>

      {/* 🏬 PRODUCT SELECTOR OVERLAY */}
      {showProductPicker && (
        <View style={[styles.pickerOverlay, { backgroundColor: theme.background }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
              <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
                <Search size={18} color={theme.subtext} />
                <TextInput 
                  placeholder="Search products..." 
                  placeholderTextColor={theme.subtext}
                  style={[styles.searchInput, { color: theme.text }]}
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                  autoFocus
                />
              </View>
              <TouchableOpacity onPress={() => setShowProductPicker(false)} style={styles.closeBtn}>
                <X color={theme.text} size={24} />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 25 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.pickerItem, { backgroundColor: theme.surface }]} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedProduct(item);
                    setShowProductPicker(false);
                  }}
                >
                  <Image source={{ uri: item.image_urls[0] }} style={styles.pickerImg} />
                  <View style={{flex: 1, marginLeft: 15, backgroundColor: 'transparent'}}>
                    <Text style={[styles.pickerName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={styles.pickerPrice}>₦{item.price.toLocaleString()}</Text>
                  </View>
                  <CheckCircle2 color={Colors.brand.emerald} size={20} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.subtext, marginTop: 50 }}>No products found.</Text>}
            />
          </SafeAreaView>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <BlurView intensity={90} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.brand.emerald} />
            <Text style={[styles.loadingText, { color: theme.text }]}>BROADCASTING... {uploadProgress}%</Text>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: Colors.brand.emerald }]} />
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 10 : 40, borderBottomWidth: 1 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  deployBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16 },
  deployDisabled: { opacity: 0.15 },
  deployText: { fontWeight: '900', fontSize: 11 },
  body: { padding: 25, paddingBottom: 60 },
  videoHero: { width: '100%', height: 480, borderRadius: 36, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  previewContainer: { flex: 1, width: '100%' },
  previewOverlay: { position: 'absolute', top: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' },
  durationText: { color: 'white', fontSize: 10, fontWeight: '900' },
  trimBtn: { backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, height: 36, justifyContent: 'center' },
  trimText: { color: 'white', fontSize: 10, fontWeight: '900' },
  playCircle: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  placeholderTitle: { fontSize: 18, fontWeight: '900' },
  placeholderSub: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 40, marginBottom: 15 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  tagBtn: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 28, gap: 15, borderWidth: 1.5 },
  tagBtnText: { fontWeight: '700', fontSize: 14 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, borderWidth: 2 },
  selectedImg: { width: 48, height: 48, borderRadius: 12 },
  selectedName: { fontSize: 13, fontWeight: '900' },
  selectedPrice: { fontSize: 13, fontWeight: '800', color: '#10B981', marginTop: 2 },
  removeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  form: { marginTop: 10 },
  captionInput: { borderRadius: 28, padding: 22, height: 120, textAlignVertical: 'top', fontSize: 15, fontWeight: '600', borderWidth: 1 },
  mirrorCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 32, marginTop: 35, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mirrorTitle: { fontSize: 14, fontWeight: '900' },
  mirrorSub: { fontSize: 11, fontWeight: '500', marginTop: 6, lineHeight: 16 },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15, borderBottomWidth: 1.5, paddingTop: Platform.OS === 'ios' ? 10 : 40 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 55, borderRadius: 18, gap: 10 },
  searchInput: { flex: 1, fontWeight: '700' },
  closeBtn: { padding: 5 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, marginBottom: 15 },
  pickerImg: { width: 50, height: 60, borderRadius: 12 },
  pickerName: { fontSize: 14, fontWeight: '900' },
  pickerPrice: { fontSize: 13, color: '#10B981', fontWeight: '800' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loadingCard: { width: '85%', padding: 35, borderRadius: 36, alignItems: 'center' },
  loadingText: { marginTop: 22, fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  progressBar: { width: '100%', height: 8, borderRadius: 4, marginTop: 25, overflow: 'hidden' },
  progressFill: { height: '100%' }
});