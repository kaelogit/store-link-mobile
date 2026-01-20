import React, { useCallback, memo } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View as RNView } from 'react-native';
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
 * 🏰 CATEGORY TAXONOMY v87.0
 * Logic: Triple-Anchor Filtering (Proximity + Relevance + Prestige).
 * Visual: Diamond Standard Squircles & High-Contrast State Sync.
 * Performance: Memoized selection handshake for zero-latency scrolling.
 */
const CATEGORIES = [
  { label: 'All', slug: 'All', icon: Layers, prestige: false },
  { label: 'Fashion', slug: 'Fashion', icon: Shirt, prestige: true },
  { label: 'Electronics', slug: 'Electronics', icon: Smartphone, prestige: false }, // High Diamond demand
  { label: 'Beauty', slug: 'Beauty', icon: Sparkles, prestige: true },
  { label: 'Home', slug: 'Home', icon: Home, prestige: false },
  { label: 'Wellness', slug: 'Wellness', icon: Activity, prestige: false },
  { label: 'Services', slug: 'Services', icon: Wrench, prestige: false },
  { label: 'Property', slug: 'Real Estate', icon: Building2, prestige: false },
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
        snapToAlignment="center" // 🛡️ Snappy feel
        snapToInterval={100} // Approximate item width + gap
      >
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.slug;
          const Icon = cat.icon;

          return (
            <TouchableOpacity 
              key={cat.slug}
              activeOpacity={0.75}
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
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 3 }
                }
              ]}
            >
              <View style={styles.innerContent}>
                <Icon 
                  size={16} 
                  color={isActive ? theme.background : theme.text} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <Text style={[
                  styles.catText, 
                  { color: theme.text },
                  isActive && { color: theme.background }
                ]}>
                  {cat.label.toUpperCase()}
                </Text>
                {cat.prestige && !isActive && (
                   <Gem size={10} color="#8B5CF6" fill="#8B5CF6" style={styles.prestigeDot} />
                )}
              </View>
              
              {isActive && (
                <RNView style={[styles.activeIndicator, { backgroundColor: Colors.brand.emerald }]} />
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
    paddingRight: 25,
    alignItems: 'center',
    paddingLeft: 20, // 🛡️ Aligned with page padding
    backgroundColor: 'transparent',
    gap: 12
  },
  catBtn: { 
    paddingHorizontal: 18, 
    height: 46, 
    borderRadius: 18, 
    borderWidth: 1.5, 
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  innerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: 'transparent' 
  },
  catText: { 
    fontSize: 11, // 🛡️ Increased for legibility
    fontWeight: '900', 
    letterSpacing: 1
  },
  prestigeDot: {
    marginLeft: -4,
    marginTop: -8,
    opacity: 0.8
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