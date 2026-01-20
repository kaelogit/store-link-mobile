import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, TouchableOpacity, Animated, ScrollView, View as RNView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ShieldCheck, X, ChevronRight, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Components
import { View, Text } from '../src/components/Themed';
import Colors from '../src/constants/Colors';
import { useColorScheme } from '../src/components/useColorScheme';

/**
 * ℹ️ INFORMATION SCREEN v8.3
 * Purpose: This screen shows app version info, safety rules, and shop policies.
 * Language: Simple English for clear communication.
 */
export default function ModalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smoothly fade in the content
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* DRAG INDICATOR & CLOSE BUTTON */}
      <RNView style={styles.header}>
        <RNView style={[styles.headerIndicator, { backgroundColor: theme.border }]} />
        <TouchableOpacity 
          onPress={handleClose} 
          style={[styles.closeBtn, { backgroundColor: theme.surface }]}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <X size={22} color={theme.text} strokeWidth={3} />
        </TouchableOpacity>
      </RNView>

      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollBody}
        >
          
          {/* APP LOGO / STATUS */}
          <RNView style={[styles.iconCircle, { backgroundColor: `${Colors.brand.emerald}15` }]}>
            <ShieldCheck size={36} color={Colors.brand.emerald} strokeWidth={2.5} />
          </RNView>

          <Text style={[styles.title, { color: theme.text }]}>App Information</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            You are using StoreLink version 75.0. Your account and payments are protected by high-level security.
          </Text>

          <RNView style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* POLICY SECTION */}
          <RNView style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>FOR SELLERS</Text>
            <DocItem theme={theme} title="Selling Rules" sub="What we expect from shop owners" />
            <DocItem theme={theme} title="Coins & Rewards" sub="How our discount system works" />
          </RNView>

          {/* PRIVACY SECTION */}
          <RNView style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>YOUR SAFETY</Text>
            <DocItem theme={theme} title="Privacy Policy" sub="How we handle your data" />
            <DocItem theme={theme} title="Buyer Protection" sub="Rules for safe shopping" />
          </RNView>

          {/* FOOTER */}
          <RNView style={styles.footer}>
            <Info size={14} color={theme.border} />
            <Text style={[styles.footerText, { color: theme.border }]}>STORELINK v75.0 (2026)</Text>
          </RNView>
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
    onPress={() => Haptics.selectionAsync()}
  >
    <RNView style={styles.docTextContainer}>
      <Text style={[styles.docTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.docSub, { color: theme.subtext }]}>{sub}</Text>
    </RNView>
    <ChevronRight size={18} color={theme.border} strokeWidth={3} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    height: 60,
  },
  headerIndicator: {
    width: 36,
    height: 5,
    borderRadius: 10,
    position: 'absolute',
    top: 12,
    opacity: 0.3
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 15,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  contentWrapper: { flex: 1 },
  scrollBody: {
    paddingHorizontal: 25,
    paddingTop: 10,
    alignItems: 'center',
    paddingBottom: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22, fontWeight: '600', opacity: 0.7 },
  
  divider: { height: 1.5, width: '100%', marginVertical: 35, opacity: 0.5 },
  
  section: { width: '100%', marginBottom: 30 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 15 },
  
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  docTextContainer: { flex: 1, backgroundColor: 'transparent' },
  docTitle: { fontSize: 15, fontWeight: '800' },
  docSub: { fontSize: 12, fontWeight: '600', marginTop: 3, opacity: 0.6 },
  
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, opacity: 0.5 },
  footerText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});