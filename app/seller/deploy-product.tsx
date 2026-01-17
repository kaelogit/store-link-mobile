import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Image, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, Cloud, ShieldAlert, 
  Info, Zap, LayoutGrid, Tag, CheckCircle2 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 PRODUCT DEPLOYMENT TERMINAL v78.6 (Pure Build)
 * Audited: Section II Asset Locking & Section III Geographic Anchoring.
 */
export default function DeployProductScreen() {
  const router = useRouter();
  const { studioAsset } = useLocalSearchParams();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [isFlashDrop, setIsFlashDrop] = useState(false);

  const handleDeployment = async () => {
    if (!name || !price || !studioAsset) {
      return Alert.alert("Registry Error", "Identity and Economic data required for deployment.");
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      if (!profile?.id) throw new Error("Identity Sync Failure");

      // 1. Upload Studio Asset to Product Bucket
      const fileExt = 'jpg';
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const response = await fetch(studioAsset as string);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);

      // 2. Insert into Product Registry (Manifest Section II)
      const { error: dbError } = await supabase.from('products').insert({
        seller_id: profile.id,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        stock_quantity: parseInt(stock),
        image_urls: [publicUrl],
        is_active: true,
        is_flash_drop: isFlashDrop,
        image_ratio: 1.25, // Hard-coded Cinematic Ratio
      });

      if (dbError) throw dbError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Deployment Successful", 
        "Your asset is now live. Registry lock active for 60 minutes.",
        [{ text: "VIEW VORTEX", onPress: () => router.replace('/(tabs)') }]
      );

    } catch (e: any) {
      Alert.alert("Deployment Failure", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>DEPLOY ASSET</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 🎞️ CINEMATIC PREVIEW */}
        <View style={[styles.assetPreview, { borderColor: theme.border }]}>
          <Image source={{ uri: studioAsset as string }} style={styles.previewImg} />
          <View style={styles.ratioBadge}>
             <LayoutGrid size={12} color="white" />
             <Text style={styles.ratioText}>4:5 CINEMATIC</Text>
          </View>
        </View>

        {/* 🛠️ IDENTITY FIELDS (Locked 1H post-deployment) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Tag size={14} color={theme.subtext} />
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>IDENTITY DATA (LOCKED 1H)</Text>
          </View>
          <TextInput
            placeholder="Product Name"
            placeholderTextColor={theme.subtext}
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface }]}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="Tell a story about this drop..."
            placeholderTextColor={theme.subtext}
            style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: theme.surface }]}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* 💰 ECONOMIC FIELDS (Always Fluid) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={14} color={Colors.brand.gold} fill={Colors.brand.gold} />
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>ECONOMIC DATA (FLUID)</Text>
          </View>
          <View style={styles.row}>
            <TextInput
              placeholder="Price (₦)"
              placeholderTextColor={theme.subtext}
              style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.surface }]}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <TextInput
              placeholder="Stock"
              placeholderTextColor={theme.subtext}
              style={[styles.input, { width: 100, color: theme.text, backgroundColor: theme.surface }]}
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>
        </View>

        {/* 🛡️ SECURITY ADVISORY */}
        <View style={[styles.alertBox, { backgroundColor: Colors.brand.emerald + '10' }]}>
           <ShieldAlert size={20} color={Colors.brand.emerald} />
           <Text style={[styles.alertText, { color: theme.text }]}>
             Your location ({profile?.location}) will be used for Geographic Anchoring in the Vortex.
           </Text>
        </View>

        <TouchableOpacity 
          style={[styles.deployBtn, { backgroundColor: theme.text }, loading && { opacity: 0.7 }]} 
          onPress={handleDeployment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <>
              <Cloud color={theme.background} size={20} strokeWidth={2.5} />
              <Text style={[styles.deployText, { color: theme.background }]}>DEPLOY TO REGISTRY</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1.5, paddingTop: Platform.OS === 'ios' ? 10 : 45 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  body: { padding: 25 },
  assetPreview: { width: '100%', aspectRatio: 0.8, borderRadius: 28, borderWidth: 1.5, overflow: 'hidden', marginBottom: 30 },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  ratioBadge: { position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratioText: { color: 'white', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  input: { paddingHorizontal: 20, paddingVertical: 18, borderRadius: 18, fontSize: 15, fontWeight: '600', marginBottom: 15 },
  textArea: { height: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 15 },
  alertBox: { padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 40 },
  alertText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  deployBtn: { height: 72, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 50 },
  deployText: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 }
});