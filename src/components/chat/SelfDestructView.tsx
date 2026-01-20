import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';

interface SelfDestructProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
}

/**
 * 🏰 SELF-DESTRUCT ANIMATION v1.1
 * Purpose: Provides visual proof that a private photo has been deleted.
 * Logic: A smooth fade-out and scale-down transition.
 * Fix: Added useRef to persist animation values across renders.
 */
export const SelfDestructView = ({ isVisible, onAnimationComplete }: SelfDestructProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  
  // 🛠️ FIXED: Use useRef to persist animated values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      // Reset values just in case
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);

      // 🎬 START THE DISSOLVE EFFECT
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1200, // Slightly longer for dramatic effect
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 1200,
          useNativeDriver: true,
        })
      ]).start(({ finished }) => {
        if (finished) {
          onAnimationComplete();
        }
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View 
        style={[
          styles.container, 
          { 
            backgroundColor: theme.background,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.iconHalo, { backgroundColor: `${Colors.brand.emerald}15` }]}>
            <ShieldCheck size={40} color={Colors.brand.emerald} strokeWidth={2.5} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>SECURELY DELETED</Text>
          <Text style={[styles.subtext, { color: theme.subtext }]}>
            This image has been removed from your device.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  iconHalo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.6,
    maxWidth: 250,
  },
});