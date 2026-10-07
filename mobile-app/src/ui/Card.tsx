import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

/** White sheet on the paper background, with a quiet border instead of a shadow. */
export function Card({ children, style, tone = "card" }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: "card" | "surface" | "accent" | "danger" | "success" }) {
  const { colors } = useTheme();
  const bg = { card: colors.card, surface: colors.surface, accent: colors.accentSoft, danger: colors.destructiveSoft, success: colors.successSoft }[tone];
  const border = tone === "card" ? colors.border : tone === "surface" ? colors.border : "transparent";
  return <View style={[{ backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: radius.lg, padding: space.md + 2 }, style]}>{children}</View>;
}
