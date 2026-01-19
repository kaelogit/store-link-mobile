import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { View, Text } from './Themed';
import { Clock, Zap, AlertCircle } from 'lucide-react-native';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

interface Props {
  expiryDate: string | null;
  plan: 'standard' | 'diamond' | string;
}

/**
 * 🏰 SUBSCRIPTION COUNTDOWN v1.0
 * Logic: Real-time temporal calculation (DD:HH:MM:SS).
 * Visual: Dynamic color shifting based on urgency.
 */
export const SubscriptionCountdown = ({ expiryDate, plan }: Props) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, mins: number, secs: number } | null>(null);

  useEffect(() => {
    if (!expiryDate) return;

    const calculate = () => {
      const now = new Date().getTime();
      const target = new Date(expiryDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return false;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000),
      });
      return true;
    };

    const hasTime = calculate();
    if (!hasTime) return;

    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiryDate]);

  if (!timeLeft) return null;

  const isDiamond = plan === 'diamond';
  const isUrgent = timeLeft.days < 2; // Turn red if less than 48 hours

  return (
    <View style={[
      styles.container, 
      { backgroundColor: isUrgent ? '#FEF2F2' : (isDiamond ? 'rgba(139, 92, 246, 0.1)' : theme.surface) }
    ]}>
      {isUrgent ? (
        <AlertCircle size={12} color="#EF4444" strokeWidth={3} />
      ) : (
        <Clock size={12} color={isDiamond ? '#8B5CF6' : Colors.brand.emerald} strokeWidth={3} />
      )}
      <Text style={[
        styles.timerText, 
        { color: isUrgent ? '#EF4444' : (isDiamond ? '#8B5CF6' : theme.text) }
      ]}>
        {timeLeft.days > 0 && `${timeLeft.days}D `}
        {timeLeft.hours.toString().padStart(2, '0')}:
        {timeLeft.mins.toString().padStart(2, '0')}:
        {timeLeft.secs.toString().padStart(2, '0')}
        <Text style={styles.suffix}> REMAINING</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  timerText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'], // Prevents jumping text
  },
  suffix: {
    fontSize: 8,
    fontWeight: '700',
    opacity: 0.6,
  }
});