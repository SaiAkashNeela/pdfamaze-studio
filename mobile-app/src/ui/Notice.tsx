import { Info, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Card } from "./Card";
import { Text } from "./Text";

type Kind = "info" | "warning" | "error" | "privacy";

/** A short, calm message with an icon: tips, caveats, errors and the privacy promise. */
export function Notice({ kind = "info", title, body }: { kind?: Kind; title?: string; body: string }) {
  const { colors } = useTheme();
  const config: Record<Kind, { icon: LucideIcon; tone: "surface" | "accent" | "danger" | "success"; color: string }> = {
    info: { icon: Info, tone: "surface", color: colors.mutedForeground },
    warning: { icon: TriangleAlert, tone: "accent", color: colors.accent },
    error: { icon: TriangleAlert, tone: "danger", color: colors.destructive },
    privacy: { icon: ShieldCheck, tone: "success", color: colors.success },
  };
  const { icon: Icon, tone, color } = config[kind];
  return (
    <Card tone={tone} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
      <Icon size={20} color={color} strokeWidth={2} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }} accessible accessibilityRole={kind === "error" ? "alert" : "text"}>
        {title ? <Text variant="bodyStrong">{title}</Text> : null}
        <Text variant="small" tone={title ? "muted" : "default"}>
          {body}
        </Text>
      </View>
    </Card>
  );
}
