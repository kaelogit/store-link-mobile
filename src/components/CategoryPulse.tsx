import React, { useCallback, memo } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  Layers, Shirt, Sparkles, Smartphone, 
  Home, Activity, Wrench, Building2, Car, Gem
} from 'lucide-react-native';

// 🏛️ Sovereign Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

/**
 * 🏰 CATEGORY TAXONOMY v86.0
 * Logic: Triple-Anchor Filtering (Proximity + Relevance + Prestige).
 * Visual: Diamond Standard Squircles & High-Contrast State Sync.
 * Performance: Memoized selection handshake for zero-latency scrolling.
 */
const CATEGORIES = [
  { label: 'All', slug: 'All', icon: Layers, prestige: false },
  { label: 'Fashion', slug: 'Fashion', icon: Shirt, prestige: false },
  { label: 'Electronics', slug: 'Electronics', icon: Smartphone, prestige: true }, // High Diamond demand
  { label: 'Beauty', slug: 'Beauty', icon: Sparkles, prestige: false },
  { label: 'Home', slug: 'Home', icon: Home, prestige: false },
  { label: 'Wellness', slug: 'Wellness', icon: Activity, prestige: false },
  { label: 'Services', slug: 'Services', icon: Wrench, prestige: false },
  { label: 'Property', slug: 'Real Estate', icon: Building2, prestige: true },
  { label: 'Auto', slug: 'Automotive', icon: Car, prestige: false },
];

interface CategoryPulseProps {
  active: string;
  onSelect: (slug: string) => void;
}

export const CategoryPulse = memo(({ active, onSelect }: CategoryPulseProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const handlePress = useCallback((slug: string) => {
    if (slug === active) return;
    
    if (slug === 'All') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.selectionAsync();
    }
    onSelect(slug);
  }, [active, onSelect]);

  return (
    <View style={styles.wrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
        decelerationRate="fast"
        snapToAlignment="start"
        scrollEventThrottle={16}
      >
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.slug;
          const Icon = cat.icon;

          return (
            <TouchableOpacity 
              key={cat.slug}
              activeOpacity={0.85}
              onPress={() => handlePress(cat.slug)}
              style={[
                styles.catBtn, 
                { 
                  backgroundColor: theme.surface, 
                  borderColor: theme.border 
                },
                isActive && { 
                  backgroundColor: theme.text, 
                  borderColor: theme.text,
                  elevation: 4,
                  shadowColor: theme.text,
                  shadowOpacity: 0.1,
                  shadowRadius: 8
                }
              ]}
            >
              <View style={styles.innerContent}>
                <Icon 
                  size={15} 
                  color={isActive ? theme.background : theme.text} 
                  strokeWidth={isActive ? 3 : 2.2} 
                />
                <Text style={[
                  styles.catText, 
                  { color: theme.text },
                  isActive && { color: theme.background }
                ]}>
                  {cat.label.toUpperCase()}
                </Text>
                {cat.prestige && !isActive && (
                   <Gem size={8} color="#8B5CF6" fill="#8B5CF6" style={styles.prestigeDot} />
                )}
              </View>
              
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: Colors.brand.emerald }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    height: 64,
    marginVertical: 10,
    backgroundColor: 'transparent'
  },
  catScroll: { 
    flex: 1,
  },
  catContent: { 
    paddingRight: 40,
    alignItems: 'center',
    paddingLeft: 4,
    backgroundColor: 'transparent',
    gap: 10
  },
  catBtn: { 
    paddingHorizontal: 18, 
    height: 48, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  innerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: 'transparent' 
  },
  catText: { 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1.2
  },
  prestigeDot: {
    marginLeft: -4,
    marginTop: -8
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 3,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  }
});