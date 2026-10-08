/**
 * First-run welcome: three calm screens about privacy and how the app works, one idea each,
 * with a big "Next" button (no swiping required) and a way to skip.
 */
import { router } from "expo-router";
import { Hand, ShieldCheck, WifiOff, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { loadPrefs, savePrefs } from "@/theme/prefs";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Wordmark } from "@/ui/Logo";
import { Text } from "@/ui/Text";

const PAGES: { icon: LucideIcon; key: string }[] = [
  { icon: ShieldCheck, key: "private" },
  { icon: WifiOff, key: "offline" },
  { icon: Hand, key: "simple" },
];

export default function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const current = PAGES[page]!;
  const last = page === PAGES.length - 1;
  const Icon = current.icon;

  const finish = () => {
    savePrefs({ ...loadPrefs(), onboarded: true });
    router.replace("/");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
      <View style={[styles.top, styles.column]}>
        <Wordmark />
        {last ? null : <Button kind="ghost" label={t("onboarding.skip")} onPress={finish} style={{ paddingHorizontal: space.md }} />}
      </View>

      <View style={[styles.middle, styles.column]} accessible accessibilityLiveRegion="polite">
        <View style={[styles.badge, { backgroundColor: page === 0 ? colors.successSoft : colors.accentSoft }]}>
          <Icon size={56} color={page === 0 ? colors.success : colors.accent} strokeWidth={1.8} />
        </View>
        <Text variant="label" tone="accent" center>
          {t("onboarding.step", { n: page + 1, total: PAGES.length })}
        </Text>
        <Text variant="display" center accessibilityRole="header">
          {t(`onboarding.${current.key}.title`)}
        </Text>
        <Text variant="body" tone="muted" center style={{ maxWidth: 340 }}>
          {t(`onboarding.${current.key}.body`)}
        </Text>
      </View>

      <View style={[styles.column, { gap: space.lg }]}>
        <View style={styles.dots} accessible={false} importantForAccessibility="no-hide-descendants">
          {PAGES.map((p, i) => (
            <View key={p.key} style={[styles.dot, { backgroundColor: i === page ? colors.accent : colors.border, width: i === page ? 24 : 8 }]} />
          ))}
        </View>
        <Button large label={last ? t("onboarding.start") : t("onboarding.next")} onPress={() => (last ? finish() : setPage(page + 1))} />
        {page > 0 ? <Button kind="ghost" label={t("common.back")} onPress={() => setPage(page - 1)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xl, justifyContent: "space-between", alignItems: "center" },
  /** Keeps each part a readable width on tablets. */
  column: { width: "100%", maxWidth: 560 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  middle: { alignItems: "center", gap: space.md, paddingHorizontal: space.sm },
  badge: { width: 112, height: 112, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: space.md },
  dots: { flexDirection: "row", justifyContent: "center", gap: space.sm },
  dot: { height: 8, borderRadius: 4 },
});
