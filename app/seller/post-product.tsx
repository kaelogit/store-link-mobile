import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, Dimensions, Image, Switch, Platform, StatusBar, View as RNView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, Camera, X, Tag, DollarSign, 
  Package, AlignLeft, Sparkles, Wand2, ShieldCheck, Gem
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';
import { removeBackgroundAI } from '../../src/utils/aiAssistant';

const { width } = Dimensions.get('window');

/**
 * 🏰 PRODUCT STUDIO v101.0
 * Purpose: Stable Multi-Photo Upload for high-end listings.
 * Fix: Replaced Base64 with stable Blob handshake for network reliability.
 */
export default function PostProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');
  const [postToStory, setPostToStory] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // 🛡️ SELLER STATUS CHECKS
  const isMerchant = profile?.is_seller === true;
  const isVerified = profile?.verification_status === 'verified';
  const isDiamond = profile?.subscription_plan === 'diamond';
  const isExpired = profile?.subscription_status === 'expired';
  const isTrial = profile?.subscription_status === 'trial';
  
  const hasSellerAccess = isTrial || (!isExpired && (profile?.subscription_plan === 'standard' || isDiamond));

  const pickImages = async () => {
    if (images.length >= 4) return Alert.alert("Limit Reached", "Max 4 photos per listing.");
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      aspect: [4, 5], 
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const processAIBackground = async (index: number) => {
    if (!isDiamond) {
      return Alert.alert("Premium Feature", "AI Cleaning is a Diamond-only tool.");
    }
    
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
      Alert.alert("AI Error", "Image processing failed.");
    } finally {
      setIsAIProcessing(false);
    }
  };

  /** 🛡️ HIGH-END UPLOAD PROTOCOL (Network Failure Fix) */
  const handlePostProduct = async () => {
    if (!isMerchant) return router.push('/onboarding/role-setup');
    if (!hasSellerAccess) return router.push('/seller/subscription' as any);
    if (!isVerified) return router.push('/seller/verification');

    if (images.length === 0 || !name || !price || !description) {
      return Alert.alert("Missing Details", "Please provide a title, price, description, and at least one photo.");
    }

    setLoading(true);
    try {
      // 1. Stable Parallel Blob Upload
      const uploadedUrls = await Promise.all(
        images.map(async (uri, idx) => {
          const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${profile?.id}/prod_${Date.now()}_${idx}.${fileExt}`;
          
          // 🛡️ THE FIX: Convert URI to BLOB for 100% network stability
          const response = await fetch(uri);
          const blob = await response.blob();

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, blob, { 
              contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
              cacheControl: '3600',
              upsert: false 
            });

          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
          return publicUrl;
        })
      );

      // 2. Database Synchronization
      const { data: product, error: productError } = await supabase.from('products').insert({
        seller_id: profile?.id,
        name: name.trim(),
        price: parseFloat(price),
        stock_quantity: parseInt(stock) || 1,
        description: description.trim(),
        image_urls: uploadedUrls,
        image_ratio: 1.25,
        is_active: true
      }).select().single();

      if (productError) throw productError;

      // 3. Mirror to 12-Hour Stories
      if (postToStory && product) {
        await supabase.from('stories').insert({
          seller_id: profile?.id,
          media_url: uploadedUrls[0],
          type: 'image',
          linked_product_id: product.id,
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        });
      }

      await refreshUserData(); 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error("Upload Handshake Failed:", e);
      Alert.alert("Post Failed", "Network interrupted. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#000' ? "dark-content" : "light-content"} />
      
      <View style={[styles.header, { borderBottomColor: theme.surface, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={theme.text} size={30} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>PRODUCT STUDIO</Text>
        <TouchableOpacity 
            onPress={handlePostProduct} 
            disabled={loading || isAIProcessing} 
            style={[
              styles.deployBtn, 
              { backgroundColor: isDiamond ? '#8B5CF6' : theme.text }, 
              (loading || isAIProcessing) && { opacity: 0.5 }
            ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={isDiamond ? 'white' : theme.background} />
          ) : (
            <Text style={[styles.deployText, { color: isDiamond ? 'white' : theme.background }]}>POST</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 40 }]}>
        {/* PHOTO GALLERY */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList} contentContainerStyle={styles.imageContent}>
          {images.map((uri, index) => (
            <View key={index} style={[styles.imageCard, { backgroundColor: theme.surface }]}>
              <Image source={{ uri }} style={styles.imagePreview} />
              
              <TouchableOpacity 
                style={[styles.aiBtn, isAIProcessing && { opacity: 0.5 }]} 
                onPress={() => processAIBackground(index)}
                disabled={isAIProcessing}
              >
                {isAIProcessing ? <ActivityIndicator size="small" color="white" /> : <Wand2 size={12} color="white" />}
                <Text style={styles.aiBtnText}>AI CLEAN</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.removeImgBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setImages(images.filter((_, i) => i !== index)); }}>
                <X color="white" size={12} strokeWidth={3} />
              </TouchableOpacity>
              {index === 0 && <View style={[styles.coverBadge, { backgroundColor: isDiamond ? '#8B5CF6' : Colors.brand.emerald }]}><Text style={styles.coverText}>MAIN</Text></View>}
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
               <Tag size={12} color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} />
               <Text style={[styles.label, { color: theme.subtext }]}>PRODUCT NAME *</Text>
            </View>
            <TextInput 
              placeholder="Title of your item" 
              placeholderTextColor={`${theme.subtext}80`}
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} 
              value={name} 
              onChangeText={setName} 
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                  <DollarSign size={12} color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} />
                  <Text style={[styles.label, { color: theme.subtext }]}>PRICE (₦) *</Text>
              </View>
              <TextInput 
                placeholder="0" 
                placeholderTextColor={`${theme.subtext}80`}
                keyboardType="numeric" 
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: isDiamond ? '#8B5CF6' : Colors.brand.emerald, fontSize: 18 }]} 
                value={price} 
                onChangeText={setPrice} 
              />
            </View>

            <View style={[styles.inputGroup, { width: 120 }]}>
              <View style={styles.labelRow}>
                  <Package size={12} color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} />
                  <Text style={[styles.label, { color: theme.subtext }]}>STOCK *</Text>
              </View>
              <TextInput 
                placeholder="1" 
                placeholderTextColor={`${theme.subtext}80`}
                keyboardType="numeric" 
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} 
                value={stock} 
                onChangeText={setStock} 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
               <AlignLeft size={12} color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} />
               <Text style={[styles.label, { color: theme.subtext }]}>DESCRIPTION *</Text>
               <Text style={[styles.charCount, { color: description.length > 500 ? '#EF4444' : theme.subtext }]}>
                 {description.length}/500
               </Text>
            </View>
            <TextInput 
              placeholder="Describe materials, sizing, and shipping..." 
              placeholderTextColor={`${theme.subtext}80`}
              multiline 
              style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} 
              value={description} 
              onChangeText={(txt) => setDescription(txt.slice(0, 500))} 
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.mirrorCard, { backgroundColor: theme.surface, borderColor: isDiamond ? '#8B5CF6' : theme.border }]}>
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <View style={styles.flexRow}>
                    <Sparkles size={16} color="#8B5CF6" fill="#8B5CF6" />
                    <Text style={[styles.mirrorTitle, { color: theme.text }]}>AUTO-POST TO STORIES</Text>
                </View>
                <Text style={[styles.mirrorSub, { color: theme.subtext }]}>Share this item to your story automatically for 12 hours.</Text>
              </View>
              <Switch 
                value={postToStory} 
                onValueChange={setPostToStory} 
                trackColor={{ false: theme.border, true: '#8B5CF6' }} 
                thumbColor={postToStory ? (isDiamond ? '#8B5CF6' : '#FFF') : '#FFF'}
              />
          </View>

          <View style={styles.statusFooter}>
              {isDiamond ? <Gem size={14} color="#8B5CF6" /> : <ShieldCheck size={14} color={theme.subtext} />}
              <Text style={[styles.statusText, { color: isDiamond ? '#8B5CF6' : theme.subtext }]}>
                {isDiamond ? 'PREMIUM STUDIO ACTIVE' : 'AI TOOLS LOCKED (DIAMOND ONLY)'}
              </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  deployBtn: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 16, elevation: 4 },
  deployText: { fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  
  scrollBody: { paddingBottom: 100 },
  imageList: { marginVertical: 20 },
  imageContent: { paddingLeft: 25, paddingRight: 15 },
  imageCard: { width: 160, height: 210, borderRadius: 24, marginRight: 15, overflow: 'hidden', position: 'relative', elevation: 4 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  aiBtn: { position: 'absolute', top: 10, left: 10, backgroundColor: '#8B5CF6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, elevation: 5 },
  aiBtnText: { color: 'white', fontSize: 9, fontWeight: '900' },
  removeImgBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 12 },
  coverBadge: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  coverText: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  addCard: { width: 160, height: 210, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addText: { fontSize: 9, fontWeight: '900', marginTop: 12, letterSpacing: 1.5 },
  
  formContainer: { paddingHorizontal: 25, gap: 28 },
  rowInputs: { flexDirection: 'row', gap: 15 },
  inputGroup: { gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4, justifyContent: 'space-between' },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  charCount: { fontSize: 9, fontWeight: '800' },
  
  input: { borderRadius: 20, padding: 18, fontSize: 15, fontWeight: '700', borderWidth: 1.5 },
  textArea: { height: 130 },
  
  mirrorCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 32, borderWidth: 2 },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mirrorTitle: { fontSize: 13, fontWeight: '900', letterSpacing: -0.2 },
  mirrorSub: { fontSize: 11, marginTop: 6, lineHeight: 16, fontWeight: '500', opacity: 0.7 },
  
  statusFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingBottom: 40 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }
});