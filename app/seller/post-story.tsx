import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, Image, 
  Dimensions, ActivityIndicator, Alert, ScrollView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, ShoppingBag, Send, Zap, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width, height } = Dimensions.get('window');

/**
 * 🏰 STORY STUDIO v93.2 (Pure Build Hardened)
 * Audited: Section V Cinematic 12-Hour Burn & Section II Product Tagging.
 * Fixed: Storage Handshake & Registry Sync Finality.
 */
export default function PostStoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();

  const [media, setMedia] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    if (profile?.id) fetchMerchantProducts();
  }, [profile?.id]);

  const fetchMerchantProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('seller_id', profile?.id)
        .eq('is_active', true);
      setMerchantProducts(data || []);
    } catch (e) {
      console.error("Product Registry Sync Error:", e);
    }
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // 🏛️ STORY PROTOCOL: 9:16 vertical ratio
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  /**
   * 🛡️ STORY DEPLOYMENT PROTOCOL
   * Logic: Uploads to sovereign storage and sets the 12H auto-burn timer.
   */
  const handlePublish = async () => {
    if (!media || !profile?.id) return Alert.alert("Missing Content", "Select a photo to broadcast your drop.");
    
    setLoading(true);
    try {
      // 1. Asset Preparation
      const fileExt = media.split('.').pop() || 'jpg';
      const fileName = `${profile.id}/story_${Date.now()}.${fileExt}`;
      
      const response = await fetch(media);
      const blob = await response.blob();
      
      // 2. Storage Handshake
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, blob, { 
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(fileName);

      // 3. 🛡️ MANIFEST SECTION V: 12-Hour Burn Registry
      const expiryTime = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase.from('stories').insert({
        seller_id: profile.id,
        media_url: publicUrl,
        linked_product_id: selectedProductId,
        type: 'image',
        expires_at: expiryTime
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
      
    } catch (e: any) {
      console.error("Story Registry Failure:", e.message);
      Alert.alert("Post Error", "We couldn't broadcast your drop. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: media ? 'black' : theme.background }]}>
      {media ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: media }} style={styles.fullPreview} />
          
          <SafeAreaView style={styles.overlay}>
            <View style={styles.topControls}>
              <TouchableOpacity onPress={() => setMedia(null)} style={styles.iconBtn}>
                <X color="white" size={28} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowProductPicker(true);
                }} 
                style={[styles.tagBtn, selectedProductId && { backgroundColor: Colors.brand.emerald, borderColor: Colors.brand.emerald }]}
              >
                <ShoppingBag color="white" size={20} />
                <Text style={styles.tagBtnText}>
                  {selectedProductId ? 'PRODUCT TAGGED' : 'TAG PRODUCT'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
               <TouchableOpacity 
                style={styles.publishBtn} 
                onPress={handlePublish}
                disabled={loading}
               >
                 {loading ? <ActivityIndicator color="#111827" /> : (
                   <>
                    <Text style={styles.publishText}>SHARE DROP</Text>
                    <Send color="#111827" size={20} />
                   </>
                 )}
               </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      ) : (
        <SafeAreaView style={styles.captureEmpty}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <X color={theme.text} size={28} />
          </TouchableOpacity>
          <View style={styles.emptyContent}>
             <View style={[styles.cameraCircle, { backgroundColor: theme.surface }]}>
                <Camera color={theme.text} size={48} strokeWidth={1.5} />
             </View>
             <Text style={[styles.emptyTitle, { color: theme.text }]}>ADD STORY</Text>
             <Text style={[styles.emptySub, { color: theme.subtext }]}>Share instant drops that disappear after 12 hours.</Text>
             
             <TouchableOpacity style={[styles.selectBtn, { backgroundColor: theme.text }]} onPress={pickMedia}>
                <Text style={[styles.selectBtnText, { color: theme.background }]}>OPEN GALLERY</Text>
             </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {showProductPicker && (
        <View style={styles.pickerBackdrop}>
           <View style={[styles.pickerSheet, { backgroundColor: theme.background }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>TAG A PRODUCT</Text>
                <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                    <Text style={{ fontWeight: '900', color: Colors.brand.emerald }}>DONE</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                {merchantProducts.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.pItem, { backgroundColor: theme.surface }, selectedProductId === p.id && { borderColor: Colors.brand.emerald, borderWidth: 2 }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedProductId(p.id === selectedProductId ? null : p.id);
                    }}
                  >
                    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                        <Text style={[styles.pName, { color: theme.text }]}>{p.name.toUpperCase()}</Text>
                        <Text style={[styles.pPrice, { color: theme.subtext }]}>₦{p.price.toLocaleString()}</Text>
                    </View>
                    {selectedProductId === p.id && <Check color={Colors.brand.emerald} size={20} strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
                {merchantProducts.length === 0 && (
                  <Text style={[styles.emptySub, { marginTop: 40 }]}>No active products to tag.</Text>
                )}
              </ScrollView>
           </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  previewContainer: { flex: 1 },
  fullPreview: { width, height, resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20, backgroundColor: 'transparent' },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  iconBtn: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 20 },
  tagBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tagBtnText: { color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  bottomControls: { alignItems: 'center', marginBottom: 20, backgroundColor: 'transparent' },
  publishBtn: { backgroundColor: 'white', height: 65, borderRadius: 32, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 15, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  publishText: { color: '#111827', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  captureEmpty: { flex: 1, backgroundColor: 'transparent' },
  backBtn: { padding: 20, backgroundColor: 'transparent' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, backgroundColor: 'transparent' },
  cameraCircle: { width: 120, height: 120, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  emptyTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  emptySub: { fontSize: 16, textAlign: 'center', marginTop: 10, lineHeight: 24, fontWeight: '500' },
  selectBtn: { paddingHorizontal: 40, paddingVertical: 20, borderRadius: 20, marginTop: 40 },
  selectBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end', zIndex: 100 },
  pickerSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '60%', padding: 25 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, backgroundColor: 'transparent' },
  pickerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  pickerList: { flex: 1, backgroundColor: 'transparent' },
  pItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  pName: { fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  pPrice: { fontSize: 12, fontWeight: '700', marginTop: 2 }
});