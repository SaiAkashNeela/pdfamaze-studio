import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, TAP } from "@/theme/tokens";
import { Text } from "./Text";

type Kind = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  kind?: Kind;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  /** Spoken by screen readers instead of the label, when the label alone isn't clear. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** Extra-tall main call to action. */
  large?: boolean;
};

/** Big, plainly labelled button. Icons always sit beside words, never alone. */
export function Button({ label, onPress, kind = "primary", icon: Icon, disabled, loading, accessibilityLabel, accessibilityHint, style, large }: Props) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, fg: colors.accentForeground, border: colors.accent },
    secondary: { bg: colors.card, fg: colors.foreground, border: colors.borderStrong },
    ghost: { bg: "transparent", fg: colors.foreground, border: "transparent" },
    danger: { bg: colors.destructiveSoft, fg: colors.destructive, border: colors.destructiveSoft },
  }[kind];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && { opacity: 0.45 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={palette.fg} /> : Icon ? <Icon size={large ? 22 : 20} color={palette.fg} strokeWidth={2} /> : null}
        <Text variant="button" style={{ color: palette.fg, flexShrink: 1 }} center numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    justifyContent: "center",
  },
  large: { minHeight: 56 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm + 2 },
});
