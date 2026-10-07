import { View } from "react-native";
import type { Tool } from "@/tools/types";
import { space } from "@/theme/tokens";
import { Text } from "@/ui/Text";
import { toolName, toolSummary } from "@/tools/text";
import { ToolIcon } from "@/ui/ToolIcon";

export function ToolHeader({ tool }: { tool: Tool }) {
  return (
    <View style={{ gap: space.sm + 2, marginTop: space.xs }}>
      <ToolIcon tool={tool} size={48} />
      <Text variant="display" accessibilityRole="header">
        {toolName(tool)}
      </Text>
      <Text variant="body" tone="muted">
        {toolSummary(tool)}
      </Text>
    </View>
  );
}
