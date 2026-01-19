import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Animated, Platform 
} from 'react-native';
import { 
  ShieldCheck, Lock, ArrowRight, Sparkles 
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// App Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { width } = Dimensions.get('window');

export interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: () => void;
  brandName?: string | null;
}

/**
 * 🏰 MERCHANT SUCCESS MODAL v79.0
 * Goal: Use simple English that everyone can understand.
 * Focus: Helping the user understand why they need to verify their shop.
 */
export const SuccessModal = ({ visible, onClose, onVerify, brandName }: SuccessModalProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  
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
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.overlay}>
        <Animated.View style={[
          styles.card, 
          { opacity, transform: [{ scale }], backgroundColor: theme.background }
        ]}>
          
          {/* 🎆 CELEBRATION ICON */}
          <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald + '15' }]}>
            <Sparkles size={40} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>
            {(brandName || 'YOUR SHOP').toUpperCase()}{"\n"}IS NOW READY!
          </Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Your shop has been created, but it is currently hidden from other users.
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* 🛡️ SAFETY INFORMATION */}
          <View style={styles.briefing}>
            <View style={styles.briefingItem}>
              <ShieldCheck size={24} color={Colors.brand.emerald} strokeWidth={2.5} />
              <View style={styles.briefingTextWrapper}>
                <Text style={[styles.briefingTitle, { color: theme.text }]}>GET VERIFIED</Text>
                <Text style={[styles.briefingDesc, { color: theme.subtext }]}>
                  To keep our community safe, we check every shop before it can start selling to customers.
                </Text>
              </View>
            </View>

            <View style={styles.briefingItem}>
              <Lock size={24} color="#EF4444" strokeWidth={2.5} />
              <View style={styles.briefingTextWrapper}>
                <Text style={[styles.briefingTitle, { color: theme.text }]}>SHOP IS LOCKED</Text>
                <Text style={[styles.briefingDesc, { color: theme.subtext }]}>
                  You cannot post new products until you finish the identity check.
                </Text>
              </View>
            </View>
          </View>

          {/* 🚀 ACTION BUTTONS */}
          <TouchableOpacity 
            style={[styles.verifyBtn, { backgroundColor: theme.text }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onVerify();
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.verifyBtnText, { color: theme.background }]}>VERIFY MY SHOP NOW</Text>
            <ArrowRight color={theme.background} size={20} strokeWidth={3} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: theme.border }]}>I'LL DO THIS LATER</Text>
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
    borderRadius: 45, 
    padding: 35, 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 10 }
    })
  },
  iconCircle: { 
    width: 90, height: 90, borderRadius: 32, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 25 
  },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, lineHeight: 30 },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 12, fontWeight: '600', lineHeight: 20 },
  divider: { width: '100%', height: 1.5, marginVertical: 30 },
  briefing: { gap: 28, width: '100%', backgroundColor: 'transparent' },
  briefingItem: { flexDirection: 'row', gap: 15, alignItems: 'flex-start', backgroundColor: 'transparent' },
  briefingTextWrapper: { flex: 1, backgroundColor: 'transparent' },
  briefingTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  briefingDesc: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  verifyBtn: { 
    width: '100%', height: 72, borderRadius: 24, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    gap: 12, marginTop: 40 
  },
  verifyBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  closeBtn: { marginTop: 25, padding: 10, backgroundColor: 'transparent' },
  closeBtnText: { fontWeight: '800', fontSize: 11, letterSpacing: 0.5 }
});