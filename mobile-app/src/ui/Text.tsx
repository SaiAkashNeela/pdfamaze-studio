import { Text as RNText, type TextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { MAX_FONT_SCALE, type } from "@/theme/tokens";

type Variant = keyof typeof type;
type Tone = "default" | "muted" | "accent" | "danger" | "success" | "inverse";

export type AppTextProps = TextProps & { variant?: Variant; tone?: Tone; center?: boolean };

/** All app text. Follows the phone's text-size setting, capped so layouts never break. */
export function Text({ variant = "body", tone = "default", center, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    accent: colors.accent,
    danger: colors.destructive,
    success: colors.success,
    inverse: colors.primaryForeground,
  }[tone];
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[type[variant], { color }, variant === "label" && { textTransform: "uppercase" }, center && { textAlign: "center" }, style]}
      {...rest}
    />
  );
}
