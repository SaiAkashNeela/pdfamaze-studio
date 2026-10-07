import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Text } from "./Text";

type Props = {
  children: ReactNode;
  /** Pinned to the bottom, above the home indicator: the screen's main button lives here. */
  footer?: ReactNode;
  /** Show a labelled Back button at the top. */
  back?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
  headerLeft?: ReactNode;
  /** Turn off while a finger is drawing, so the page doesn't move under it. */
  scrollEnabled?: boolean;
  /** Inside the tab bar, which already sits above the home indicator. */
  inTab?: boolean;
};

/** Page frame: safe areas, a plain "‹ Back" button with a word, scrolling content, sticky footer. */
export function Screen({ children, footer, back, onBack, headerRight, headerLeft, scrollEnabled = true, inTab }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = inTab ? 0 : insets.bottom;
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {back || headerRight || headerLeft ? (
        <View style={styles.header}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              onPress={goBack}
              hitSlop={8}
              style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
            >
              <ChevronLeft size={24} color={colors.foreground} strokeWidth={2.2} />
              <Text variant="bodyStrong">{t("common.back")}</Text>
            </Pressable>
          ) : (
            (headerLeft ?? <View />)
          )}
          {headerRight}
        </View>
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={styles.flex}
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[styles.content, { paddingBottom: footer ? space.xl : bottom + space.xxl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
        {footer ? (
          <View style={[styles.footer, { paddingBottom: Math.max(bottom, space.md), backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    minHeight: 48,
    paddingHorizontal: space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingRight: space.md, gap: 2 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, gap: space.sm },
});
