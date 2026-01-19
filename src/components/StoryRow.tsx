import React, { useCallback, useRef, memo, useEffect } from 'react';
import {
  ScrollView, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Animated, Easing, Platform
} from 'react-native';
import { Plus, BadgeCheck, Play, Gem } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// 💎 SPEED ENGINE
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

/**
 * 🏰 STORY ROW v101.0
 * Purpose: A fast-loading row of local store updates and video reels.
 * Sorting: Priority given to follows, premium stores, and your city.
 * Visual: Fast image loading with animated borders for premium sellers.
 */
export const StoryRow = memo(() => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 🛡️ SELLER ACCESS CHECK
  const isMerchant = profile?.is_seller === true;
  const isTrial = profile?.subscription_status === 'trial';
  const isActive = profile?.subscription_status === 'active';
  const hasPostAccess = isMerchant && (isTrial || isActive);

  /** 🛡️ DATA SYNC */
  const { 
    data: stories = [], 
    isLoading 
  } = useQuery({
    queryKey: ['discovery-stories', profile?.location_city, profile?.id],
    queryFn: async () => {
      // Fetch stories based on location and user preferences
      const { data, error } = await supabase.rpc('get_weighted_personalized_stories', { 
        p_user_id: profile?.id || null,
        p_location_state: profile?.location_state || 'Lagos',
        p_location_city: profile?.location_city || null
      });

      if (error) throw error;

      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const uniqueSellersMap = new Map();

      // Process and remove duplicates from the list
      (data || []).forEach((s: any) => {
        const createdDate = new Date(s.created_at);
        if (createdDate > twelveHoursAgo) {
          const existing = uniqueSellersMap.get(s.seller_id);
          if (!existing) {
            uniqueSellersMap.set(s.seller_id, {
              ...s,
              logo_url: s.logo_url || s.profiles?.logo_url,
              slug: s.slug || s.profiles?.slug,
              is_verified_status: s.profiles?.verification_status === 'verified',
              has_video: s.type === 'video',
              seller_city: s.profiles?.location_city,
              seller_state: s.profiles?.location_state
            });
          } else {
            if (s.type === 'video') existing.has_video = true;
            if (createdDate > new Date(existing.created_at)) existing.created_at = s.created_at;
          }
        }
      });

      const processed = Array.from(uniqueSellersMap.values());
      
      // Pre-load images for the first 8 stories for speed
      processed.slice(0, 8).forEach(s => {
        if (s.logo_url) Image.prefetch(s.logo_url);
      });

      /** 🛡️ SMART SORTING LOGIC */
      return processed.sort((a: any, b: any) => {
        let scoreA = 0; let scoreB = 0;
        if (a.is_followed) scoreA += 40; if (b.is_followed) scoreB += 40; 
        if (a.prestige_weight === 3) scoreA += 25; if (b.prestige_weight === 3) scoreB += 25; 
        if (a.seller_city === profile?.location_city) scoreA += 15; 
        if (b.seller_city === profile?.location_city) scoreB += 15; 
        if (a.seller_state === profile?.location_state) scoreA += 10; 
        if (b.seller_state === profile?.location_state) scoreB += 10; 
        
        const recencyA = (new Date(a.created_at).getTime() / 1000000000);
        const recencyB = (new Date(b.created_at).getTime() / 1000000000);
        return (scoreB + recencyB) - (scoreA + recencyA);
      });
    },
    staleTime: 1000 * 60 * 5, 
  });

  // 🎭 PREMIUM PULSE ANIMATION
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const getGradients = (hasVideo: boolean, weight: number): readonly [string, string, ...string[]] => {
    if (weight === 3) return ['#8B5CF6', '#D946EF', '#3B82F6'] as const; // Premium Diamond
    if (hasVideo) return ['#EF4444', '#F97316', '#F59E0B'] as const; // Video Content
    return [Colors.brand.emerald, '#34D399'] as const; // Standard Update
  };

  return (
    <View style={[styles.outerContainer, { borderBottomColor: theme.surface, backgroundColor: theme.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {/* 🖊️ CREATE STORY BUTTON */}
        {hasPostAccess && (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.storyItem} 
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push('/seller/post-story'); }}
          >
            <View style={styles.avatarWrapper}>
              <Image 
                source={profile?.logo_url} 
                style={[styles.myAvatar, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                contentFit="cover"
                transition={200}
              />
              <View style={[styles.plusCircle, { backgroundColor: theme.text, borderColor: theme.background }]}>
                <Plus size={10} color={theme.background} strokeWidth={4} />
              </View>
            </View>
            <Text style={[styles.storyName, { color: theme.text }]}>Add Drop</Text>
          </TouchableOpacity>
        )}

        {/* 🛍️ LOCAL UPDATES */}
        {isLoading && stories.length === 0 ? (
          <View style={styles.loaderContainer}><ActivityIndicator color={Colors.brand.emerald} size="small" /></View>
        ) : (
          stories.map((story) => {
            const isDiamond = story.prestige_weight === 3;
            const colors = getGradients(story.has_video, story.prestige_weight);
            
            return (
              <TouchableOpacity
                key={`story-${story.seller_id}`}
                style={styles.storyItem}
                activeOpacity={0.85}
                onPress={() => { Haptics.selectionAsync(); router.push(`/story-viewer/${story.id}` as any); }}
              >
                <Animated.View style={{ transform: [{ scale: (story.has_video || isDiamond) ? pulseAnim : 1 }] }}>
                  <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBorder}>
                    <View style={[styles.innerCircle, { backgroundColor: theme.background }]}>
                      <Image 
                        source={story.logo_url} 
                        style={[styles.avatarImage, { backgroundColor: theme.surface }]} 
                        contentFit="cover"
                        transition={300}
                        cachePolicy="memory-disk"
                      />
                      {story.has_video && (
                        <View style={styles.videoIndicator}>
                          <Play size={8} color="white" fill="white" />
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </Animated.View>
                
                <View style={styles.nameRow}>
                  <Text style={[styles.storyName, { color: theme.text }]} numberOfLines={1}>
                    {(story.display_name?.split(' ')[0] || 'Store').toUpperCase()}
                  </Text>
                  {isDiamond ? (
                    <Gem size={8} color="#D946EF" fill="#D946EF" />
                  ) : (
                    story.is_verified_status && <BadgeCheck size={10} color="#3B82F6" fill="#3B82F6" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: { borderBottomWidth: 1.5 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 18, gap: 16, alignItems: 'center' },
  loaderContainer: { width: 80, justifyContent: 'center', height: 72 },
  storyItem: { alignItems: 'center', width: 72 },
  avatarWrapper: { position: 'relative' },
  myAvatar: { width: 66, height: 66, borderRadius: 26, borderWidth: 1.5 },
  plusCircle: { 
    position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, 
    borderRadius: 11, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center' 
  },
  gradientBorder: { width: 74, height: 74, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  innerCircle: { width: 68, height: 68, borderRadius: 27, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarImage: { width: 62, height: 62, borderRadius: 24 },
  videoIndicator: { position: 'absolute', bottom: 3, right: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, backgroundColor: 'transparent' },
  storyName: { fontSize: 9, fontWeight: '900', letterSpacing: 0.2 }
});