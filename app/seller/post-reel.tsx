import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, Dimensions, Image, FlatList, Switch, Platform
} from 'react-native';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, X, ShoppingBag, 
  CheckCircle2, Film, Sparkles,
  Zap, Clock, Search, Scissors, Gem
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video'; 
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { decode } from 'base64-arraybuffer';

// 🛡️ SDK 54 STABILITY BRIDGE
import * as FileSystem from 'expo-file-system/legacy';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 VIDEO CREATOR v81.0
 * Logic: Secure Video Upload with 12-Hour Story Sharing.
 * Visual: Premium styling with clear upload progress.
 */
export default function PostReelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // 🛡️ PREMIUM PLAN CHECK
  const isDiamond = profile?.subscription_plan === 'diamond';

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
    if (videoUri) p.play();
  });

  useEffect(() => {
    if (profile?.id) fetchMyProducts();
  }, [profile?.id]);

  const fetchMyProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_urls')
        .eq('seller_id', profile?.id)
        .eq('is_active', true);
      
      setProducts(data || []);
    } catch (e) {
      console.error("Failed to load products");
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
      videoMaxDuration: 60, 
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setVideoDuration(result.assets[0].duration ? result.assets[0].duration / 1000 : 0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  /** 🛡️ UPLOAD PROCESS */
  const handlePost = async () => {
    if (!videoUri || !selectedProduct || !description || !profile?.id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert("Missing Info", "Please tag a product and add a caption to post your video.");
    }

    setLoading(true);
    setUploadProgress(15);

    try {
      const fileName = `${profile.id}/reel_${Date.now()}.mp4`;
      
      // Read video file
      const base64 = await (FileSystem as any).readAsStringAsync(videoUri, { encoding: 'base64' });
      if (!base64) throw new Error("Could not read video file");
      setUploadProgress(45);

      const { error: uploadError } = await supabase.storage
        .from('reels') 
        .upload(fileName, decode(base64), { 
            contentType: 'video/mp4',
            upsert: true
        });

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(fileName);
      setUploadProgress(75);

      // 1. Save video to main feed
      const { error: dbError } = await supabase.from('reels').insert({
        seller_id: profile.id,
        video_url: publicUrl,
        product_id: selectedProduct.id,
        caption: description.trim(),
        duration: videoDuration
      });

      if (dbError) throw dbError;

      // 2. Share to stories
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
      Alert.alert("Post Failed", "The upload was interrupted. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={theme.text} size={28} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>UPLOAD VIDEO</Text>
        <TouchableOpacity 
          onPress={handlePost} 
          disabled={loading || !selectedProduct || !videoUri}
          style={[
            styles.deployBtn, 
            { backgroundColor: isDiamond ? '#8B5CF6' : theme.text }, 
            (loading || !selectedProduct || !videoUri) && styles.deployDisabled
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={[styles.deployText, { color: isDiamond ? 'white' : theme.background }]}>POST</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={[styles.videoHero, { backgroundColor: theme.surface, borderColor: isDiamond ? '#8B5CF6' : theme.border }]} 
          onPress={pickVideo}
        >
          {videoUri ? (
            <View style={styles.previewContainer}>
                <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
                <View style={styles.previewOverlay}>
                  <BlurView intensity={40} tint="dark" style={styles.durationBadge}>
                    <Clock color="white" size={12} />
                    <Text style={styles.durationText}>{videoDuration.toFixed(0)}s / 60s</Text>
                  </BlurView>
                  <TouchableOpacity style={styles.trimBtn} onPress={pickVideo}>
                    <Scissors color="white" size={14} />
                    <Text style={styles.trimText}>REPLACE</Text>
                  </TouchableOpacity>
                </View>
            </View>
          ) : (
            <View style={{backgroundColor: 'transparent', alignItems: 'center'}}>
              <View style={[styles.playCircle, { backgroundColor: isDiamond ? '#F5F3FF' : Colors.brand.emerald + '15' }]}>
                {isDiamond ? <Sparkles color="#8B5CF6" size={32} /> : <Film color={Colors.brand.emerald} size={32} />}
              </View>
              <Text style={[styles.placeholderTitle, { color: theme.text }]}>Upload a Short Video</Text>
              <Text style={[styles.placeholderSub, { color: theme.subtext }]}>Vertical format (Max 60 seconds)</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
            {isDiamond ? <Gem size={14} color="#8B5CF6" fill="#8B5CF6" /> : <Zap size={14} color={Colors.brand.emerald} fill={Colors.brand.emerald} />}
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>TAG A PRODUCT *</Text>
        </View>

        {selectedProduct ? (
          <View style={[styles.selectedCard, { backgroundColor: theme.surface, borderColor: isDiamond ? '#8B5CF6' : Colors.brand.emerald }]}>
            <Image source={{ uri: selectedProduct.image_urls[0] }} style={styles.selectedImg} />
            <View style={{flex: 1, marginLeft: 15, backgroundColor: 'transparent'}}>
              <Text style={[styles.selectedName, { color: theme.text }]}>{selectedProduct.name.toUpperCase()}</Text>
              <Text style={[styles.selectedPrice, { color: isDiamond ? '#8B5CF6' : Colors.brand.emerald }]}>₦{selectedProduct.price.toLocaleString()}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.removeBtn}>
                <X color="#EF4444" size={16} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.tagBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowProductPicker(true)}>
            <ShoppingBag color={theme.text} size={20} />
            <Text style={[styles.tagBtnText, { color: theme.subtext }]}>Select an item to link...</Text>
          </TouchableOpacity>
        )}

        <View style={styles.form}>
            <Text style={[styles.sectionLabel, { marginTop: 30, marginBottom: 12 }]}>POST CAPTION</Text>
            <TextInput 
              placeholder="Tell people about this item..." 
              placeholderTextColor={`${theme.subtext}80`}
              style={[styles.captionInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]} 
              multiline 
              value={description}
              onChangeText={setDescription}
            />
        </View>

        <View style={[styles.mirrorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <View style={[styles.row, { backgroundColor: 'transparent' }]}>
                  <Sparkles size={16} color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} />
                  <Text style={[styles.mirrorTitle, { color: theme.text }]}>SHARE TO STORIES</Text>
              </View>
              <Text style={[styles.mirrorSub, { color: theme.subtext }]}>Reach more people by automatically sharing this video to your story for 12 hours.</Text>
            </View>
            <Switch 
              value={mirrorToStory} 
              onValueChange={setMirrorToStory}
              trackColor={{ false: theme.border, true: isDiamond ? '#A78BFA' : Colors.brand.emerald }}
              thumbColor={mirrorToStory ? (isDiamond ? '#8B5CF6' : '#FFF') : '#FFF'}
            />
        </View>
      </ScrollView>

      {/* 🛡️ PRODUCT SELECTOR */}
      {showProductPicker && (
        <View style={[styles.pickerOverlay, { backgroundColor: theme.background }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
              <Search size={18} color={theme.subtext} />
              <TextInput 
                placeholder="Search your items..." 
                placeholderTextColor={theme.subtext}
                style={[styles.searchInput, { color: theme.text }]}
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                autoFocus
              />
            </View>
            <TouchableOpacity onPress={() => setShowProductPicker(false)} style={styles.closeBtn}>
              <X color={theme.text} size={24} strokeWidth={2.5} />
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
                  <Text style={[styles.pickerName, { color: theme.text }]}>{item.name.toUpperCase()}</Text>
                  <Text style={[styles.pickerPrice, { color: isDiamond ? '#8B5CF6' : Colors.brand.emerald }]}>₦{item.price.toLocaleString()}</Text>
                </View>
                <CheckCircle2 color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} size={22} fill={isDiamond ? '#F5F3FF' : 'transparent'} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.subtext, marginTop: 50, fontWeight: '700' }}>No products found.</Text>}
          />
        </View>
      )}

      {/* 🛡️ UPLOAD STATUS */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <BlurView intensity={90} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.loadingCard}>
            <ActivityIndicator size="large" color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} />
            <Text style={[styles.loadingText, { color: theme.text }]}>UPLOADING VIDEO... {uploadProgress}%</Text>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: isDiamond ? '#8B5CF6' : Colors.brand.emerald }]} />
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  deployBtn: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 16, elevation: 4 },
  deployDisabled: { opacity: 0.1 },
  deployText: { fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  body: { padding: 25, paddingBottom: 100 },
  videoHero: { width: '100%', height: 480, borderRadius: 36, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  previewContainer: { flex: 1, width: '100%' },
  previewOverlay: { position: 'absolute', top: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' },
  durationText: { color: 'white', fontSize: 10, fontWeight: '900' },
  trimBtn: { backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 14, height: 38, justifyContent: 'center' },
  trimText: { color: 'white', fontSize: 10, fontWeight: '900' },
  playCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  placeholderTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  placeholderSub: { fontSize: 14, fontWeight: '600', marginTop: 10, opacity: 0.6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 45, marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  tagBtn: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 32, gap: 15, borderWidth: 1.5 },
  tagBtnText: { fontWeight: '700', fontSize: 14 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 28, borderWidth: 2.5 },
  selectedImg: { width: 54, height: 54, borderRadius: 14 },
  selectedName: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  selectedPrice: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  removeBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  form: { marginTop: 10 },
  captionInput: { borderRadius: 28, padding: 25, height: 140, textAlignVertical: 'top', fontSize: 16, fontWeight: '600', borderWidth: 1.5 },
  mirrorCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 32, marginTop: 40, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mirrorTitle: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  mirrorSub: { fontSize: 11, fontWeight: '500', marginTop: 8, lineHeight: 18, opacity: 0.7 },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15, borderBottomWidth: 1.5 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, height: 56, borderRadius: 20, gap: 12 },
  searchInput: { flex: 1, fontWeight: '700', fontSize: 15 },
  closeBtn: { padding: 10 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 26, marginBottom: 16 },
  pickerImg: { width: 56, height: 68, borderRadius: 14 },
  pickerName: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  pickerPrice: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loadingCard: { width: '88%', padding: 40, borderRadius: 40, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  loadingText: { marginTop: 25, fontWeight: '900', fontSize: 11, letterSpacing: 1.5, textAlign: 'center' },
  progressBar: { width: '100%', height: 10, borderRadius: 5, marginTop: 30, overflow: 'hidden' },
  progressFill: { height: '100%' }
});