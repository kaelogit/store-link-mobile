import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ShieldCheck, X, Zap, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// 🏛️ Sovereign Components
import { View, Text } from '@/src/components/Themed';
import Colors from '@/src/constants/Colors';
import { useColorScheme } from '@/src/components/useColorScheme';

/**
 * 🏰 INFORMATION MODAL v8.1 (Pure Build)
 * Audited: Plain English & v75.0 Theme Integration.
 */
export default function ModalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* 🏛️ MODAL HEADER */}
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <View style={[styles.headerIndicator, { backgroundColor: theme.border }]} />
        <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
          <X size={24} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim, backgroundColor: 'transparent' }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          
          {/* SECURITY STATUS */}
          <View style={[styles.iconCircle, { backgroundColor: Colors.brand.emerald + '15' }]}>
            <ShieldCheck size={32} color={Colors.brand.emerald} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Information</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            You are currently using StoreLink v75.0. All transactions and profile data are protected by industry-standard encryption.
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* POLICY BLOCKS */}
          <View style={[styles.section, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>STORE POLICIES</Text>
            <DocItem theme={theme} title="Seller Terms" sub="Merchant responsibilities" />
            <DocItem theme={theme} title="Rewards Policy" sub="Coin standards & rules" />
          </View>

          <View style={[styles.section, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>YOUR PRIVACY</Text>
            <DocItem theme={theme} title="Data Privacy" sub="How we protect your details" />
            <DocItem theme={theme} title="Buyer Protection" sub="Marketplace safety rules" />
          </View>

          <View style={[styles.footer, { backgroundColor: 'transparent' }]}>
            <Zap size={14} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
            <Text style={[styles.footerText, { color: theme.border }]}>READY v75.0</Text>
          </View>
        </ScrollView>
      </Animated.View>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const DocItem = ({ title, sub, theme }: { title: string, sub: string, theme: any }) => (
  <TouchableOpacity 
    style={[styles.docItem, { backgroundColor: theme.surface, borderColor: theme.border }]} 
    activeOpacity={0.7}
  >
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Text style={[styles.docTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.docSub, { color: theme.subtext }]}>{sub}</Text>
    </View>
    <ChevronRight size={18} color={theme.border} strokeWidth={3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    height: 60,
  },
  headerIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    position: 'absolute',
    top: 10,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollBody: {
    paddingHorizontal: 25,
    paddingTop: 20,
    alignItems: 'center',
    paddingBottom: 60,
    backgroundColor: 'transparent'
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontWeight: '500',
  },
  divider: {
    height: 1.5,
    width: '100%',
    marginVertical: 35,
  },
  section: {
    width: '100%',
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 15,
    textTransform: 'uppercase'
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  docSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  }
});