import React from 'react';
import { StyleSheet } from 'react-native';
import { Zap, Clock } from 'lucide-react-native';

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';

interface StatusBannerProps {
  isOnline?: boolean | null;
}

/**
 * 🏰 STATUS BANNER v1.1
 * Purpose: Displays live availability to buyers while keeping the store open 24/7.
 * Visual: High-fidelity status indicators with clean, jargon-free labels.
 */
export const StatusBanner = ({ isOnline }: StatusBannerProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const active = !!isOnline; // 🛡️ Strict boolean coercion

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.leftSection}>
        <View style={[styles.statusDot, { backgroundColor: active ? Colors.brand.emerald : theme.subtext }]} />
        <View>
          <Text style={[styles.statusTitle, { color: theme.text }]}>
            {active ? 'ACTIVE NOW' : 'CURRENTLY AWAY'}
          </Text>
          <Text style={[styles.statusSub, { color: theme.subtext }]}>
            {active ? 'Ready to ship & chat' : 'Will reply as soon as possible'}
          </Text>
        </View>
      </View>

      <View style={[styles.badge, { backgroundColor: active ? `${Colors.brand.emerald}15` : theme.background }]}>
        {active ? (
          <Zap size={14} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
        ) : (
          <Clock size={14} color={theme.subtext} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginHorizontal: 20,
    marginTop: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 1, // Optical adjustment
  },
  statusTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.8,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});