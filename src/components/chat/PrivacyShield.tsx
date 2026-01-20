import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, ShieldAlert, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';

interface PrivacyShieldProps {
  onUnlock: () => void;
  isExpired?: boolean;
}

/**
 * 🏰 PRIVACY SHIELD v1.1
 * Purpose: Covers private photos until the user is ready to view them.
 * Logic: A simple tap-to-reveal interaction with a clear "View Once" warning.
 * Safety: Prevents the image from being seen accidentally in public.
 */
export const PrivacyShield = ({ onUnlock, isExpired }: PrivacyShieldProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];

  const handlePress = () => {
    if (isExpired) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUnlock();
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={handlePress}
      style={[
        styles.container, 
        { backgroundColor: isExpired ? theme.surface : '#18181B' } // Zinc 900 for active privacy
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconHalo, { backgroundColor: isExpired ? theme.border : 'rgba(255,255,255,0.1)' }]}>
          {isExpired ? (
            <ShieldAlert size={28} color={theme.subtext} />
          ) : (
            <Lock size={28} color="white" />
          )}
        </View>

        <Text style={[styles.title, { color: isExpired ? theme.text : 'white' }]}>
          {isExpired ? 'PHOTO EXPIRED' : 'VIEW ONCE'}
        </Text>
        
        <Text style={[styles.subtext, { color: isExpired ? theme.subtext : 'rgba(255,255,255,0.6)' }]}>
          {isExpired 
            ? 'This message has been deleted.' 
            : 'Tap to reveal. Disappears after viewing.'}
        </Text>

        {!isExpired && (
          <View style={styles.revealBtn}>
            <Eye size={14} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.revealText}>TAP TO UNLOCK</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%', // Fills the parent Image bubble container
    minHeight: 200, // Fallback height
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent'
  },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  revealText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5
  }
});