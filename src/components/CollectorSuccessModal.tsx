import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
    ArrowRight,
    Compass,
    Heart,
    ShieldCheck
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Platform
} from 'react-native';

// 🏛️ Sovereign Components
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
 * 🏰 COLLECTOR SUCCESS MODAL v93.1 (Pure Build)
 * Audited: Section I Identity Layer & Plain English Refactor.
 */
export const CollectorSuccessModal = ({ visible, onClose, onExplore }: CollectorSuccessModalProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true })
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={60} tint="dark" style={styles.overlay}>
        <Animated.View style={[
            styles.card, 
            { opacity, transform: [{ scale }], backgroundColor: theme.background }
        ]}>
          
          <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald + '15' }]}>
            <Heart size={40} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>WELCOME TO{"\n"}THE COMMUNITY.</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>Your account is active. Start discovering unique products today.</Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* 🛡️ BENEFITS BRIEFING */}
          <View style={{ gap: 25, width: '100%', backgroundColor: 'transparent' }}>
            <View style={styles.briefingItem}>
              <Compass size={24} color={Colors.brand.emerald} strokeWidth={2.5} />
              <View style={styles.briefingTextWrapper}>
                <Text style={[styles.briefingTitle, { color: theme.text }]}>LOCAL DISCOVERY</Text>
                <Text style={[styles.briefingDesc, { color: theme.subtext }]}>Explore hand-picked brands and rare items near you.</Text>
              </View>
            </View>

            <View style={styles.briefingItem}>
              <ShieldCheck size={24} color={theme.text} strokeWidth={2.5} />
              <View style={styles.briefingTextWrapper}>
                <Text style={[styles.briefingTitle, { color: theme.text }]}>TRUSTED SHOPS</Text>
                <Text style={[styles.briefingDesc, { color: theme.subtext }]}>Shop with confidence. We only feature shops that pass our security check.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.exploreBtn, { backgroundColor: theme.text }]} 
            onPress={onExplore}
            activeOpacity={0.8}
          >
            <Text style={[styles.exploreBtnText, { color: theme.background }]}>START EXPLORING</Text>
            <ArrowRight color={theme.background} size={20} strokeWidth={3} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: 'transparent' }]} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: theme.subtext }]}>Go to my profile</Text>
          </TouchableOpacity>

        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { 
    width: width * 0.88, 
    borderRadius: 40, 
    padding: 35, 
    alignItems: 'center',
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 20,
        },
        android: {
            elevation: 10
        }
    })
  },
  iconCircle: { 
    width: 90, height: 90, borderRadius: 45, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 25 
  },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -1, lineHeight: 32 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 12, fontWeight: '600', lineHeight: 20 },
  divider: { width: '100%', height: 1, marginVertical: 30 },
  briefingItem: { flexDirection: 'row', gap: 15, alignItems: 'flex-start', backgroundColor: 'transparent' },
  briefingTextWrapper: { flex: 1, backgroundColor: 'transparent' },
  briefingTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  briefingDesc: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  exploreBtn: { 
    width: '100%', height: 72, borderRadius: 22, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    gap: 12, marginTop: 40 
  },
  exploreBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  closeBtn: { marginTop: 20, padding: 10 },
  closeBtnText: { fontWeight: '700', fontSize: 13 }
});