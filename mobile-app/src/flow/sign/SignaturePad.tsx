/**
 * Finger-drawn signature, captured as vector strokes so it stays crisp at any size in the PDF.
 */
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Line, Path } from "react-native-svg";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Text } from "@/ui/Text";
import { PAD_STROKE, strokeToPath, type Point } from "./ink";

type Props = {
  color: string;
  strokes: Point[][];
  onChange: (strokes: Point[][]) => void;
  /** Lets the parent stop page scrolling while a finger is drawing. */
  onDrawing: (drawing: boolean) => void;
};

export function SignaturePad({ color, strokes, onChange, onDrawing }: Props) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [live, setLive] = useState<Point[]>([]);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      onDrawing(true);
      setLive([{ x: e.x, y: e.y }]);
    })
    .onUpdate((e) =>
      setLive((points) => {
        const prev = points[points.length - 1];
        return prev && Math.abs(prev.x - e.x) + Math.abs(prev.y - e.y) < 1.5 ? points : [...points, { x: e.x, y: e.y }];
      }),
    )
    .onFinalize(() => {
      onDrawing(false);
      if (live.length) onChange([...strokes, live]);
      setLive([]);
    });

  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  const empty = !strokes.length && !live.length;
  const paths = strokes.map(strokeToPath);

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityLabel={t("sign.padLabel")}
        style={[styles.pad, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong }]}
      >
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          <Line x1={24} x2={size.width - 24} y1={size.height * 0.72} y2={size.height * 0.72} stroke={colors.border} strokeWidth={1.5} strokeDasharray="6 6" />
          {paths.map((d) => (
            <Path key={d} d={d} stroke={color} strokeWidth={PAD_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          {live.length ? (
            <Path d={strokeToPath(live)} stroke={color} strokeWidth={PAD_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ) : null}
        </Svg>
        {empty ? (
          <View pointerEvents="none" style={styles.placeholder}>
            <Text variant="title" tone="muted" style={{ opacity: 0.5 }}>
              ✕ {t("sign.here")}
            </Text>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pad: { height: 220, borderWidth: 2, borderRadius: radius.lg, overflow: "hidden" },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: "flex-start", justifyContent: "flex-end", padding: 24, paddingBottom: 72 },
});
