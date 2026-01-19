import React from 'react';
import { 
  StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Platform 
} from 'react-native';
import { Check, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// App Connection
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface SuccessProps {
  visible: boolean;
  storeName: string;
  onClose: () => void;
  storeId?: string; 
  threadId?: string;
}

const { width } = Dimensions.get('window');

/**
 * 🏰 ORDER SUCCESS MODAL v8.0
 * Purpose: Confirmation screen after a successful checkout.
 * Features: Direct routing to internal chat and simple English labels.
 */
export const OrderSuccessModal = ({ 
  visible, storeName, threadId, onClose 
}: SuccessProps) => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];

  /** 💬 GO TO CONVERSATION */
  const handleViewOrder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onClose();
    
    if (threadId) {
      // Navigate to the specific chat thread for this order
      router.push(`/chat/${threadId}` as any);
    } else {
      // Fallback: Go to the general messages tab
      router.replace('/(tabs)/messages');
    }
  };

  /** 🏠 BACK TO FEED */
  const handleFinalExit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    router.replace('/(tabs)');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.masterOverlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          
          {/* SUCCESS ICON */}
          <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald }]}>
            <Check size={44} color="white" strokeWidth={4} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>ORDER PLACED!</Text>
          
          <View style={styles.messageStack}>
            <Text style={[styles.subtext, { color: theme.subtext }]}>
              Your request for <Text style={styles.bold}>@{storeName.toLowerCase()}</Text> has been sent.
            </Text>
            
            {/* SAFETY LABEL */}
            <View style={[styles.safetyBadge, { backgroundColor: theme.surface }]}>
              <ShieldCheck size={14} color={Colors.brand.emerald} />
              <Text style={[styles.safetyText, { color: theme.text }]}>SECURE TRANSACTION</Text>
            </View>
          </View>

          {/* MAIN ACTION BUTTON */}
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.text }]} 
            onPress={handleViewOrder}
            activeOpacity={0.8}
          >
            <MessageSquare size={18} color={theme.background} fill={theme.background} />
            <Text style={[styles.btnText, { color: theme.background }]}>VIEW ORDER STATUS</Text>
            <ArrowRight size={18} color={theme.background} strokeWidth={3} />
          </TouchableOpacity>

          {/* SECONDARY ACTION */}
          <TouchableOpacity 
            onPress={handleFinalExit} 
            style={styles.closeBtn}
            activeOpacity={0.6}
          >
            <Text style={[styles.closeText, { color: theme.subtext }]}>CONTINUE SHOPPING</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  masterOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 25 
  },
  content: { 
    width: '100%', 
    borderRadius: 40, 
    padding: 35, 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
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
    width: 88, 
    height: 88, 
    borderRadius: 44, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 25,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '900', 
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center'
  },
  messageStack: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 35,
  },
  subtext: { 
    fontSize: 15, 
    textAlign: 'center', 
    lineHeight: 22,
    fontWeight: '600',
    paddingHorizontal: 10
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  safetyText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bold: { fontWeight: '900' },
  actionBtn: { 
    width: '100%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12, 
    height: 72,
    borderRadius: 24,
  },
  btnText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { marginTop: 25, padding: 10 },
  closeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1, opacity: 0.6 }
});