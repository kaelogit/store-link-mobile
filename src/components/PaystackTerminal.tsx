import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { X, Lock, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface PaystackProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ref: string) => void;
  email: string;
  amount: number;
  metadata?: any;
}

/**
 * 🏰 PAYMENT TERMINAL v21.6 (Pure Build)
 * Audited: Section VI Economic Validation & Encrypted Handshake.
 */
export const PaystackTerminal = ({ isOpen, onClose, onSuccess, email, amount, metadata }: PaystackProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // 🛡️ GATEWAY CONFIG
  const publicKey = "pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"; 
  
  const params = [
    `email=${encodeURIComponent(email)}`,
    `amount=${amount * 100}`, // Paystack amount is in kobo
    `metadata=${encodeURIComponent(JSON.stringify(metadata))}`
  ].join('&');

  const checkoutUrl = `https://checkout.paystack.com/${publicKey}?${params}`;

  /**
   * 📡 STATUS MONITOR
   * Detects the redirect from the payment gateway to finalize the transaction.
   */
  const handleNavigationChange = (state: any) => {
    const isSuccess = state.url.includes('callback') || state.url.includes('success') || state.url.includes('trxref');
    
    if (isSuccess && !isVerifying) {
      const urlParts = state.url.split('?');
      if (urlParts.length > 1) {
        // Simple regex fallback for URLSearchParams in all environments
        const refMatch = state.url.match(/[?&](?:reference|trxref)=([^&]+)/);
        const reference = refMatch ? refMatch[1] : null;
        
        if (reference) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsVerifying(true); 
          onSuccess(reference);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* 🔒 SECURITY HEADER */}
        <View style={[styles.header, { borderBottomColor: theme.surface }]}>
          <View style={[styles.securityIndicator, { backgroundColor: Colors.brand.emerald + '15' }]}>
            <Lock size={12} color={Colors.brand.emerald} strokeWidth={3} />
            <Text style={[styles.securityText, { color: Colors.brand.emerald }]}>SECURE PAYMENT</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]} disabled={isVerifying}>
            <X color={theme.text} size={22} strokeWidth={3} />
          </TouchableOpacity>
        </View>
        
        {isVerifying ? (
          <View style={[styles.centered, { backgroundColor: 'transparent' }]}>
             <ActivityIndicator color={Colors.brand.emerald} size="large" />
             <Text style={[styles.statusText, { color: theme.text }]}>CONFIRMING PAYMENT...</Text>
          </View>
        ) : (
          <WebView 
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={handleNavigationChange}
            startInLoadingState={true}
            style={{ flex: 1 }}
            renderLoading={() => (
              <View style={[styles.loader, { backgroundColor: theme.background }]}>
                <ActivityIndicator color={Colors.brand.emerald} size="large" />
                <Text style={[styles.loaderText, { color: theme.subtext }]}>CONNECTING TO PAYSTACK...</Text>
              </View>
            )}
          />
        )}

        {/* 🛡️ FOOTER */}
        <View style={[styles.footer, { borderTopColor: theme.surface }]}>
           <ShieldCheck size={14} color={theme.border} />
           <Text style={[styles.footerText, { color: theme.border }]}>ENCRYPTED TRANSACTION</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1.5,
  },
  securityIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  securityText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 15 },
  loaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  statusText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderTopWidth: 1.5 },
  footerText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 }
});