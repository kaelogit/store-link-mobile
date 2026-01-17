import React from 'react';
import { 
  StyleSheet, Modal, TouchableOpacity, 
  Dimensions, Linking, Platform 
} from 'react-native';
import { Check, MessageSquare, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface SuccessProps {
  visible: boolean;
  storeName: string;
  storeId?: string; 
  whatsappUrl?: string; 
  channel: 'WHATSAPP' | 'CHAT' | null;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

/**
 * 🏰 ORDER SUCCESS v5.1 (Pure Build)
 * Audited: Section VII Messaging Governance & Vortex Theme Sync.
 */
export const OrderSuccessModal = ({ 
  visible, storeName, storeId, whatsappUrl, channel, onClose 
}: SuccessProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (channel === 'WHATSAPP' && whatsappUrl) {
      Linking.openURL(whatsappUrl);
    } else if (channel === 'CHAT' && storeId) {
      router.push(`/chat/${storeId}` as any);
    }
    
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          
          {/* 🏛️ SUCCESS ICON */}
          <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald }]}>
            <Check size={40} color="white" strokeWidth={4} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>ORDER PLACED</Text>
          <Text style={[styles.subtext, { color: theme.subtext }]}>
            Your order for <Text style={[styles.bold, { color: theme.text }]}>{storeName.toUpperCase()}</Text> has been sent to the merchant.
          </Text>

          {/* 🚀 DYNAMIC ACTION */}
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.text }]} 
            onPress={handleAction}
            activeOpacity={0.8}
          >
            {channel === 'WHATSAPP' ? (
              <Send size={20} color={theme.background} fill={theme.background} />
            ) : (
              <MessageSquare size={20} color={theme.background} fill={theme.background} />
            )}
            <Text style={[styles.btnText, { color: theme.background }]}>
              {channel === 'WHATSAPP' ? 'FINISH ON WHATSAPP' : 'OPEN SECURE CHAT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.closeText, { color: theme.border }]}>RETURN TO HOME</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 30 
  },
  content: { 
    width: '100%', 
    borderRadius: 40, 
    padding: 40, 
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
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 25,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '900', 
    letterSpacing: -1,
    marginBottom: 15,
    textAlign: 'center'
  },
  subtext: { 
    fontSize: 14, 
    textAlign: 'center', 
    lineHeight: 22,
    marginBottom: 35,
    fontWeight: '600'
  },
  bold: { fontWeight: '900' },
  actionBtn: { 
    width: '100%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12, 
    paddingVertical: 20, 
    borderRadius: 22,
  },
  btnText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  closeBtn: { marginTop: 25 },
  closeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});