import React, { useState } from 'react';
import { 
  StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Platform 
} from 'react-native';
import { 
  ShoppingBag, PlusSquare, Play, X, 
  ArrowRight, ShieldCheck, Gem 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { width } = Dimensions.get('window');

interface GuideProps {
  isVisible: boolean;
  userRole: 'buyer' | 'seller' | 'both';
  onComplete: () => void;
}

/**
 * 🏰 MARKETPLACE GUIDE v1.6 (Pure Build)
 * Audited: Section III Discovery FTUE & Plain English Refactor.
 */
export default function EmpireGuide({ isVisible, userRole, onComplete }: GuideProps) {
  const [step, setStep] = useState(0);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // 🏛️ ONBOARDING NODES (v75.0 Aligned)
  const steps = [
    {
      title: "MARKETPLACE",
      description: "Discover products near you. The best items rise based on community interest and your location.",
      icon: <ShoppingBag color={Colors.brand.emerald} size={40} strokeWidth={2.5} />,
      id: 'market'
    },
    {
      title: "VIDEO FEED",
      description: "Experience products in motion. Watch high-energy reels and shop items directly from the video.",
      icon: <Play color={Colors.brand.gold} size={40} fill={Colors.brand.gold} />,
      id: 'reels'
    },
    // Merchant Specific Node
    ...(userRole !== 'buyer' ? [{
      title: "SHOP MANAGEMENT",
      description: "Your merchant toolkit. Create product drops, manage your inventory, and track your sales.",
      icon: <PlusSquare color={theme.text} size={40} strokeWidth={2.5} />,
      id: 'merchant'
    }] : []),
    {
      title: "WALLET & COINS",
      description: "Your rewards hub. Earn coins from purchases, track your balance, and save your favorite items.",
      icon: <Gem color="#8B5CF6" size={40} fill="#8B5CF6" />,
      id: 'vault'
    }
  ];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onComplete}>
      <View style={styles.overlay}>
        {/* 🚪 EXIT GATE */}
        <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
          <Text style={styles.skipText}>SKIP TOUR</Text>
          <X color="rgba(255,255,255,0.6)" size={16} strokeWidth={3} />
        </TouchableOpacity>

        {/* 📋 ORIENTATION TERMINAL */}
        <View style={[styles.tooltipContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {steps[step].icon}
          </View>
          
          <View style={[styles.textStack, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>{steps[step].title}</Text>
            <Text style={[styles.stepDesc, { color: theme.subtext }]}>{steps[step].description}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.nextBtn, { backgroundColor: theme.text }]} 
            onPress={handleNext}
          >
            <Text style={[styles.nextText, { color: theme.background }]}>
              {step === steps.length - 1 ? "GET STARTED" : "CONTINUE"}
            </Text>
            <ArrowRight color={theme.background} size={20} strokeWidth={3} />
          </TouchableOpacity>

          {/* 🛡️ SECURITY SIGNAL */}
          <View style={[styles.securityRow, { backgroundColor: 'transparent' }]}>
            <ShieldCheck size={12} color={theme.border} />
            <Text style={[styles.securityText, { color: theme.border }]}>STORELINK SECURED</Text>
          </View>
        </View>

        {/* 📈 PROGRESS TRACKER */}
        <View style={[styles.indicatorRow, { backgroundColor: 'transparent' }]}>
          {steps.map((_, i) => (
            <View 
              key={i} 
              style={[styles.dot, step === i && styles.activeDot]} 
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.92)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 30 
  },
  skipBtn: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 70 : 50, 
    right: 25, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    padding: 10
  },
  skipText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  tooltipContainer: { 
    borderRadius: 40, 
    padding: 35, 
    width: '100%', 
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 30,
      },
      android: {
        elevation: 20
      }
    })
  },
  iconBox: { 
    width: 90, 
    height: 90, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 25,
    borderWidth: 1,
  },
  textStack: { alignItems: 'center', gap: 12 },
  stepTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  stepDesc: { 
    fontSize: 14, 
    textAlign: 'center', 
    lineHeight: 22, 
    fontWeight: '600',
    paddingHorizontal: 10 
  },
  nextBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingHorizontal: 25, 
    paddingVertical: 20, 
    borderRadius: 22, 
    marginTop: 35, 
    width: '100%', 
    justifyContent: 'center' 
  },
  nextText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 25 },
  securityText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  indicatorRow: { flexDirection: 'row', gap: 10, marginTop: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  activeDot: { backgroundColor: 'white', width: 28 },
});