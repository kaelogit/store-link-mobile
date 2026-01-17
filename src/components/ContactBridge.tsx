import React from 'react';
import { StyleSheet, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { MessageSquare, Phone, X, ShieldCheck, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { width } = Dimensions.get('window');

interface ContactBridgeProps {
  visible: boolean;
  onClose: () => void;
  onSelectInApp: () => void;
  onSelectWhatsApp: () => void;
  merchantName: string;
}

/**
 * 🏰 CONTACT BRIDGE v22.1 (Pure Build)
 * Audited: Section VII Messaging Governance & Handshake Security.
 */
export const ContactBridge = ({ 
  visible, 
  onClose, 
  onSelectInApp, 
  onSelectWhatsApp, 
  merchantName 
}: ContactBridgeProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const handleSelection = (type: 'in-app' | 'whatsapp') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (type === 'in-app') onSelectInApp();
    else onSelectWhatsApp();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
        
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          
          <View style={[styles.header, { backgroundColor: 'transparent' }]}>
            <View style={{ backgroundColor: 'transparent' }}>
              <Text style={[styles.title, { color: theme.text }]}>Communication</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>Contacting @{merchantName.toLowerCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
              <X size={20} color={theme.text} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <View style={[styles.options, { backgroundColor: 'transparent' }]}>
            {/* 🛡️ IN-APP MESSENGER (Handshake Official) */}
            <TouchableOpacity 
              style={[styles.optionCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
              onPress={() => handleSelection('in-app')}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.text }]}>
                <MessageSquare color={theme.background} size={22} strokeWidth={2.5} />
              </View>
              <View style={[styles.optionText, { backgroundColor: 'transparent' }]}>
                <View style={[styles.row, { backgroundColor: 'transparent' }]}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>Secure Messaging</Text>
                  <ShieldCheck size={12} color={Colors.brand.emerald} />
                </View>
                <Text style={[styles.optionSub, { color: theme.subtext }]}>Best for order history and confirming payments.</Text>
              </View>
              <ChevronRight size={16} color={theme.border} strokeWidth={3} />
            </TouchableOpacity>

            {/* 🟢 WHATSAPP BRIDGE (Direct Line) */}
            <TouchableOpacity 
              style={[styles.optionCard, { backgroundColor: theme.surface, borderColor: 'rgba(37, 211, 102, 0.3)' }]} 
              onPress={() => handleSelection('whatsapp')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#25D366' }]}>
                <Phone color="white" size={22} strokeWidth={2.5} />
              </View>
              <View style={[styles.optionText, { backgroundColor: 'transparent' }]}>
                <Text style={[styles.optionTitle, { color: '#25D366' }]}>WhatsApp Business</Text>
                <Text style={[styles.optionSub, { color: theme.subtext }]}>Direct chat for quick questions and negotiation.</Text>
              </View>
              <ChevronRight size={16} color={theme.border} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.footerNote, { color: theme.subtext }]}>CONFIRM ALL PAYMENTS INSIDE THE APP FOR PROTECTION</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 25, 
    paddingBottom: Platform.OS === 'ios' ? 50 : 35,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10
      }
    })
  },
  handle: { width: 40, height: 5, borderRadius: 10, alignSelf: 'center', marginBottom: 25 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  options: { gap: 12 },
  optionCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1.5, 
    gap: 15,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionTitle: { fontSize: 16, fontWeight: '900' },
  optionSub: { fontSize: 12, marginTop: 4, fontWeight: '600', lineHeight: 16 },
  footerNote: { textAlign: 'center', fontSize: 9, fontWeight: '900', marginTop: 35, letterSpacing: 1.2 }
});