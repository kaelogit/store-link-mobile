import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  Gem,
  Play,
  PlusSquare,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react-native";
import React, { memo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity
} from "react-native";

// App Components
import Colors from "../constants/Colors";
import { Text, View } from "./Themed";
import { useColorScheme } from "./useColorScheme";

const { width, height } = Dimensions.get("window");

interface GuideProps {
  isVisible: boolean;
  userRole: "buyer" | "seller" | "both";
  onComplete: () => void;
}

/**
 * 🏰 MARKETPLACE GUIDE v2.1
 * Purpose: Helping new users understand the main features of the app.
 * Visual: High-fidelity styling with clear progress tracking.
 */
export const EmpireGuide = memo(
  ({ isVisible, userRole, onComplete }: GuideProps) => {
    const [step, setStep] = useState(0);
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? "light"];

    const steps = [
      {
        title: "THE SHOP",
        description:
          "Find great products near you. We show you the best items based on what you like and where you are.",
        icon: (
          <ShoppingBag
            color={Colors.brand.emerald}
            size={42}
            strokeWidth={2.5}
          />
        ),
        accent: Colors.brand.emerald,
      },
      {
        title: "VIDEO REELS",
        description:
          "See products in action. Watch short videos to see how items look and buy them directly from the video.",
        icon: (
          <Play color={Colors.brand.gold} size={42} fill={Colors.brand.gold} />
        ),
        accent: Colors.brand.gold,
      },
      ...(userRole !== "buyer"
        ? [
            {
              title: "SELLER TOOLS",
              description:
                "Everything you need to sell. Upload your products, see what customers want, and grow your brand.",
              icon: (
                <PlusSquare color={theme.text} size={42} strokeWidth={2.5} />
              ),
              accent: theme.text,
            },
          ]
        : []),
      {
        title: "STORE COINS",
        description:
          "Get rewards for shopping. Get 5% back on what you spend, track your rewards, and unlock special badges.",
        icon: <Gem color="#8B5CF6" size={42} fill="#8B5CF6" />,
        accent: "#8B5CF6",
      },
    ];

    const handleNext = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        onComplete();
      }
    };

    if (!isVisible) return null;

    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          {/* 🚪 EXIT */}
          <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
            <Text style={styles.skipText}>SKIP GUIDE</Text>
            <X color="rgba(255,255,255,0.4)" size={14} strokeWidth={3} />
          </TouchableOpacity>

          {/* 📋 GUIDE BOX */}
          <View
            style={[
              styles.tooltipContainer,
              { backgroundColor: theme.background },
            ]}
          >
            <View
              style={[
                styles.iconHalo,
                { backgroundColor: steps[step].accent + "10" },
              ]}
            >
              {steps[step].icon}
            </View>

            <View style={styles.textStack}>
              <View style={styles.titleRow}>
                <Sparkles
                  size={14}
                  color={steps[step].accent}
                  fill={steps[step].accent}
                />
                <Text style={[styles.stepTitle, { color: theme.text }]}>
                  {steps[step].title}
                </Text>
              </View>
              <Text style={[styles.stepDesc, { color: theme.subtext }]}>
                {steps[step].description}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.nextBtn, { backgroundColor: theme.text }]}
              onPress={handleNext}
            >
              <Text style={[styles.nextText, { color: theme.background }]}>
                {step === steps.length - 1
                  ? "START SHOPPING"
                  : "CONTINUE"}
              </Text>
              <ArrowRight color={theme.background} size={20} strokeWidth={3} />
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <ShieldCheck size={12} color={theme.border} strokeWidth={2.5} />
              <Text style={[styles.securityText, { color: theme.border }]}>
                SECURE AND VERIFIED
              </Text>
            </View>
          </View>

          {/* 📈 PROGRESS DOTS */}
          <View style={styles.indicatorRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      step === i ? "white" : "rgba(255,255,255,0.2)",
                  },
                  step === i && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 70 : 50,
    right: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  skipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  tooltipContainer: {
    borderRadius: 45,
    padding: 40,
    width: "100%",
    alignItems: "center",
    elevation: 20,
  },
  iconHalo: {
    width: 100,
    height: 100,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  textStack: { alignItems: "center", gap: 15 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -1 },
  stepDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "600",
    paddingHorizontal: 5,
    opacity: 0.8,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 72,
    borderRadius: 24,
    marginTop: 40,
    width: "100%",
    justifyContent: "center",
  },
  nextText: { fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 30,
    opacity: 0.5,
  },
  securityText: { fontSize: 8, fontWeight: "900", letterSpacing: 1.5 },
  indicatorRow: { flexDirection: "row", gap: 10, marginTop: 45 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeDot: { width: 30 },
});