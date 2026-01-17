import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  Layers, Shirt, Sparkles, Smartphone, 
  Home, Activity, Wrench, Building2, Car 
} from 'lucide-react-native';

// 🏛️ Sovereign Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

/**
 * 🏰 CATEGORY PULSE v85.1 (Pure Build)
 * Audited: Section II Category Taxonomy & Vortex Theme Sync.
 */
const CATEGORIES = [
  { label: 'All', slug: 'all', icon: Layers },
  { label: 'Fashion', slug: 'fashion', icon: Shirt },
  { label: 'Beauty', slug: 'beauty', icon: Sparkles },
  { label: 'Electronics', slug: 'electronics', icon: Smartphone },
  { label: 'Home', slug: 'home', icon: Home },
  { label: 'Wellness', slug: 'wellness', icon: Activity },
  { label: 'Services', slug: 'services', icon: Wrench },
  { label: 'Real Estate', slug: 'real-estate', icon: Building2 },
  { label: 'Automotive', slug: 'automotive', icon: Car },
];

interface CategoryPulseProps {
  active: string;
  onSelect: (slug: string) => void;
}

export const CategoryPulse = React.memo(({ active, onSelect }: CategoryPulseProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.wrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
        decelerationRate="fast"
      >
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.slug;
          const Icon = cat.icon;

          return (
            <TouchableOpacity 
              key={cat.slug}
              activeOpacity={0.9}
              onPress={() => {
                if (cat.slug === 'all') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } else {
                  Haptics.selectionAsync();
                }
                onSelect(cat.slug);
              }}
              style={[
                styles.catBtn, 
                { backgroundColor: theme.surface, borderColor: theme.border },
                isActive && { backgroundColor: theme.text, borderColor: theme.text }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'transparent' }}>
                <Icon 
                  size={14} 
                  color={isActive ? theme.background : theme.text} 
                  strokeWidth={isActive ? 3 : 2.5} 
                />
                <Text style={[
                  styles.catText, 
                  { color: theme.text },
                  isActive && { color: theme.background }
                ]}>
                  {cat.label.toUpperCase()}
                </Text>
              </View>
              
              {isActive && (
                <View style={[styles.activeGlow, { backgroundColor: Colors.brand.emerald }]} />
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
    height: 60,
    marginTop: 15,
    marginBottom: 5,
    backgroundColor: 'transparent'
  },
  catScroll: { 
    flex: 1,
  },
  catContent: { 
    paddingRight: 40,
    alignItems: 'center',
    paddingLeft: 20,
    backgroundColor: 'transparent'
  },
  catBtn: { 
    paddingHorizontal: 20, 
    height: 46, 
    borderRadius: 18, 
    marginRight: 10, 
    borderWidth: 1.5, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  catText: { 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1.5
  },
  activeGlow: {
    position: 'absolute',
    bottom: 6,
    width: 12,
    height: 2,
    borderRadius: 2,
  }
});