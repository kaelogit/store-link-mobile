import React from 'react';
import { StyleSheet, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { MessageSquare, X, ShieldCheck, ArrowRight, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// App Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { width } = Dimensions.get('window');

interface ContactBridgeProps {
  visible: boolean;
  onClose: () => void;
  onSelectInApp: () => void;
  merchantName: string;
  isDiamond?: boolean;
}

/**
 * 🏰 CONTACT BRIDGE v25.0
 * Purpose: A security gate that encourages users to use the internal chat for safety.
 * Logic: Provides a briefing on protection benefits before starting a conversation.
 */
export const ContactBridge = ({ 
  visible, 
  onClose, 
  onSelectInApp, 
  merchantName,
  isDiamond 
}: ContactBridgeProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const handleOpenChat = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelectInApp();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.masterOverlay}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        </BlurView>
        
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          {/* Pull handle for visual cue */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          
          <View style={styles.header}>
            <View>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.text }]}>Secure Inquiry</Text>
                {isDiamond && <Zap size={14} color={Colors.brand.gold} fill={Colors.brand.gold} />}
              </View>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>Connecting with @{merchantName.toLowerCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
              <X size={20} color={theme.text} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <View style={styles.briefing}>
            <View style={styles.infoRow}>
              <ShieldCheck size={20} color={Colors.brand.emerald} strokeWidth={2.5} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                Payments made in-app are fully protected.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MessageSquare size={20} color={theme.text} strokeWidth={2.5} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                Your conversation and negotiation history is recorded.
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.chatBtn, { backgroundColor: theme.text }]} 
            onPress={handleOpenChat}
            activeOpacity={0.9}
          >
            <MessageSquare color={theme.background} size={20} strokeWidth={3} />
            <Text style={[styles.chatBtnText, { color: theme.background }]}>START SECURE CHAT</Text>
            <ArrowRight color={theme.background} size={18} strokeWidth={3} />
          </TouchableOpacity>

          <View style={styles.footer}>
             <Text style={[styles.footerNote, { color: theme.subtext }]}>
                BY STARTING THIS CHAT, YOU AGREE TO KEEP ALL PAYMENTS DISCUSSIONS INSIDE THE STORELINK PLATFORM.
             </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  masterOverlay: { flex: 1, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    padding: 30, 
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
  },
  handle: { width: 36, height: 4, borderRadius: 10, alignSelf: 'center', marginBottom: 25, opacity: 0.3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  closeBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 11, marginTop: 4, fontWeight: '800', textTransform: 'uppercase', opacity: 0.5, letterSpacing: 1 },
  briefing: { gap: 18, marginBottom: 35 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 13, fontWeight: '700', opacity: 0.8 },
  chatBtn: { 
    width: '100%', height: 72, borderRadius: 24, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    gap: 12, elevation: 8 
  },
  chatBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  footer: { marginTop: 30, paddingHorizontal: 10 },
  footerNote: { textAlign: 'center', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, lineHeight: 14 }
});