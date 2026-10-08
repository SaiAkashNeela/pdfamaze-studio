/**
 * "Privacy First" pill for the home screen: a soft green badge with a light sweep that glides
 * across it every few seconds. The sweep is skipped when the phone asks for reduced motion.
 */
import { ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Text } from "./Text";

const SHINE = 46;

export function PrivacyBadge({ onPress }: { onPress: () => void }) {
  const { colors, scheme } = useTheme();
  const [sweep] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.delay(2600),
          Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [sweep]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-SHINE * 1.5, width + SHINE] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("privacy.badge")}
      accessibilityHint={t("privacy.badgeHint")}
      onPress={onPress}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.pill, { backgroundColor: colors.successSoft, borderColor: colors.success }, pressed && { opacity: 0.8 }]}
    >
      <ShieldCheck size={18} color={colors.success} strokeWidth={2.2} />
      <Text variant="bodyStrong" style={{ color: colors.success, fontSize: 14 }}>
        {t("privacy.badge")}
      </Text>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.shine,
            { backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.75)", transform: [{ translateX }, { skewX: "-20deg" }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: "hidden",
  },
  shine: { position: "absolute", top: -4, bottom: -4, width: SHINE },
});
