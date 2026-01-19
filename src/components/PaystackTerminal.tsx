import React, { useState, useMemo } from 'react';
import { Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { X, Lock, ShieldAlert, CreditCard } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// App Connection
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
 * 🏰 PAYMENT TERMINAL v23.0
 * Purpose: A secure checkout interface using Paystack's hosted gateway.
 * Logic: Monitors navigation states to detect successful payment references.
 */
export const PaystackTerminal = ({ isOpen, onClose, onSuccess, email, amount, metadata }: PaystackProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // 🛡️ SECURITY CONFIGURATION
  // Note: It is best practice to pull this from your .env file
  const publicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_live_xxxxxxxxxxxx"; 
  
  const checkoutUrl = useMemo(() => {
    const params = [
      `key=${publicKey}`,
      `email=${encodeURIComponent(email)}`,
      `amount=${amount * 100}`, // Conversion to Kobo/Cents
      `metadata=${encodeURIComponent(JSON.stringify(metadata))}`,
      `callback_url=https://standard.paystack.co/close`, 
    ].join('&');
    
    return `https://checkout.paystack.com/0.1/?${params}`;
  }, [email, amount, metadata, publicKey]);

  /** 📡 PAYMENT MONITOR */
  const handleNavigationChange = (state: any) => {
    // Detect successful payment reference in the URL
    const hasRef = state.url.includes('trxref') || state.url.includes('reference');
    const isClosed = state.url.includes('close') || state.url.includes('callback');
    
    if ((hasRef || isClosed) && !isVerifying) {
      const refMatch = state.url.match(/[?&](?:reference|trxref)=([^&]+)/);
      const reference = refMatch ? refMatch[1] : null;
      
      if (reference) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsVerifying(true); 
        onSuccess(reference);
      } else if (isClosed) {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        
        {/* 🔒 HEADER */}
        <View style={[styles.header, { borderBottomColor: theme.surface }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.securityIndicator, { backgroundColor: Colors.brand.emerald + '12' }]}>
              <Lock size={12} color={Colors.brand.emerald} strokeWidth={3} />
              <Text style={[styles.securityText, { color: Colors.brand.emerald }]}>SECURE CHECKOUT</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={onClose} 
            style={[styles.closeBtn, { backgroundColor: theme.surface }]} 
            disabled={isVerifying}
          >
            <X color={theme.text} size={22} strokeWidth={3} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          {isVerifying ? (
            <View style={styles.centered}>
              <View style={styles.verifyingHalo}>
                 <ActivityIndicator color={Colors.brand.emerald} size="large" />
              </View>
              <Text style={[styles.statusText, { color: theme.text }]}>VERIFYING TRANSACTION...</Text>
              <Text style={[styles.subStatusText, { color: theme.subtext }]}>Please do not close this screen.</Text>
            </View>
          ) : (
            <WebView 
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleNavigationChange}
              startInLoadingState={true}
              scalesPageToFit={true}
              style={{ flex: 1, backgroundColor: theme.background }}
              renderLoading={() => (
                <View style={[styles.loader, { backgroundColor: theme.background }]}>
                  <CreditCard size={40} color={theme.border} style={{ marginBottom: 20 }} />
                  <ActivityIndicator color={Colors.brand.emerald} size="large" />
                  <Text style={[styles.loaderText, { color: theme.subtext }]}>LOADING SECURE GATEWAY...</Text>
                </View>
              )}
            />
          )}
        </View>

        {/* 🛡️ FOOTER */}
        <View style={[styles.footer, { borderTopColor: theme.surface, paddingBottom: Platform.OS === 'ios' ? 20 : 30 }]}>
           <ShieldAlert size={14} color={theme.subtext} />
           <Text style={[styles.footerText, { color: theme.subtext }]}>SECURE ENCRYPTED PAYMENT</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 18,
    borderBottomWidth: 1.5,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  securityIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  securityText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  loaderText: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  verifyingHalo: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  statusText: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  subStatusText: { fontSize: 11, fontWeight: '700', marginTop: 8, opacity: 0.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 20, borderTopWidth: 1.5 },
  footerText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 }
});