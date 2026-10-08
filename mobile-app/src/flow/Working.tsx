import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";

/** Full-screen "working" state with a big progress bar and plain status words. */
export function Working({ status, ratio, onLeave }: { status: string; ratio?: number; onLeave?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [width] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(width, { toValue: Math.max(0.04, Math.min(1, ratio ?? 0.08)), duration: 250, useNativeDriver: false }).start();
  }, [ratio, width]);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={`${t("tool.working")} ${status}`}
    >
      <ActivityIndicator size="large" color={colors.accent} />
      <Text variant="title" center>
        {t("tool.working")}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: colors.accent, width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
        />
      </View>
      <Text variant="body" tone="muted" center>
        {status}
      </Text>
      <Text variant="small" tone="muted" center style={{ marginTop: space.lg, maxWidth: 320 }}>
        {t("tool.workingHint")}
      </Text>
      {onLeave ? <Button kind="secondary" label={t("tool.leave")} onPress={onLeave} style={{ alignSelf: "stretch", marginTop: space.md }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: space.lg, paddingHorizontal: space.xxl },
  track: { alignSelf: "stretch", height: 14, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
