import type { ReactNode } from "react";
import { View } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Text } from "@/ui/Text";

/** Numbered step, so every tool reads as the same simple recipe: 1 → 2 → 3. */
export function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.md + 2, marginTop: space.xl }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Step ${n}: ${title}`}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: done ? colors.success : colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {done ? (
            <Check size={17} color={colors.primaryForeground} strokeWidth={3} />
          ) : (
            <Text variant="bodyStrong" tone="inverse">
              {n}
            </Text>
          )}
        </View>
        <Text variant="heading" style={{ flex: 1 }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
