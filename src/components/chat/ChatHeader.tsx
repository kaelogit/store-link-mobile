import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MoreVertical, ShieldCheck, Gem } from 'lucide-react-native';
import { Image } from 'expo-image'; // 🛠️ FIXED: High-fidelity image handling

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';
import { Profile } from '../../types'; // 🛠️ FIXED: Standardized Types

interface ChatHeaderProps {
  seller: Partial<Profile>; // 🛠️ FIXED: Loosened type to match database return
}

/**
 * 🏰 CHAT HEADER v106.0
 * Purpose: Displays the identity and status of the person you are messaging.
 * Logic: Pulls real-time "Open/Closed" status and Diamond Prestige.
 * Visual: High-fidelity layout with the Violet Halo for Diamond members.
 */
export const ChatHeader = ({ seller }: ChatHeaderProps) => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  // 💎 PRESTIGE LOGIC
  const isDiamond = seller.subscription_plan === 'diamond';
  const displayName = seller.display_name || 'STORE MEMBER';
  const logoUrl = seller.logo_url || 'https://via.placeholder.com/100';

  return (
    <View style={[styles.container, { borderBottomColor: theme.surface, backgroundColor: theme.background }]}>
      <View style={styles.leftSection}>
        {/* BACK BUTTON */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* IDENTITY DOCK */}
        <TouchableOpacity 
          style={styles.identityGroup}
          activeOpacity={0.7}
          onPress={() => router.push(`/profile/${seller.id}` as any)}
        >
          <View style={[
            styles.logoFrame, 
            isDiamond && styles.diamondHalo
          ]}>
            <Image 
              source={logoUrl} 
              style={styles.logo} 
              contentFit="cover"
              transition={200}
            />
            {/* ONLINE STATUS PULSE */}
            <View style={[
              styles.statusDot, 
              { 
                backgroundColor: seller.is_store_open ? Colors.brand.emerald : theme.subtext,
                borderColor: theme.background
              }
            ]} />
          </View>

          <View style={styles.textGroup}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {displayName.toUpperCase()}
              </Text>
              {isDiamond && <Gem size={11} color="#8B5CF6" fill="#8B5CF6" />}
            </View>
            <View style={styles.statusRow}>
              <ShieldCheck size={10} color={seller.is_store_open ? Colors.brand.emerald : theme.subtext} />
              <Text style={[styles.statusText, { color: theme.subtext }]}>
                {seller.is_store_open ? 'SECURE HANDSHAKE OPEN' : 'MEMBER AWAY'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* OPTIONS */}
      <TouchableOpacity style={styles.optionBtn}>
        <MoreVertical color={theme.subtext} size={20} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 90, // Increased for a more premium "Wired" feel
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingTop: 30, // Safety padding for Notch
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
    padding: 2, // Spacing for Diamond Halo
  },
  diamondHalo: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  textGroup: {
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  optionBtn: {
    padding: 10,
  },
});