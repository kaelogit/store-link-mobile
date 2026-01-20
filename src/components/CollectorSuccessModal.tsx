import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Compass,
  Heart,
  ShieldCheck,
  Zap
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  View as RNView
} from 'react-native';

// App Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { width } = Dimensions.get('window');

interface CollectorSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onExplore: () => void;
}

/**
 * 🏰 SUCCESS MODAL v96.0
 * Purpose: A friendly welcome message for new users.
 * Visual: Clean layout with smooth entrance animations.
 */
export const CollectorSuccessModal = ({ visible, onClose, onExplore }: CollectorSuccessModalProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.parallel([
        Animated.spring(scale, { 
            toValue: 1, 
            friction: 7, 
            tension: 50, 
            useNativeDriver: true 
        }),
        Animated.timing(opacity, { 
            toValue: 1, 
            duration: 300, 
            useNativeDriver: true 
        }),
        Animated.spring(slideUp, { 
            toValue: 0, 
            friction: 8, 
            useNativeDriver: true 
        })
      ]).start();
    } else {
        // Reset state on close for next time
        scale.setValue(0.9);
        opacity.setValue(0);
        slideUp.setValue(30);
    }
  }, [visible]);

  return (
    <Modal 
        visible={visible} 
        transparent 
        animationType="none" 
        statusBarTranslucent
        accessibilityViewIsModal={true}
    >
      <View style={styles.masterContainer}>
        {/* BLUR BACKDROP */}
        <BlurView 
            intensity={Platform.OS === 'ios' ? 70 : 100} 
            tint={colorScheme === 'dark' ? 'dark' : 'regular'} 
            style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.overlay} 
            onPress={onClose} 
          />
        </BlurView>

        <Animated.View style={[
            styles.card, 
            { 
              opacity, 
              transform: [{ scale }, { translateY: slideUp }], 
              backgroundColor: theme.background,
              shadowColor: theme.text
            }
        ]}>
          
          <RNView style={[styles.iconCircle, { backgroundColor: `${Colors.brand.emerald}15` }]}>
            <Heart size={48} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
          </RNView>
          
          <Text style={[styles.title, { color: theme.text }]}>WELCOME TO{"\n"}STORELINK.</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Your account is ready. You can now start browsing the marketplace and following your favorite stores.
          </Text>

          <RNView style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* 🛡️ BENEFITS PREVIEW */}
          <RNView style={styles.briefingContainer}>
            <View style={styles.briefingItem}>
              <RNView style={[styles.miniIconBox, { backgroundColor: theme.surface }]}>
                <Compass size={20} color={Colors.brand.emerald} strokeWidth={2.5} />
              </RNView>
              <View style={styles.briefingTextWrapper}>
                <Text style={[styles.briefingTitle, { color: theme.text }]}>LOCAL UPDATES</Text>
                <Text style={[styles.briefingDesc, { color: theme.subtext }]}>Be the first to see new arrivals and limited items in your city.</Text>
              </View>
            </View>

            <View style={styles.briefingItem}>
              <RNView style={[styles.miniIconBox, { backgroundColor: theme.surface }]}>
                <ShieldCheck size={20} color={theme.text} strokeWidth={2.5} />
              </RNView>
              <View style={styles.briefingTextWrapper}>
                <Text style={[styles.briefingTitle, { color: theme.text }]}>SAFE SHOPPING</Text>
                <Text style={[styles.briefingDesc, { color: theme.subtext }]}>We verify stores to ensure you have a safe experience every time.</Text>
              </View>
            </View>

            <View style={styles.briefingItem}>
              <RNView style={[styles.miniIconBox, { backgroundColor: theme.surface }]}>
                <Zap size={20} color={Colors.brand.gold} strokeWidth={2.5} />
              </RNView>
              <View style={styles.briefingTextWrapper}>
                <Text style={[styles.briefingTitle, { color: theme.text }]}>DIRECT CHAT</Text>
                <Text style={[styles.briefingDesc, { color: theme.subtext }]}>Talk directly with sellers to ask questions or negotiate prices.</Text>
              </View>
            </View>
          </RNView>

          <TouchableOpacity 
            style={[styles.exploreBtn, { backgroundColor: theme.text }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onExplore();
            }}
            activeOpacity={0.9}
          >
            <Text style={[styles.exploreBtnText, { color: theme.background }]}>START EXPLORING</Text>
            <ArrowRight color={theme.background} size={20} strokeWidth={3} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={[styles.closeBtnText, { color: theme.subtext }]}>View my profile</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  masterContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, width: '100%' },
  card: { 
    width: width * 0.9, 
    borderRadius: 36, 
    padding: 30, 
    alignItems: 'center',
    ...Platform.select({
        ios: { shadowOpacity: 0.15, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } },
        android: { elevation: 12 }
    })
  },
  iconCircle: { 
    width: 90, height: 90, borderRadius: 45, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 20 
  },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -1, lineHeight: 28 },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 12, fontWeight: '600', lineHeight: 20, opacity: 0.8 },
  
  divider: { width: '100%', height: 1.5, marginVertical: 25, opacity: 0.5 },
  
  briefingContainer: { gap: 20, width: '100%', backgroundColor: 'transparent' },
  briefingItem: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', backgroundColor: 'transparent' },
  miniIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  briefingTextWrapper: { flex: 1, backgroundColor: 'transparent', paddingTop: 2 },
  briefingTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  briefingDesc: { fontSize: 12, fontWeight: '600', lineHeight: 18, opacity: 0.7 },
  
  exploreBtn: { 
    width: '100%', height: 68, borderRadius: 24, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    gap: 12, marginTop: 40, elevation: 8 
  },
  exploreBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  
  closeBtn: { marginTop: 20, padding: 10 },
  closeBtnText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }
});