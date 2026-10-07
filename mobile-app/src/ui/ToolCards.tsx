import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { toolName, toolSummary } from "@/tools/text";
import type { Tool } from "@/tools/types";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, TAP } from "@/theme/tokens";
import { Text } from "./Text";
import { ToolIcon } from "./ToolIcon";

function open(tool: Tool) {
  router.push({ pathname: "/tool/[slug]", params: { slug: tool.slug } });
}

/** Big tile for the home screen's most-used tools: icon, name and a plain one-liner. */
export function ToolTile({ tool }: { tool: Tool }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={toolName(tool)}
      accessibilityHint={toolSummary(tool)}
      onPress={() => open(tool)}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.card, borderColor: pressed ? colors.borderStrong : colors.border },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <ToolIcon tool={tool} size={40} />
      <View style={{ gap: 4 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {toolName(tool)}
        </Text>
        <Text variant="small" tone="muted" numberOfLines={3}>
          {toolSummary(tool)}
        </Text>
      </View>
    </Pressable>
  );
}

/** Full-width row for longer lists. The whole row is one big target. */
export function ToolRow({ tool }: { tool: Tool }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={toolName(tool)}
      accessibilityHint={toolSummary(tool)}
      onPress={() => open(tool)}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surface : colors.card, borderColor: colors.border }]}
    >
      <ToolIcon tool={tool} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{toolName(tool)}</Text>
        <Text variant="small" tone="muted">
          {toolSummary(tool)}
        </Text>
      </View>
      <ChevronRight size={22} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md + 2,
    gap: space.sm + 2,
  },
  row: {
    minHeight: TAP + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
  },
});
