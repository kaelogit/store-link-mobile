import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { MapPin, User, Phone, ShieldCheck } from 'lucide-react-native';

// 🏛️ Sovereign Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';
import { useUserStore } from '../../store/useUserStore';

interface CheckoutFormProps {
  address: string;
  setAddress: (val: string) => void;
}

/**
 * 🏰 CHECKOUT FORM v76.1 (Pure Build)
 * Audited: Plain English & Section I Profile Verification.
 */
export const CheckoutForm = ({ address, setAddress }: CheckoutFormProps) => {
  const { profile } = useUserStore();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.title, { color: theme.text }]}>DELIVERY INFO</Text>
        <View style={styles.verifiedBadge}>
          <ShieldCheck size={10} color={Colors.brand.emerald} strokeWidth={3} />
          <Text style={styles.verifiedText}>SECURE CHECKOUT</Text>
        </View>
      </View>

      {/* 👤 READ-ONLY ACCOUNT INFO */}
      <View style={[styles.identityRow, { backgroundColor: 'transparent' }]}>
        <View style={[styles.identityNode, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <User size={14} color={theme.subtext} />
          <Text style={[styles.identityValue, { color: theme.text }]}>
            {profile?.full_name?.toUpperCase() || 'NO NAME SET'}
          </Text>
        </View>
        <View style={[styles.identityNode, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Phone size={14} color={theme.subtext} />
          <Text style={[styles.identityValue, { color: theme.text }]}>
            {profile?.whatsapp_number || 'NO PHONE SET'}
          </Text>
        </View>
      </View>

      <Text style={[styles.label, { color: theme.subtext }]}>DELIVERY ADDRESS *</Text>
      <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <MapPin size={18} color={theme.text} />
        <TextInput
          placeholder="House No, Street Name, City, State"
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text }]}
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={2}
        />
      </View>
      
      <Text style={[styles.helperText, { color: theme.subtext }]}>
        Please provide a detailed address to ensure your order reaches you without delay.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 22,
    borderRadius: 32,
    marginBottom: 25,
    borderWidth: 1.5,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15 
  },
  title: { 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1.5 
  },
  verifiedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#ECFDF5', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  verifiedText: { 
    fontSize: 8, 
    fontWeight: '900', 
    color: '#059669' 
  },
  identityRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 20 
  },
  identityNode: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    padding: 12, 
    borderRadius: 14,
    borderWidth: 1,
  },
  identityValue: { 
    fontSize: 9, 
    fontWeight: '800', 
  },
  label: { 
    fontSize: 9, 
    fontWeight: '900', 
    letterSpacing: 1, 
    marginBottom: 10, 
    marginLeft: 4 
  },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    paddingHorizontal: 18, 
    paddingVertical: 15, 
    borderRadius: 20, 
    gap: 12, 
    borderWidth: 1.5, 
    minHeight: 80
  },
  input: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: '600', 
    textAlignVertical: 'top',
    paddingTop: 0
  },
  helperText: { 
    fontSize: 10, 
    fontWeight: '600', 
    marginTop: 12, 
    lineHeight: 16,
    marginLeft: 4
  }
});