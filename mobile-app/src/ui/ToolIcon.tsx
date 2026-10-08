import { View } from "react-native";
import { renderToolIcon } from "@/tools/icons";
import type { Tool } from "@/tools/types";
import { useTheme } from "@/theme/ThemeProvider";

/** Coloured square with the tool's icon, tinted by its category like on the web. */
export function ToolIcon({ tool, size = 48 }: { tool: Tool; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: colors.tags[tool.tag],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {renderToolIcon(tool.slug, { size: size * 0.5, color: colors.tagIconForeground, strokeWidth: 2 })}
    </View>
  );
}
