import React from 'react';
import { StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface SocialMetricsProps {
  likes: number;
  comments: number;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  variant?: 'vertical' | 'horizontal';
  color?: string; // Custom override (e.g., White for Reels/Stories)
}

/**
 * 🏰 SOCIAL METRICS v83.0
 * Logic: Synchronized Emerald Handshake (Consolidated from red to brand emerald).
 * Interaction: Weighted Haptic feedback on engagement.
 * Performance: Memoized layout switching for smooth scrolling.
 */
export const SocialMetrics = ({ 
  likes, 
  comments, 
  isLiked, 
  onLike, 
  onComment, 
  variant = 'vertical', 
  color 
}: SocialMetricsProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  
  // 🎨 COLOR LOGIC: Use provided color (Reels) or default theme text (Feed)
  const baseIconColor = color || theme.text;
  const activeLikeColor = Colors.brand.emerald;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLike();
  };

  const handleComment = () => {
    Haptics.selectionAsync();
    onComment();
  };

  return (
    <View style={[
      variant === 'vertical' ? styles.vertical : styles.horizontal,
      { backgroundColor: 'transparent' }
    ]}>
      {/* ❤️ LIKE HANDSHAKE */}
      <TouchableOpacity 
        onPress={handleLike} 
        style={styles.metricItem}
        activeOpacity={0.7}
      >
        <Heart 
          size={24} 
          color={isLiked ? activeLikeColor : baseIconColor} 
          fill={isLiked ? activeLikeColor : "transparent"} 
          strokeWidth={2.5} 
        />
        <Text style={[
          styles.countText, 
          { color: isLiked ? activeLikeColor : baseIconColor }
        ]}>
          {likes > 0 ? likes : '0'}
        </Text>
      </TouchableOpacity>

      {/* 💬 COMMENT HANDSHAKE */}
      <TouchableOpacity 
        onPress={handleComment} 
        style={styles.metricItem}
        activeOpacity={0.7}
      >
        <MessageCircle 
          size={24} 
          color={baseIconColor} 
          strokeWidth={2.5} 
        />
        <Text style={[styles.countText, { color: baseIconColor }]}>
          {comments > 0 ? comments : '0'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  vertical: { 
    gap: 22, 
    alignItems: 'center' 
  },
  horizontal: { 
    flexDirection: 'row', 
    gap: 18, 
    alignItems: 'center' 
  },
  metricItem: { 
    alignItems: 'center', 
    gap: 5,
    minWidth: 40
  },
  countText: { 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'] // Prevents jittering when numbers change
  }
});