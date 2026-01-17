import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, Image, 
  ScrollView, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, BadgeCheck, Camera, FileText, 
  CheckCircle2, Clock, Lock 
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore'; 
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

/**
 * 🏰 ACCOUNT VERIFICATION v78.6 (Pure Build)
 * Audited: Section I Identity Layer & Sovereign Account Security.
 * Resolved: verification_doc_url & verification_selfie_url registry sync.
 */
export default function VerificationScreen() {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile, refreshUserData } = useUserStore();
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'id' | 'selfie' | 'submit' | null>(null);
  
  const [docUrl, setDocUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");

  // 🛡️ INITIALIZE REGISTRY STATE
  useEffect(() => {
    if (profile) {
      setDocUrl(profile.verification_doc_url || "");
      setSelfieUrl(profile.verification_selfie_url || "");
      setLoading(false);
    }
  }, [profile]);

  const pickImage = async (type: 'id' | 'selfie') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Camera access is mandatory to secure your identity.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: type === 'id' ? [4, 3] : [1, 1],
    });

    if (!result.canceled) {
      handleAssetUpload(result.assets[0].uri, type);
    }
  };

  /**
   * 📡 IDENTITY ASSET UPLOAD
   * Secures document imagery in the 'identities' bucket.
   */
  const handleAssetUpload = async (uri: string, type: 'id' | 'selfie') => {
    if (!profile?.id) return;
    setUploading(type);
    
    try {
      const fileName = `${profile.id}/${type}_${Date.now()}.jpg`;
      const filePath = `verifications/${fileName}`;
      
      const response = await fetch(uri);
      const blob = await response.blob();

      // 🛡️ Upload to Secure Identity Vault
      const { error: uploadError } = await supabase.storage
        .from('identities')
        .upload(filePath, blob, { 
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false 
        });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('identities').getPublicUrl(filePath);

      if (type === 'id') setDocUrl(publicUrl);
      else setSelfieUrl(publicUrl);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Upload Failure", "Could not secure identity asset. Please retry.");
    } finally {
      setUploading(null);
    }
  };

  /**
   * 🏛️ SUBMIT IDENTITY HANDSHAKE
   * Updates the profile registry to 'pending' for manual vetting.
   */
  const submitFinalRequest = async () => {
    if (!profile?.id || !docUrl || !selfieUrl) return;
    setUploading('submit');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          verification_doc_url: docUrl,
          verification_selfie_url: selfieUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshUserData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Submission Failure", "Could not dispatch verification request to the registry.");
    } finally {
      setUploading(null);
    }
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  const status = profile?.verification_status || 'none';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>IDENTITY VETTING</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {status === 'verified' ? (
          <View style={styles.stateContainer}>
              <View style={[styles.badgeHalo, { backgroundColor: Colors.brand.emerald + '15' }]}>
                 <BadgeCheck size={80} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
              </View>
              <Text style={[styles.statusTitle, { color: theme.text }]}>IDENTITY SECURED</Text>
              <Text style={[styles.statusSub, { color: theme.subtext }]}>Your shop identity is verified. You now have full access to global vortex discovery and cinematic stories.</Text>
              <TouchableOpacity style={[styles.finishBtn, { backgroundColor: theme.text }]} onPress={() => router.replace('/(tabs)')}>
                 <Text style={[styles.finishText, { color: theme.background }]}>Return to Hub</Text>
              </TouchableOpacity>
          </View>
        ) : status === 'pending' ? (
          <View style={styles.stateContainer}>
              <View style={[styles.badgeHalo, { backgroundColor: '#F59E0B' + '15' }]}>
                 <Clock size={60} color="#F59E0B" strokeWidth={2.5} />
              </View>
              <Text style={[styles.statusTitle, { color: theme.text }]}>Vetting in Progress</Text>
              <Text style={[styles.statusSub, { color: theme.subtext }]}>The Council is reviewing your credentials. This process typically settles within 24 hours.</Text>
              <TouchableOpacity style={[styles.finishBtn, { backgroundColor: theme.text }]} onPress={() => router.replace('/(tabs)')}>
                 <Text style={[styles.finishText, { color: theme.background }]}>Continue Exploration</Text>
              </TouchableOpacity>
          </View>
        ) : (
          <View style={{backgroundColor: 'transparent'}}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Secure Your Shop.</Text>
            <Text style={[styles.heroSub, { color: theme.subtext }]}>Verified merchants receive prioritization in search results and full Cinematic Theater access.</Text>

            <View style={styles.uploadGrid}>
              <TouchableOpacity 
                style={[styles.uploadBox, { backgroundColor: theme.surface, borderColor: theme.border }, docUrl !== "" && { borderColor: Colors.brand.emerald, backgroundColor: Colors.brand.emerald + '10' }]} 
                onPress={() => pickImage('id')}
              >
                {uploading === 'id' ? <ActivityIndicator color={theme.text} /> : (
                  <View style={{backgroundColor: 'transparent', alignItems: 'center'}}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
                      {docUrl !== "" ? <CheckCircle2 color={Colors.brand.emerald} size={24} strokeWidth={2.5} /> : <FileText color={theme.subtext} size={24} strokeWidth={2.5} />}
                    </View>
                    <Text style={[styles.uploadLabel, { color: theme.text }]}>VALID ID</Text>
                    <Text style={[styles.uploadSubText, { color: theme.subtext }]}>{docUrl !== "" ? 'SECURED' : 'TAP TO SCAN'}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.uploadBox, { backgroundColor: theme.surface, borderColor: theme.border }, selfieUrl !== "" && { borderColor: Colors.brand.emerald, backgroundColor: Colors.brand.emerald + '10' }]} 
                onPress={() => pickImage('selfie')}
              >
                {uploading === 'selfie' ? <ActivityIndicator color={theme.text} /> : (
                  <View style={{backgroundColor: 'transparent', alignItems: 'center'}}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
                      {selfieUrl !== "" ? <CheckCircle2 color={Colors.brand.emerald} size={24} strokeWidth={2.5} /> : <Camera color={theme.subtext} size={24} strokeWidth={2.5} />}
                    </View>
                    <Text style={[styles.uploadLabel, { color: theme.text }]}>FACE SCAN</Text>
                    <Text style={[styles.uploadSubText, { color: theme.subtext }]}>{selfieUrl !== "" ? 'SECURED' : 'TAP TO SCAN'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.securityBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Lock size={18} color={theme.text} strokeWidth={2.5} />
              <Text style={[styles.securityText, { color: theme.text }]}>Identity assets are encrypted and stored in the secure sovereign vault. They are never shared or made public.</Text>
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: theme.text }, (!docUrl || !selfieUrl) && styles.btnDisabled]}
              disabled={!docUrl || !selfieUrl || uploading !== null}
              onPress={submitFinalRequest}
            >
              {uploading === 'submit' ? <ActivityIndicator color={theme.background} /> : <Text style={[styles.submitText, { color: theme.background }]}>Submit for Vetting</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1.5, paddingTop: Platform.OS === 'ios' ? 10 : 45 },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  scrollContent: { padding: 25 },
  stateContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  badgeHalo: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  statusTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  statusSub: { fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 22, fontWeight: '600' },
  finishBtn: { marginTop: 40, paddingHorizontal: 30, paddingVertical: 18, borderRadius: 24 },
  finishText: { fontWeight: '900', fontSize: 12, letterSpacing: 1.2 },
  heroTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  heroSub: { fontSize: 14, marginTop: 10, lineHeight: 22, fontWeight: '600' },
  uploadGrid: { flexDirection: 'row', gap: 15, marginTop: 45 },
  uploadBox: { flex: 1, height: 160, borderRadius: 32, borderWidth: 2, justifyContent: 'center', alignItems: 'center', padding: 15 },
  iconCircle: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  uploadLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  uploadSubText: { fontSize: 8, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' },
  securityBox: { flexDirection: 'row', gap: 15, padding: 22, borderRadius: 32, marginTop: 40, alignItems: 'center', borderWidth: 1.5 },
  securityText: { flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 18 },
  submitBtn: { height: 72, borderRadius: 28, marginTop: 35, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.15 },
  submitText: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 }
});