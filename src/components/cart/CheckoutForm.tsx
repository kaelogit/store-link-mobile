import React from 'react';
import { StyleSheet, TextInput, Platform } from 'react-native';
import { MapPin, User, Phone, ShieldCheck, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';
import { useUserStore } from '../../store/useUserStore';

interface CheckoutFormProps {
  address: string;
  setAddress: (val: string) => void;
}

/**
 * 🏰 CHECKOUT FORM v79.0
 * Purpose: A secure input module for capturing delivery and contact details.
 * Logic: Displays verified account details alongside a dedicated address input.
 * Visual: High-fidelity layout with premium border synchronization for Diamond users.
 */
export const CheckoutForm = ({ address, setAddress }: CheckoutFormProps) => {
  const { profile } = useUserStore();
  const theme = Colors[useColorScheme() ?? 'light'];

  const isDiamond = profile?.subscription_plan === 'diamond';

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.surface, borderColor: theme.border },
      isDiamond && styles.diamondBorder
    ]}>
      
      {/* 🛡️ DELIVERY HEADER */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={[styles.title, { color: theme.text }]}>DELIVERY INFORMATION</Text>
          <View style={[styles.secureBadge, { backgroundColor: `${Colors.brand.emerald}15` }]}>
            <ShieldCheck size={10} color={Colors.brand.emerald} strokeWidth={3} />
            <Text style={[styles.secureText, { color: Colors.brand.emerald }]}>SECURE</Text>
          </View>
        </View>
      </View>

      {/* ⚓ CONTACT DETAILS: Verified user information */}
      <View style={styles.registryRow}>
        <View style={[styles.anchorNode, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <User size={14} color={theme.subtext} strokeWidth={2.5} />
          <Text style={[styles.anchorValue, { color: theme.text }]} numberOfLines={1}>
            {profile?.full_name?.toUpperCase() || 'NAME NOT SET'}
          </Text>
        </View>
        <View style={[styles.anchorNode, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Phone size={14} color={theme.subtext} strokeWidth={2.5} />
          <Text style={[styles.anchorValue, { color: theme.text }]}>
            {profile?.whatsapp_number || 'NO CONTACT SET'}
          </Text>
        </View>
      </View>

      {/* 📍 ADDRESS INPUT */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.subtext }]}>SHIPPING ADDRESS</Text>
        <AlertCircle size={10} color={Colors.brand.emerald} />
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <MapPin size={20} color={theme.text} strokeWidth={2.5} style={styles.inputIcon} />
        <TextInput
          placeholder="Building No, Street Name, City, State..."
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text }]}
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          selectionColor={Colors.brand.emerald}
          autoCapitalize="words"
          textAlignVertical="top" // Android Fix
          onFocus={() => Haptics.selectionAsync()}
        />
      </View>
      
      <View style={styles.footerRow}>
        <Text style={[styles.helperText, { color: theme.subtext }]}>
          Precision: Providing a detailed address helps ensure faster delivery.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 32,
    marginBottom: 25,
    borderWidth: 1.5,
  },
  diamondBorder: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  header: { 
    marginBottom: 20,
    backgroundColor: 'transparent'
  },
  titleGroup: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  title: { 
    fontSize: 11, 
    fontWeight: '900', 
    letterSpacing: 2 
  },
  secureBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10 
  },
  secureText: { 
    fontSize: 8, 
    fontWeight: '900', 
    letterSpacing: 1
  },
  registryRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 25,
    backgroundColor: 'transparent'
  },
  anchorNode: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    padding: 14, 
    borderRadius: 16,
    borderWidth: 1.2,
  },
  anchorValue: { 
    fontSize: 10, 
    fontWeight: '800', 
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginLeft: 4,
    backgroundColor: 'transparent'
  },
  label: { 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1.5, 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    borderRadius: 24, 
    gap: 15, 
    borderWidth: 1.5, 
    minHeight: 100
  },
  inputIcon: {
    marginTop: 2
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    fontWeight: '600', 
    paddingTop: 0,
    lineHeight: 22,
  },
  footerRow: {
    marginTop: 15,
    marginLeft: 4,
    backgroundColor: 'transparent'
  },
  helperText: { 
    fontSize: 10, 
    fontWeight: '700', 
    lineHeight: 16, 
    opacity: 0.6
  }
});