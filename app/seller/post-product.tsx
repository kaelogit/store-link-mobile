import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, Dimensions, Image, Switch, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, Camera, X, Tag, DollarSign, 
  Layers, Package, AlignLeft, Sparkles, Send, Wand2
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { removeBackgroundAI } from '../../src/utils/aiAssistant';

const { width } = Dimensions.get('window');

/**
 * 🏰 PRODUCT STUDIO v92.3 (Pure Build Hardened)
 * Audited: Section I Diamond Gating & Section II Studio Assets.
 * Fixed: Multi-Asset Upload Registry & 4:5 Aspect Ratio Locking.
 */
export default function PostProductScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile } = useUserStore();
  
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [postToStory, setPostToStory] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [globalCategories, setGlobalCategories] = useState<any[]>([]);

  const isDiamond = profile?.prestige_weight === 3;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setGlobalCategories(data);
    } catch (e) {
      console.error("Category Registry Sync Failure");
    }
  };

  const pickImages = async () => {
    if (images.length >= 4) return Alert.alert("Limit Reached", "Max 4 photos allowed.");
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      aspect: [4, 5], // 🏛️ MANIFEST STANDARD: 1.25 Ratio
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  /**
   * 🪄 AI STUDIO CLEAN (Diamond Only)
   * Logic: Subject isolation for professional showroom assets.
   */
  const processAIBackground = async (index: number) => {
    if (!isDiamond) return;
    
    setIsAIProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      const result = await removeBackgroundAI(images[index]);
      if (result) {
        const newImages = [...images];
        newImages[index] = result;
        setImages(newImages);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (e) {
      Alert.alert("AI Lane Busy", "Processing failed. Original photo retained.");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  /**
   * 🛡️ ASSET DEPLOYMENT PROTOCOL
   * Logic: Multi-stage upload to storage followed by product registry insertion.
   */
  const handleDeploy = async () => {
    if (images.length === 0 || !name || !price || !category || !stock || !description) {
      return Alert.alert("Required Fields", "Please add photos and fill all details.");
    }

    setLoading(true);
    try {
      // 1. Storage Registry Upload
      const uploadedUrls = await Promise.all(
        images.map(async (uri, idx) => {
          const fileExt = uri.split('.').pop() || 'jpg';
          const fileName = `${profile?.id}/prod_${Date.now()}_${idx}.${fileExt}`;
          
          const response = await fetch(uri);
          const blob = await response.blob();

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, blob, { 
              contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
              upsert: true 
            });

          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
          return publicUrl;
        })
      );

      // 2. Marketplace Handshake (Manifest Section II)
      const { data: product, error: productError } = await supabase.from('products').insert({
        seller_id: profile?.id,
        name: name.trim(),
        price: parseFloat(price),
        stock_quantity: parseInt(stock),
        description: description.trim(),
        category: category.toLowerCase().trim(),
        image_urls: uploadedUrls,
        image_ratio: 1.25, // Immutable Constant
        is_active: true
      }).select().single();

      if (productError) throw productError;

      // 3. 🛡️ 12H VORTEX MIRROR (Manifest Section V)
      if (postToStory && product) {
        await supabase.from('stories').insert({
          seller_id: profile?.id,
          media_url: uploadedUrls[0],
          type: 'image',
          linked_product_id: product.id,
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error("Product Deployment Failure:", e.message);
      Alert.alert("Deployment Error", "Could not post product. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={theme.text} size={30} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>ADD PRODUCT</Text>
        <TouchableOpacity 
            onPress={handleDeploy} 
            disabled={loading || isAIProcessing} 
            style={[styles.deployBtn, { backgroundColor: theme.text }, (loading || isAIProcessing) && { opacity: 0.5 }]}
        >
          {loading ? <ActivityIndicator size="small" color={theme.background} /> : <Text style={[styles.deployText, { color: theme.background }]}>POST</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        
        {/* 🖼️ ASSET GRID (4:5 RATIO) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList} contentContainerStyle={styles.imageContent}>
          {images.map((uri, index) => (
            <View key={index} style={[styles.imageCard, { backgroundColor: theme.surface }]}>
              <Image source={{ uri }} style={styles.imagePreview} />
              
              {/* 🪄 AI BUTTON (Diamond Only) */}
              {isDiamond && (
                <TouchableOpacity 
                  style={[styles.aiBtn, isAIProcessing && { opacity: 0.5 }]} 
                  onPress={() => processAIBackground(index)}
                  disabled={isAIProcessing}
                >
                  <Wand2 size={14} color="white" />
                  <Text style={styles.aiBtnText}>STUDIO</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(index)}>
                <X color="white" size={12} strokeWidth={3} />
              </TouchableOpacity>
              {index === 0 && <View style={[styles.coverBadge, { backgroundColor: Colors.brand.emerald }]}><Text style={styles.coverText}>COVER</Text></View>}
            </View>
          ))}
          {images.length < 4 && (
            <TouchableOpacity style={[styles.addCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={pickImages}>
              <Camera color={theme.subtext} size={32} strokeWidth={1.5} />
              <Text style={[styles.addText, { color: theme.subtext }]}>{images.length}/4 PHOTOS</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
               <Tag size={12} color={Colors.brand.emerald} />
               <Text style={[styles.label, { color: theme.subtext }]}>NAME *</Text>
            </View>
            <TextInput 
              placeholder="e.g. Classic Denim Jacket" 
              placeholderTextColor={theme.subtext}
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} 
              value={name} 
              onChangeText={setName} 
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                 <DollarSign size={12} color={Colors.brand.emerald} />
                 <Text style={[styles.label, { color: theme.subtext }]}>PRICE (₦) *</Text>
              </View>
              <TextInput 
                placeholder="0" 
                placeholderTextColor={theme.subtext}
                keyboardType="numeric" 
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: Colors.brand.emerald, fontSize: 18 }]} 
                value={price} 
                onChangeText={setPrice} 
              />
            </View>

            <View style={[styles.inputGroup, { width: 110 }]}>
              <View style={styles.labelRow}>
                 <Package size={12} color={Colors.brand.emerald} />
                 <Text style={[styles.label, { color: theme.subtext }]}>STOCK *</Text>
              </View>
              <TextInput 
                placeholder="1" 
                placeholderTextColor={theme.subtext}
                keyboardType="numeric" 
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} 
                value={stock} 
                onChangeText={setStock} 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
               <Layers size={12} color={Colors.brand.emerald} />
               <Text style={[styles.label, { color: theme.subtext }]}>CATEGORY *</Text>
            </View>
            <TextInput 
              placeholder="Select or type..." 
              placeholderTextColor={theme.subtext}
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} 
              value={category} 
              onChangeText={setCategory} 
            />
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recallList}>
              {globalCategories.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.recallChip, { backgroundColor: theme.surface, borderColor: theme.border }, category.toLowerCase() === cat.slug && { backgroundColor: Colors.brand.emerald, borderColor: Colors.brand.emerald }]} 
                  onPress={() => { setCategory(cat.slug); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.recallText, { color: theme.subtext }, category.toLowerCase() === cat.slug && { color: 'white' }]}>{cat.name.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
               <AlignLeft size={12} color={Colors.brand.emerald} />
               <Text style={[styles.label, { color: theme.subtext }]}>DESCRIPTION *</Text>
            </View>
            <TextInput 
              placeholder="Describe materials, size, and condition..." 
              placeholderTextColor={theme.subtext}
              multiline 
              style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} 
              value={description} 
              onChangeText={setDescription} 
            />
          </View>

          <View style={[styles.mirrorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <View style={[styles.row, { backgroundColor: 'transparent' }]}>
                   <Sparkles size={16} color="#8B5CF6" fill="#8B5CF6" />
                   <Text style={[styles.mirrorTitle, { color: theme.text }]}>SHARE TO STORIES</Text>
                </View>
                <Text style={[styles.mirrorSub, { color: theme.subtext }]}>Promote this drop in the 12H Story Vortex.</Text>
              </View>
              <Switch 
                value={postToStory} 
                onValueChange={setPostToStory} 
                trackColor={{ false: theme.border, true: '#8B5CF6' }} 
                thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
              />
          </View>
        </View>

        <View style={styles.footerInfo}>
            {isAIProcessing ? <ActivityIndicator size="small" color={Colors.brand.emerald} /> : <Send size={14} color={Colors.brand.emerald} />}
            <Text style={[styles.footerText, { color: Colors.brand.emerald }]}>
              {isAIProcessing ? 'AI STUDIO PROCESSING...' : 'SAVING TO TRANSMISSION REGISTRY...'}
            </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 10 : 40, borderBottomWidth: 1.5 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  deployBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16 },
  deployText: { fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  scrollBody: { paddingBottom: 40 },
  imageList: { marginVertical: 20 },
  imageContent: { paddingLeft: 25, paddingRight: 15 },
  imageCard: { width: 160, height: 200, borderRadius: 24, marginRight: 15, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  aiBtn: { position: 'absolute', top: 12, left: 12, backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },
  aiBtnText: { color: 'white', fontSize: 9, fontWeight: '900' },
  removeImgBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 12 },
  coverBadge: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  coverText: { color: 'white', fontSize: 9, fontWeight: '900' },
  addCard: { width: 160, height: 200, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addText: { fontSize: 10, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  formContainer: { paddingHorizontal: 25, gap: 28 },
  rowInputs: { flexDirection: 'row', gap: 15 },
  inputGroup: { gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  input: { borderRadius: 22, padding: 18, fontSize: 15, fontWeight: '700', borderWidth: 1.5 },
  recallList: { flexDirection: 'row', marginTop: 4 },
  recallChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1.5 },
  recallText: { fontSize: 9, fontWeight: '900' },
  textArea: { height: 140, textAlignVertical: 'top' },
  mirrorCard: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 28, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mirrorTitle: { fontSize: 14, fontWeight: '900' },
  mirrorSub: { fontSize: 11, marginTop: 6, lineHeight: 16, fontWeight: '500' },
  footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 60, paddingBottom: 20 },
  footerText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }
});