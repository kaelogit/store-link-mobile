import React, { useRef, useEffect } from 'react';
import { 
  View, TextInput, StyleSheet, TouchableOpacity, 
  Platform, Animated, Easing 
} from 'react-native';
import { Search, X, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface SearchProps {
  value: string;
  isFlashMode: boolean;
  onToggleFlash: () => void;
  onChange: (text: string) => void;
  onSearch?: () => void;
}

/**
 * 🏰 SEARCH PROTOCOL v85.1 (Pure Build)
 * Audited: Section III 15/5 Protocol & Geographic Anchoring Signals.
 */
export const SearchProtocol = React.memo(({ 
  value, 
  isFlashMode, 
  onToggleFlash, 
  onChange, 
  onSearch 
}: SearchProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const borderPulse = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // 🏛️ ACTIVITY PULSE: Idle guidance
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (value.length === 0 && !isFlashMode) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(borderPulse, { 
            toValue: 1, 
            duration: 2500, 
            easing: Easing.inOut(Easing.ease), 
            useNativeDriver: false 
          }),
          Animated.timing(borderPulse, { 
            toValue: 0, 
            duration: 2500, 
            easing: Easing.inOut(Easing.ease), 
            useNativeDriver: false 
          }),
        ])
      );
      animation.start();
    } else {
      borderPulse.setValue(0);
    }
    return () => animation?.stop();
  }, [value, isFlashMode]);

  // ⚡ VORTEX GLOW: High-velocity feedback for Flash mode
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isFlashMode) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { 
            toValue: 1, 
            duration: 600, 
            easing: Easing.linear,
            useNativeDriver: false 
          }),
          Animated.timing(glowAnim, { 
            toValue: 0, 
            duration: 600, 
            easing: Easing.linear,
            useNativeDriver: false 
          }),
        ])
      );
      animation.start();
    } else {
      glowAnim.setValue(0);
    }
    return () => animation?.stop();
  }, [isFlashMode]);

  const handleTextChange = (text: string) => {
    onChange(text);
    if (text.length > 0) Haptics.selectionAsync();
  };

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onChange('');
    inputRef.current?.focus();
  };

  const onToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onToggleFlash();
  };

  // 🧬 THEMED INTERPOLATION
  const animatedBorderColor = borderPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, Colors.brand.emerald]
  });

  const flashGlowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.brand.gold, '#EF4444']
  });

  return (
    <Animated.View style={[
      styles.searchContainer, 
      { 
        backgroundColor: theme.background,
        borderColor: isFlashMode ? flashGlowColor : animatedBorderColor, 
        borderWidth: (value.length === 0 || isFlashMode) ? 2 : 1.5,
        shadowColor: isFlashMode ? '#EF4444' : Colors.brand.emerald,
        shadowOpacity: isFlashMode ? 0.3 : 0.05
      }
    ]}>
      <View style={[styles.iconWrapper, { backgroundColor: 'transparent' }]}>
          <Search size={18} color={value.length > 0 ? theme.text : theme.subtext} strokeWidth={3} />
      </View>
      
      <TextInput 
        ref={inputRef}
        placeholder={isFlashMode ? "Prioritizing verified shops..." : "Search marketplace..."} 
        style={[styles.searchInput, { color: theme.text }]}
        value={value}
        onChangeText={handleTextChange}
        placeholderTextColor={theme.subtext}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        selectionColor={isFlashMode ? "#EF4444" : Colors.brand.emerald}
        onSubmitEditing={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSearch?.(); 
        }} 
      />
      
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={[styles.clearBtn, { backgroundColor: theme.text }]} activeOpacity={0.7}>
          <X size={10} color={theme.background} strokeWidth={4} />
        </TouchableOpacity>
      )}

      {/* ⚡ DISCOVERY TOGGLE */}
      <TouchableOpacity 
        style={[styles.flashToggle, { borderLeftColor: theme.surface }, isFlashMode && styles.flashToggleActive]} 
        activeOpacity={0.8}
        onPress={onToggle}
      >
        <Zap 
          size={18} 
          color={isFlashMode ? "#FFF" : Colors.brand.gold} 
          fill={isFlashMode ? "#FFF" : "transparent"} 
          strokeWidth={2.5} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 24, 
    paddingHorizontal: 18, 
    height: 64, 
    gap: 12,
    marginTop: 10,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
      android: { elevation: 5 }
    })
  },
  iconWrapper: { justifyContent: 'center', alignItems: 'center' },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '800', 
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    letterSpacing: -0.5
  },
  clearBtn: {
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 4
  },
  flashToggle: {
    paddingLeft: 18,
    borderLeftWidth: 1.5,
    height: '40%',
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  flashToggleActive: {
    borderLeftColor: 'transparent',
    backgroundColor: '#EF4444',
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginLeft: 8
  }
});