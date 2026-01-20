import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, Dimensions, TextInput, 
  TouchableOpacity, Animated, Platform, Pressable, 
  ActivityIndicator, KeyboardAvoidingView, Share,
  View as RNView, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, Gem, ShoppingBag, Heart, Send,
  Share2, MessageCircle, Bookmark,
  Play, Sparkles
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';

// 💎 SPEED ENGINE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 7000;

/**
 * 🏰 STORY VIEWER v102.0
 * Purpose: A high-speed, immersive viewer for store updates and videos.
 * Features: Tap navigation, pause on long-press, and direct shop messaging.
 */
export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserStore();
  const queryClient = useQueryClient();
  
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  const progress = useRef(new Animated.Value(0)).current;
  const isNavigating = useRef(false);

  /** 🛡️ LOADING QUEUE: Fetching all stories for this seller */
  const { 
    data: allStories = [], 
    isLoading 
  } = useQuery({
    queryKey: ['story-queue', id],
    queryFn: async () => {
      if (!id) throw new Error("No story ID");
      const { data: initial } = await supabase.from('stories').select('seller_id').eq('id', id).single();
      if (!initial) throw new Error("Story not found");

      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          seller:seller_id (id, display_name, slug, logo_url, subscription_plan),
          product:linked_product_id (id, name, price, image_urls)
        `)
        .eq('seller_id', initial.seller_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Loading content: pre-load images for speed
      data?.forEach((s: any) => {
        if (s.type === 'image' && s.media_url) {
            Image.prefetch(s.media_url);
        }
      });

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const currentStory = allStories[activeStoryIndex];

  /** 📡 LINKED CONTENT: Checking for related product videos */
  const { data: linkedReel } = useQuery({
    queryKey: ['product-reel', currentStory?.linked_product_id],
    queryFn: async () => {
      if (!currentStory?.linked_product_id) return null;
      const { data } = await supabase.from('reels').select('*').eq('product_id', currentStory.linked_product_id).maybeSingle();
      return data;
    },
    enabled: !!currentStory?.linked_product_id,
  });

  // VIDEO PLAYER SETUP
  const videoPlayer = useVideoPlayer(currentStory?.media_url, (player) => {
    if (currentStory?.type === 'video') {
      player.loop = false;
      player.play();
    }
  });

  useEffect(() => {
    if (!isLoading && allStories.length > 0) {
      const startIndex = allStories.findIndex((s: any) => s.id === id);
      if (startIndex !== -1) setActiveStoryIndex(startIndex);
    }
  }, [isLoading, allStories, id]);

  const startProgress = useCallback(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused && !isNavigating.current) handleNext();
    });
  }, [activeStoryIndex, isPaused, allStories]);

  useEffect(() => {
    if (!isLoading && currentStory) {
      startProgress();
    }
    return () => progress.stopAnimation();
  }, [activeStoryIndex, isLoading, isPaused]);

  const handleNext = () => {
    if (activeStoryIndex < allStories.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveStoryIndex(prev => prev + 1);
    } else {
      exitViewer();
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveStoryIndex(prev => prev - 1);
    } else {
      progress.setValue(0);
      startProgress();
    }
  };

  const exitViewer = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.back();
  };

  if (isLoading || !currentStory) {
    return (
      <RNView style={styles.blackout}>
        <ActivityIndicator color={Colors.brand.emerald} size="large" />
        <Text style={styles.loaderText}>LOADING CONTENT...</Text>
      </RNView>
    );
  }

  const isDiamond = currentStory.seller?.subscription_plan === 'diamond';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar hidden />
      
      {/* 🎞️ MEDIA CANVAS */}
      <RNView style={styles.mediaContainer}>
        {currentStory.type === 'video' ? (
          <VideoView player={videoPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        ) : (
          <Image 
            source={currentStory.media_url} 
            style={styles.fullMedia} 
            contentFit="cover" 
            cachePolicy="memory-disk" 
          />
        )}
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
      </RNView>

      {/* 👆 TOUCH CONTROLS */}
      <RNView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <RNView style={styles.gestureContainer}>
          <Pressable style={styles.prevZone} onPress={handlePrev} />
          <Pressable 
            style={styles.nextZone} 
            onPress={handleNext} 
            onLongPress={() => { setIsPaused(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} 
            onPressOut={() => setIsPaused(false)} 
          />
        </RNView>
      </RNView>

      {/* 🚀 TOP HUD: Bars & Store Info */}
      <SafeAreaView style={styles.topHud} edges={['top']} pointerEvents="box-none">
        <RNView style={styles.progressRow}>
          {allStories.map((_: any, index: number) => (
            <RNView key={`prog-${index}`} style={styles.progressBarBg}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: isDiamond ? '#A78BFA' : 'white',
                    width: index < activeStoryIndex ? '100%' : index === activeStoryIndex ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' 
                  }
                ]} 
              />
            </RNView>
          ))}
        </RNView>

        <RNView style={styles.header}>
          <TouchableOpacity 
            onPress={() => { isNavigating.current = true; router.push(`/profile/${currentStory.seller_id}`); }} 
            style={styles.brandStack}
          >
            <RNView style={[styles.avatarBox, isDiamond && styles.diamondHalo]}>
              <Image source={currentStory.seller?.logo_url} style={styles.avatar} contentFit="cover" />
            </RNView>
            <RNView style={styles.nameStack}>
              <Text style={styles.displayName}>{(currentStory.seller?.display_name || 'Store').toUpperCase()}</Text>
              <RNView style={styles.slugRow}>
                <Text style={styles.slugText}>@{currentStory.seller?.slug}</Text>
                {isDiamond && <Gem size={10} color="#A78BFA" fill="#A78BFA" style={{ marginLeft: 4 }} />}
              </RNView>
            </RNView>
          </TouchableOpacity>
          <TouchableOpacity onPress={exitViewer} style={styles.closeBtn}>
            <X color="white" size={26} strokeWidth={2.5} />
          </TouchableOpacity>
        </RNView>
      </SafeAreaView>

      {/* 🛡️ INTERACTION SIDEBAR */}
      <RNView style={styles.sidebar}>
        <TouchableOpacity style={styles.sideAction} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
          <Heart size={28} color="white" strokeWidth={2.5} />
          <Text style={styles.metricText}>{currentStory.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction}>
          <MessageCircle size={28} color="white" strokeWidth={2.5} />
          <Text style={styles.metricText}>{currentStory.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => Share.share({ message: `Check this out on StoreLink!` })}>
          <Share2 size={28} color="white" strokeWidth={2.5} />
          <Text style={styles.metricText}>SHARE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Bookmark size={28} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
      </RNView>

      {/* 🛒 BOTTOM HUD: Product Info */}
      <RNView style={[styles.bottomHud, { paddingBottom: Math.max(insets.bottom, 20) }]} pointerEvents="box-none">
        
        {/* REEL LINK */}
        {linkedReel && (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.reelTrigger}
            onPress={() => { isNavigating.current = true; router.push(`/(tabs)/explore` as any); }}
          >
            <BlurView intensity={30} tint="dark" style={styles.reelBlur}>
               <Sparkles size={14} color="#A78BFA" />
               <Text style={styles.reelText}>WATCH FULL VIDEO</Text>
               <Play size={10} color="white" fill="white" />
            </BlurView>
          </TouchableOpacity>
        )}

        {currentStory.product && (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => { isNavigating.current = true; router.push(`/product/${currentStory.linked_product_id}`); }}
          >
            <BlurView intensity={60} tint="dark" style={[styles.productPill, isDiamond && styles.diamondBorder]}>
              <Image source={currentStory.product.image_urls?.[0]} style={styles.productThumb} contentFit="cover" />
              <RNView style={styles.productInfo}>
                <Text style={styles.priceText}>₦{currentStory.product.price.toLocaleString()}</Text>
                <Text style={styles.productName} numberOfLines={1}>{currentStory.product.name.toUpperCase()}</Text>
              </RNView>
              <RNView style={styles.bagCircle}>
                <ShoppingBag size={16} color="black" strokeWidth={3} />
              </RNView>
            </BlurView>
          </TouchableOpacity>
        )}
        
        <RNView style={styles.inputRow}>
          <RNView style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Send a message..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={messageText}
              onChangeText={setMessageText}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}>
               <Send size={18} color="white" />
            </TouchableOpacity>
          </RNView>
        </RNView>
      </RNView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  blackout: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  mediaContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  fullMedia: { width: '100%', height: '100%' },
  gestureContainer: { flex: 1, flexDirection: 'row' },
  prevZone: { width: '25%', height: '100%' },
  nextZone: { width: '75%', height: '100%' },
  topHud: { position: 'absolute', top: 0, width: '100%', zIndex: 10 },
  progressRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 4, marginTop: 10 },
  progressBarBg: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginTop: 20 },
  brandStack: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  diamondHalo: { borderColor: '#8B5CF6', borderWidth: 2 },
  avatar: { width: '100%', height: '100%' },
  nameStack: { gap: 2 },
  displayName: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  slugRow: { flexDirection: 'row', alignItems: 'center' },
  slugText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
  closeBtn: { padding: 10 },
  sidebar: { position: 'absolute', right: 12, bottom: height * 0.25, alignItems: 'center', gap: 22 },
  sideAction: { alignItems: 'center', gap: 5 },
  metricText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: -0.2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  bottomHud: { position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 15 },
  reelTrigger: { alignSelf: 'center', marginBottom: 15, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  reelBlur: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  reelText: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  productPill: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 18 },
  diamondBorder: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  productThumb: { width: 48, height: 48, borderRadius: 12 },
  productInfo: { flex: 1, marginLeft: 15 },
  priceText: { color: 'white', fontWeight: '900', fontSize: 16 },
  productName: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', marginTop: 2 },
  bagCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputWrapper: { flex: 1, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  messageInput: { flex: 1, color: 'white', fontWeight: '600', fontSize: 14 },
  sendBtn: { marginLeft: 10 }
});