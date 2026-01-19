import React, { useRef, useEffect, useCallback, memo } from 'react';
import { 
  View, TextInput, StyleSheet, TouchableOpacity, 
  Platform, Animated, Easing, LayoutAnimation 
} from 'react-native';
import { Search, X, Zap, MapPin, Gem } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Connection
import { Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface SearchProps {
  value: string;
  isFlashMode: boolean;
  onToggleFlash: () => void;
  onChange: (text: string) => void;
  onSearch?: () => void;
  locationLabel?: string; // e.g., "Lekki, Lagos"
}

/**
 * 🏰 SEARCH BAR v89.0
 * Purpose: Helping users find local stores and items.
 * Sort Order: 1. Premium Sellers, 2. Closest Stores, 3. Active Sales.
 */
export const SearchProtocol = memo(({ 
  value, 
  isFlashMode, 
  onToggleFlash, 
  onChange, 
  onSearch,
  locationLabel
}: SearchProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const borderPulse = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const locationPulse = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const hasValue = value.length > 0;

  /** 🛡️ SEARCH ANIMATIONS */
  useEffect(() => {
    // 1. Subtle pulse when search is empty
    if (!hasValue && !isFlashMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderPulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(borderPulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      ).start();
    }

    // 2. High-energy pulse for Sale Mode
    if (isFlashMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }),
        ])
      ).start();
    }

    // 3. Location icon pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(locationPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(locationPulse, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      borderPulse.stopAnimation();
      glowAnim.stopAnimation();
      locationPulse.stopAnimation();
    };
  }, [hasValue, isFlashMode]);

  const handleTextChange = useCallback((text: string) => {
    onChange(text);
    if (text.length > 0 && text.length % 4 === 0) {
      Haptics.selectionAsync();
    }
  }, [onChange]);

  const onToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.notificationAsync(isFlashMode ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
    onToggleFlash();
  }, [onToggleFlash, isFlashMode]);

  // DYNAMIC STYLES
  const animatedBorder = borderPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, '#8B5CF6'] // Pulses into Premium Purple
  });

  const flashBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.brand.gold, '#EF4444']
  });

  return (
    <View style={styles.outerWrapper}>
      {/* 📍 LOCATION ANCHOR */}
      <View style={styles.locationHeader}>
        <Animated.View style={{ opacity: locationPulse }}>
           <MapPin size={10} color={Colors.brand.emerald} strokeWidth={3} />
        </Animated.View>
        <Text style={[styles.locationText, { color: theme.subtext }]}>
          SHOWING RESULTS IN <Text style={{ color: theme.text, fontWeight: '900' }}>{locationLabel || "YOUR AREA"}</Text>
        </Text>
        <View style={styles.diamondSignal}>
           <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />
           <Text style={styles.diamondSignalText}>PREMIUM FIRST</Text>
        </View>
      </View>

      <Animated.View style={[
        styles.searchContainer, 
        { 
          backgroundColor: theme.surface,
          borderColor: isFlashMode ? flashBorderColor : (hasValue ? Colors.brand.emerald : animatedBorder),
          borderWidth: isFlashMode ? 2 : 1.5,
          elevation: isFlashMode ? 6 : 0,
        }
      ]}>
        <View style={styles.iconWrapper}>
          <Search size={18} color={hasValue || isFlashMode ? theme.text : theme.subtext} strokeWidth={3} />
        </View>
        
        <TextInput 
          ref={inputRef}
          placeholder={isFlashMode ? "Hurry! Local deals ending soon..." : "Search shops or items nearby..."} 
          style={[styles.searchInput, { color: theme.text }]}
          value={value}
          onChangeText={handleTextChange}
          placeholderTextColor={`${theme.subtext}80`}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          selectionColor="#8B5CF6"
          onSubmitEditing={() => onSearch?.()}
        />
        
        {hasValue && (
          <TouchableOpacity onPress={() => onChange('')} style={[styles.clearBtn, { backgroundColor: theme.text }]}>
            <X size={10} color={theme.background} strokeWidth={4} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.flashToggle, { borderLeftColor: theme.border }, isFlashMode && styles.flashToggleActive]} 
          onPress={onToggle}
        >
          <Zap size={18} color={isFlashMode ? "#FFF" : Colors.brand.gold} fill={isFlashMode ? "#FFF" : "transparent"} strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerWrapper: { marginVertical: 8 },
  locationHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8, 
    paddingHorizontal: 8,
    gap: 6
  },
  locationText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  diamondSignal: { 
    marginLeft: 'auto', 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(139, 92, 246, 0.1)', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8 
  },
  diamondSignalText: { fontSize: 8, fontWeight: '900', color: '#8B5CF6' },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    height: 58,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } } })
  },
  iconWrapper: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '700' },
  clearBtn: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  flashToggle: { paddingLeft: 14, borderLeftWidth: 1.5, height: 28, justifyContent: 'center', minWidth: 40 },
  flashToggleActive: { backgroundColor: '#EF4444', borderRadius: 12, borderLeftWidth: 0, marginLeft: 10 }
});