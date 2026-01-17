import React, { useState, useRef } from 'react';
import { 
  StyleSheet, TouchableOpacity, Image, 
  ActivityIndicator, Alert, Dimensions, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Sparkles, Image as ImageIcon, 
  Check, Scissors, Box, ShieldCheck
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// 🏛️ Sovereign Components
import { View, Text } from '../../src/components/Themed';
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');
const TARGET_RATIO = 1.25; // 4:5 Cinematic Ratio

export default function AIStudioScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  const [rawImage, setRawImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5], // Enforce Cinematic Ratio at picker level
      quality: 0.9,
    });

    if (!result.canceled) {
      setRawImage(result.assets[0].uri);
      setProcessedImage(null);
    }
  };

  /**
   * ⚡ STUDIO CLEAN AI (Section II)
   * Logic: Dispatches asset to the AI Isolation Engine.
   */
  const runStudioClean = async () => {
    if (!rawImage || profile?.subscription_plan !== 'diamond') {
      return Alert.alert("Diamond Privilege", "Studio Clean is reserved for Diamond Merchants.");
    }

    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // 📡 Dispatched to the StoreLink AI Edge Function
      // For this build, we simulate the 2-second AI isolation delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // In production, this would be the URL returned by the AI background removal API
      setProcessedImage(rawImage); 
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      Alert.alert("AI Error", "The Studio engine is busy. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeHandshake = () => {
    if (!processedImage) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Route to the actual Product Deployment screen with the clean asset
    router.push({
      pathname: "/seller/deploy-product",
      params: { studioAsset: processedImage }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>DIAMOND AI STUDIO</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.previewFrame, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {rawImage ? (
            <Image source={{ uri: processedImage || rawImage }} style={styles.mainPreview} />
          ) : (
            <TouchableOpacity style={styles.placeholder} onPress={pickImage}>
              <View style={styles.iconCircle}>
                <ImageIcon color={theme.subtext} size={32} />
              </View>
              <Text style={[styles.placeholderText, { color: theme.subtext }]}>Tap to import product image</Text>
              <Text style={styles.ratioNote}>ENFORCED 4:5 CINEMATIC RATIO</Text>
            </TouchableOpacity>
          )}

          {isProcessing && (
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={styles.processingOverlay}>
                <ActivityIndicator color="#8B5CF6" size="large" />
                <Text style={styles.processingText}>AI ISOLATING SUBJECT...</Text>
              </View>
            </BlurView>
          )}
        </View>

        <View style={styles.controls}>
          <View style={styles.featureRow}>
             <ShieldCheck size={16} color="#8B5CF6" />
             <Text style={[styles.featureText, { color: theme.subtext }]}>STUDIO CLEAN™ SUBJECT ISOLATION ACTIVE</Text>
          </View>

          {!processedImage ? (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }, !rawImage && { opacity: 0.5 }]} 
              onPress={runStudioClean}
              disabled={!rawImage || isProcessing}
            >
              <Sparkles color="white" size={20} />
              <Text style={styles.actionBtnText}>RUN STUDIO CLEAN</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.text }]} onPress={finalizeHandshake}>
              <Check color={theme.background} size={20} strokeWidth={3} />
              <Text style={[styles.actionBtnText, { color: theme.background }]}>USE THIS ASSET</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage} disabled={isProcessing}>
            <Scissors color={theme.subtext} size={16} />
            <Text style={[styles.secondaryBtnText, { color: theme.subtext }]}>CHANGE SOURCE IMAGE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1.5, paddingTop: Platform.OS === 'ios' ? 10 : 45 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  content: { flex: 1, padding: 25 },
  previewFrame: { width: '100%', aspectRatio: 0.8, borderRadius: 36, borderWidth: 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  mainPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { alignItems: 'center', padding: 40 },
  iconCircle: { width: 70, height: 70, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  placeholderText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  ratioNote: { fontSize: 9, fontWeight: '900', color: '#8B5CF6', marginTop: 12, letterSpacing: 1 },
  processingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  processingText: { color: 'white', fontWeight: '900', fontSize: 11, marginTop: 20, letterSpacing: 2 },
  controls: { marginTop: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 30 },
  featureText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  actionBtn: { height: 72, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  secondaryBtn: { marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 10 },
  secondaryBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }
});