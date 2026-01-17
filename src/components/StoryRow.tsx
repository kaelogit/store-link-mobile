import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, 
  Image, ActivityIndicator, Animated, Easing
} from 'react-native';
import { Plus, BadgeCheck, Diamond, Zap, Star, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Sovereign Components
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import { Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

/**
 * 🏰 DISCOVERY STORIES v95.0
 * Fixed: Replaced username with slug in story processing.
 * Language: Simplified terminology for high-fidelity branding.
 */
export const StoryRow = () => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile } = useUserStore();

  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 🏛️ ELITE PULSE: Visual focus for premium content
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { 
          toValue: 1.04, duration: 1500, 
          easing: Easing.inOut(Easing.ease), useNativeDriver: true 
        }),
        Animated.timing(pulseAnim, { 
          toValue: 1, duration: 1500, 
          easing: Easing.inOut(Easing.ease), useNativeDriver: true 
        })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const fetchDiscoveryStories = useCallback(async () => {
    try {
      // 📡 DATA SYNC: Pulls weighted stories from the database
      const { data, error } = await supabase.rpc('get_weighted_personalized_stories', { 
        p_user_id: profile?.id || null,
        p_location_preference: profile?.location || 'Lagos'
      });

      if (error) throw error;

      // Filter: Only show stories from the last 12 hours
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      
      const processed = (data || []).map((s: any) => ({
        ...s,
        // 🛡️ DATA FIX: username -> slug
        logo_url: s.logo_url || s.profiles?.logo_url,
        slug: s.slug || s.profiles?.slug // Changed from username
      })).filter((s: any) => {
        return new Date(s.created_at) > twelveHoursAgo;
      });

      // SORTING: Priority order (Followed -> Diamond -> Local -> Video)
      const sorted = processed.sort((a: any, b: any) => {
        let scoreA = 0; let scoreB = 0;
        if (a.is_followed) scoreA += 40; if (b.is_followed) scoreB += 40; 
        if (a.prestige_weight === 3) scoreA += 25; if (b.prestige_weight === 3) scoreB += 25; 
        if (a.location === profile?.location) scoreA += 15; if (b.location === profile?.location) scoreB += 15; 
        if (a.type === 'video') scoreA += 10; if (b.type === 'video') scoreB += 10; 
        return scoreB - scoreA;
      });

      setStories(sorted);
    } catch (e) {
      console.error("Story Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.location]);

  useEffect(() => { fetchDiscoveryStories(); }, [fetchDiscoveryStories]);

  /**
   * 💎 BRAND GRADIENTS
   */
  const getGradients = (type: string, weight: number): readonly [string, string, ...string[]] => {
    if (weight === 3) return ['#8B5CF6', '#D946EF', '#3B82F6'] as const; // Diamond Elite
    if (type === 'video') return ['#EF4444', '#F97316', '#F59E0B'] as const; // Video Content
    return [Colors.brand.emerald, '#34D399'] as const; // Standard Drop
  };

  return (
    <View style={[styles.outerContainer, { borderBottomColor: theme.surface, backgroundColor: theme.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {/* ADD STORY BUTTON */}
        {profile?.is_seller && (
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.storyItem} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/seller/post-story'); 
            }}
          >
            <View style={styles.avatarWrapper}>
              <Image 
                source={{ uri: profile?.logo_url || 'https://via.placeholder.com/150' }} 
                style={[styles.myAvatar, { backgroundColor: theme.surface, borderColor: theme.border }]} 
              />
              <View style={[styles.plusCircle, { backgroundColor: theme.text, borderColor: theme.background }]}>
                <Plus size={10} color={theme.background} strokeWidth={4} />
              </View>
            </View>
            <Text style={[styles.storyName, { color: theme.text }]}>Add Drop</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loaderContainer}><ActivityIndicator color={Colors.brand.emerald} /></View>
        ) : (
          stories.map((story) => {
            const isReel = story.type === 'video'; 
            const weight = story.prestige_weight;
            const colors = getGradients(story.type, weight);
            
            return (
              <TouchableOpacity
                key={story.id}
                style={styles.storyItem}
                activeOpacity={0.9}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: `/story-viewer/[id]`, params: { id: story.id } });
                }}
              >
                <Animated.View style={{ transform: [{ scale: (isReel || weight === 3) ? pulseAnim : 1 }] }}>
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBorder}
                  >
                    <View style={[styles.innerCircle, { backgroundColor: theme.background }]}>
                      <Image 
                        source={{ uri: story.logo_url || 'https://via.placeholder.com/150' }} 
                        style={[styles.avatarImage, { backgroundColor: theme.surface }]} 
                      />
                      {isReel && (
                        <View style={styles.videoIndicator}>
                          <Play size={8} color="white" fill="white" />
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </Animated.View>
                
                <View style={styles.nameRow}>
                  <Text style={[styles.storyName, { color: theme.text }]} numberOfLines={1}>
                    {story.display_name?.split(' ')[0] || 'Brand'}
                  </Text>
                  {weight === 3 ? (
                    <Diamond size={8} color="#D946EF" fill="#D946EF" />
                  ) : (
                    story.is_verified && <BadgeCheck size={9} color="#3B82F6" fill="#3B82F6" />
                  )}
                </View>

                <View style={styles.contextRow}>
                   {weight === 3 ? (
                     <Star size={8} color="#D946EF" fill="#D946EF" />
                   ) : (
                     <Zap size={8} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
                   )}
                   <Text style={[
                     styles.contextTag, 
                     { color: theme.subtext },
                     isReel && { color: '#EF4444' },
                     weight === 3 && { color: '#D946EF' }
                   ]}>
                     {(weight === 3 ? 'Elite' : isReel ? 'Reel' : 'Drop').toUpperCase()}
                   </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { borderBottomWidth: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 15, gap: 15, alignItems: 'center' },
  loaderContainer: { width: 100, justifyContent: 'center', height: 100 },
  storyItem: { alignItems: 'center', width: 72 },
  avatarWrapper: { position: 'relative' },
  myAvatar: { width: 64, height: 64, borderRadius: 24, borderWidth: 1 },
  plusCircle: { 
    position: 'absolute', bottom: -1, right: -1, width: 22, height: 22, 
    borderRadius: 11, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center' 
  },
  gradientBorder: { width: 72, height: 72, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  innerCircle: { width: 66, height: 66, borderRadius: 25, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarImage: { width: 60, height: 60, borderRadius: 22 },
  videoIndicator: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8, backgroundColor: 'transparent' },
  storyName: { fontSize: 10, fontWeight: '900', letterSpacing: -0.2 },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, backgroundColor: 'transparent' },
  contextTag: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }
});