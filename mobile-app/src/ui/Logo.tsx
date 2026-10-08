import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/**
 * PDFamaze mark: a sheet of paper whose lower half has been re-cut into three bands,
 * one in the accent colour. Same artwork as the web logo.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  const { colors } = useTheme();
  const ink = colors.foreground;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="square">
      <Path d="M4.5 2.5h9.2L19.5 8v13.5h-15z" stroke={ink} strokeWidth={1.6} strokeLinejoin="miter" />
      <Path d="M13.4 2.8V8h5.4" stroke={ink} strokeWidth={1.6} />
      <Path d="M7.6 12.4h8.8" stroke={ink} strokeWidth={1.6} opacity={0.5} />
      <Path d="M7.6 15.5h8.8" stroke={colors.accent} strokeWidth={1.6} />
      <Path d="M7.6 18.6h5.2" stroke={ink} strokeWidth={1.6} opacity={0.5} />
    </Svg>
  );
}

export function Wordmark() {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="PDFamaze" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <LogoMark />
      <Text variant="heading" style={{ letterSpacing: -0.4 }}>
        PDF
        <Text variant="heading" tone="muted" style={{ fontFamily: "IBMPlexSans_400Regular", letterSpacing: -0.4 }}>
          amaze
        </Text>
      </Text>
    </View>
  );
}
