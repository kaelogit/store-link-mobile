import React, { useState, useEffect, useRef } from 'react';
import { 
  View, StyleSheet, Image, Dimensions, 
  TouchableOpacity, Animated, Platform, Pressable, ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronRight, BadgeCheck, Diamond, ShoppingCart, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';

// 🏛️ Sovereign Components
import { supabase } from '../../src/lib/supabase';
import { Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';

const { width, height } = Dimensions.get('window');

/**
 * 🏰 STORY VIEWER v81.1 (Pure Build)
 * Audited: Section V Cinematic Layer & Section I Visual Immunity.
 */
export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  
  const progress = useRef(new Animated.Value(0)).current;
  const currentProgress = useRef(0);
  const STORY_DURATION = 5000; // 5s standard view

  const videoPlayer = useVideoPlayer(story?.video_url || null, (player) => {
    player.loop = true;
    player.muted = false;
    if (story?.video_url) player.play();
  });

  useEffect(() => {
    isMounted.current = true;
    fetchStoryDetail();

    const listenerId = progress.addListener(({ value }) => {
      currentProgress.current = value;
    });

    return () => {
      isMounted.current = false;
      progress.removeListener(listenerId);
    };
  }, [id]);

  const fetchStoryDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          seller:seller_id (
            id, display_name, logo_url, is_verified, prestige_weight
          ),
          product:linked_product_id (
            id, name, price, image_urls
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // 🛡️ MANIFEST SECTION V: 12-Hour Expiry Enforcement
      if (new Date(data.expires_at) < new Date()) {
        throw new Error("Expired Content");
      }

      if (isMounted.current) {
        setStory(data);
        startProgress(STORY_DURATION);
      }
    } catch (e) {
      console.error("Story Sync Error:", e);
      router.back();
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const startProgress = (duration: number) => {
    Animated.timing(progress, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false, 
    }).start(({ finished }) => {
      if (finished && isMounted.current) router.back();
    });
  };

  const pauseProgress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    progress.stopAnimation();
    if (story?.video_url) videoPlayer.pause();
  };

  const resumeProgress = () => {
    const remainingTime = STORY_DURATION * (1 - currentProgress.current);
    startProgress(remainingTime);
    if (story?.video_url) videoPlayer.play();
  };

  const handleShopNow = () => {
    if (!story?.linked_product_id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/product/${story.linked_product_id}`);
  };

  if (loading || !story) return <View style={styles.blackout} />;

  const isDiamond = story.seller?.prestige_weight === 3;
  const isVideo = story.type === 'video';

  return (
    <View style={styles.container}>
      <Pressable 
        onLongPress={pauseProgress} 
        onPressOut={resumeProgress}
        style={styles.container}
      >
        {isVideo ? (
          <VideoView 
            player={videoPlayer} 
            style={StyleSheet.absoluteFill} 
            contentFit="cover" 
            nativeControls={false} 
          />
        ) : (
          <Image source={{ uri: story.media_url }} style={styles.fullMedia} />
        )}
        
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFill}
        />

        <TouchableOpacity style={styles.touchBack} onPress={() => router.back()} />
      </Pressable>

      <SafeAreaView style={styles.topHud} edges={['top']}>
        <View style={styles.progressBarBg}>
          <Animated.View 
            style={[styles.progressBarFill, { 
              backgroundColor: isDiamond ? '#8B5CF6' : Colors.brand.emerald,
              width: progress.interpolate({ 
                inputRange: [0, 1], 
                outputRange: ['0%', '100%'] 
              }) 
            }]} 
          />
        </View>

        <View style={styles.header}>
          <View style={styles.merchantInfo}>
            <View style={[styles.avatarContainer, isDiamond && styles.diamondBorder]}>
              <Image source={{ uri: story.seller?.logo_url }} style={styles.avatar} />
            </View>
            <View style={{backgroundColor: 'transparent'}}>
                <View style={styles.nameRow}>
                    <Text style={styles.merchantName}>{story.seller?.display_name?.toUpperCase()}</Text>
                    {isDiamond ? (
                      <Diamond size={12} color="#8B5CF6" fill="#8B5CF6" />
                    ) : (
                      story.seller?.is_verified && <BadgeCheck size={14} color="#3B82F6" fill="#3B82F6" />
                    )}
                </View>
                <View style={styles.urgencyRow}>
                    <Clock size={10} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.timeLabel}>NEW DROP</Text>
                </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
             <BlurView intensity={25} tint="dark" style={styles.closeBlur}>
                <X color="white" size={20} strokeWidth={3} />
             </BlurView>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {story.linked_product_id && story.product && (
        <View style={styles.bottomHud}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleShopNow}>
            <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={[styles.shopNowContainer, isDiamond && styles.diamondShopBorder]}>
                <View style={styles.shopNowBtn}>
                  <View style={styles.productBrief}>
                    <Image source={{ uri: story.product.image_urls?.[0] }} style={styles.productThumb} />
                    <View style={{backgroundColor: 'transparent'}}>
                        <View style={styles.tagRow}>
                           <ShoppingCart size={10} color={isDiamond ? "#8B5CF6" : Colors.brand.emerald} />
                           <Text style={[styles.productTag, { color: isDiamond ? '#8B5CF6' : Colors.brand.emerald }]}>AVAILABLE NOW</Text>
                        </View>
                        <Text style={styles.productPrice} numberOfLines={1}>
                          {story.product.name} • ₦{story.product.price.toLocaleString()}
                        </Text>
                    </View>
                  </View>
                  <View style={[styles.shopArrow, { backgroundColor: isDiamond ? '#8B5CF6' : Colors.brand.emerald }]}>
                      <ChevronRight color="white" size={18} strokeWidth={3} />
                  </View>
                </View>
            </BlurView>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  blackout: { flex: 1, backgroundColor: 'black' },
  fullMedia: { width, height, resizeMode: 'cover' },
  touchBack: { position: 'absolute', left: 0, top: 0, width: width * 0.3, height: '100%', backgroundColor: 'transparent' },
  topHud: { position: 'absolute', top: 0, width: '100%', paddingHorizontal: 15, paddingTop: 10 },
  progressBarBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, backgroundColor: 'transparent' },
  merchantInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' },
  avatarContainer: { padding: 2, borderRadius: 18 },
  diamondBorder: { borderWidth: 2, borderColor: '#8B5CF6' },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#222' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'transparent' },
  merchantName: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  urgencyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, backgroundColor: 'transparent' },
  timeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { borderRadius: 20, overflow: 'hidden' },
  closeBlur: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bottomHud: { position: 'absolute', bottom: Platform.OS === 'ios' ? 50 : 30, width: '100%', paddingHorizontal: 20 },
  shopNowContainer: { borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  diamondShopBorder: { borderColor: 'rgba(139, 92, 246, 0.5)', borderWidth: 2 },
  shopNowBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'transparent' },
  productBrief: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, backgroundColor: 'transparent' },
  productThumb: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, backgroundColor: 'transparent' },
  productTag: { fontWeight: '900', fontSize: 9, letterSpacing: 1.5 },
  productPrice: { color: 'white', fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  shopArrow: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});