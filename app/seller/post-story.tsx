import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, Image, 
  Dimensions, ActivityIndicator, Alert, ScrollView, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, ShoppingBag, Send, Check, Gem, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { decode } from 'base64-arraybuffer';

// 🛡️ SDK 54 STABILITY BRIDGE
import * as FileSystem from 'expo-file-system/legacy';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width, height } = Dimensions.get('window');

/**
 * 🏰 STORY STUDIO v96.0
 * Purpose: A fast creation tool for sharing 12-hour disappearing photos.
 * Features: Product tagging, premium Diamond styling, and safe-area compatibility.
 */
export default function PostStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  const [media, setMedia] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // PREMIUM DETECTION
  const isDiamond = profile?.subscription_plan === 'diamond';

  useEffect(() => {
    if (profile?.id) fetchMyProducts();
  }, [profile?.id]);

  const fetchMyProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('seller_id', profile?.id)
        .eq('is_active', true);
      setMerchantProducts(data || []);
    } catch (e) {
      console.error("Failed to load products");
    }
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16], 
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  /** 🛡️ UPLOAD PROCESS */
  const handlePublish = async () => {
    if (!media || !profile?.id) return Alert.alert("Photo Required", "Please select a photo to share your story.");
    
    setLoading(true);
    try {
      const fileExt = media.split('.').pop() || 'jpg';
      const fileName = `${profile.id}/drop_${Date.now()}.${fileExt}`;
      
      // Reading file using the SDK 54 stable path
      const base64 = await (FileSystem as any).readAsStringAsync(media, { encoding: 'base64' });
      if (!base64) throw new Error("File read error");
      
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, decode(base64), { 
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true 
        });

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(fileName);

      // Precise 12-hour expiry calculation
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
      Alert.alert("Post Error", "We couldn't share your story. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: media ? 'black' : theme.background }]}>
      {media ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: media }} style={styles.fullPreview} />
          
          <View style={[styles.overlay, { paddingTop: insets.top || 20, paddingBottom: insets.bottom || 20 }]}>
            <View style={styles.topControls}>
              <TouchableOpacity onPress={() => setMedia(null)} style={styles.iconBtn}>
                <X color="white" size={28} strokeWidth={2.5} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowProductPicker(true);
                }} 
                style={[
                  styles.tagBtn, 
                  selectedProductId && { backgroundColor: isDiamond ? '#8B5CF6' : Colors.brand.emerald, borderColor: 'white' }
                ]}
              >
                {selectedProductId ? <Check color="white" size={18} strokeWidth={3} /> : <ShoppingBag color="white" size={18} />}
                <Text style={styles.tagBtnText}>
                  {selectedProductId ? 'ITEM TAGGED' : 'TAG PRODUCT'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
               <TouchableOpacity 
                style={[styles.publishBtn, isDiamond && { backgroundColor: '#8B5CF6' }]} 
                onPress={handlePublish}
                disabled={loading}
               >
                 {loading ? <ActivityIndicator color="white" /> : (
                   <>
                    <Text style={[styles.publishText, isDiamond && { color: 'white' }]}>SHARE STORY</Text>
                    {isDiamond ? <Sparkles color="white" size={20} /> : <Send color="#111827" size={20} />}
                   </>
                 )}
               </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.captureEmpty, { paddingTop: insets.top || 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <X color={theme.text} size={28} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.emptyContent}>
             <View style={[styles.cameraCircle, { backgroundColor: theme.surface }, isDiamond && { borderColor: '#8B5CF6', borderWidth: 2 }]}>
                {isDiamond ? <Gem color="#8B5CF6" size={48} /> : <Camera color={theme.text} size={48} strokeWidth={1.5} />}
             </View>
             <Text style={[styles.emptyTitle, { color: theme.text }]}>
               {isDiamond ? 'PREMIUM DROP' : 'ADD STORY'}
             </Text>
             <Text style={[styles.emptySub, { color: theme.subtext }]}>
               Share photos of your products that disappear after 12 hours.
             </Text>
             
             <TouchableOpacity 
               style={[styles.selectBtn, { backgroundColor: isDiamond ? '#8B5CF6' : theme.text }]} 
               onPress={pickMedia}
             >
                <Text style={[styles.selectBtnText, { color: isDiamond ? 'white' : theme.background }]}>SELECT PHOTO</Text>
             </TouchableOpacity>
          </View>
        </View>
      )}

      {showProductPicker && (
        <View style={styles.pickerBackdrop}>
           <View style={[styles.pickerSheet, { backgroundColor: theme.background, paddingBottom: insets.bottom || 25 }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>TAG AN ITEM</Text>
                <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                    <Text style={{ fontWeight: '900', color: isDiamond ? '#8B5CF6' : Colors.brand.emerald }}>DONE</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                {merchantProducts.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[
                      styles.pItem, 
                      { backgroundColor: theme.surface }, 
                      selectedProductId === p.id && { borderColor: isDiamond ? '#8B5CF6' : Colors.brand.emerald, borderWidth: 2 }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedProductId(p.id === selectedProductId ? null : p.id);
                    }}
                  >
                    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                        <Text style={[styles.pName, { color: theme.text }]}>{p.name.toUpperCase()}</Text>
                        <Text style={[styles.pPrice, { color: theme.subtext }]}>₦{p.price.toLocaleString()}</Text>
                    </View>
                    {selectedProductId === p.id && <Check color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} size={20} strokeWidth={4} />}
                  </TouchableOpacity>
                ))}
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
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 25 },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 24 },
  tagBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  tagBtnText: { color: 'white', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  bottomControls: { alignItems: 'center', marginBottom: 20 },
  publishBtn: { backgroundColor: 'white', height: 70, borderRadius: 35, paddingHorizontal: 45, flexDirection: 'row', alignItems: 'center', gap: 15, elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15 },
  publishText: { color: '#111827', fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },
  captureEmpty: { flex: 1 },
  backBtn: { padding: 25 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 45 },
  cameraCircle: { width: 130, height: 130, borderRadius: 65, justifyContent: 'center', alignItems: 'center', marginBottom: 35 },
  emptyTitle: { fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
  emptySub: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 26, fontWeight: '500', opacity: 0.8 },
  selectBtn: { paddingHorizontal: 45, paddingVertical: 22, borderRadius: 24, marginTop: 45, elevation: 4 },
  selectBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', zIndex: 100 },
  pickerSheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '65%', padding: 30 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  pickerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2, opacity: 0.6 },
  pickerList: { flex: 1 },
  pItem: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 24, marginBottom: 12, borderWidth: 1.5, borderColor: 'transparent' },
  pName: { fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  pPrice: { fontSize: 13, fontWeight: '700', marginTop: 4, opacity: 0.7 }
});