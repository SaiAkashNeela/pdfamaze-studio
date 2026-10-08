/**
 * Responsive layout for phones and tablets. The app is designed phone-first; on wider screens
 * (iPad, Android tablets, landscape, Split View) content gets a comfortable reading width and
 * grids gain columns, instead of stretching one column edge to edge.
 */
import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { space } from "@/theme/tokens";

/** Reading width for forms and tool screens. */
export const READING_WIDTH = 760;
/** Wider limit for browsing screens with grids, like the home screen. */
export const BROWSE_WIDTH = 1180;

export function useLayout() {
  const { width } = useWindowDimensions();
  return {
    width,
    /** Tablet-ish width: two columns of rows fit comfortably. */
    wide: width >= 700,
    /** Large tablet or landscape: room for four tiles across. */
    extraWide: width >= 1000,
  };
}

/** Lays items out in rows of `columns`, keeping every tile the same width (the last row too). */
export function Grid<T>({
  items,
  columns,
  keyOf,
  render,
  gap = space.md,
}: {
  items: T[];
  columns: number;
  keyOf: (item: T) => string;
  render: (item: T) => ReactNode;
  gap?: number;
}) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row) => (
        <View key={row.map(keyOf).join("|")} style={{ flexDirection: "row", gap }}>
          {row.map((item) => (
            <View key={keyOf(item)} style={{ flex: 1 }}>
              {render(item)}
            </View>
          ))}
          {/* One spacer fills the missing cells, so the last row's tiles keep the same width. */}
          {row.length < columns ? <View style={{ flex: columns - row.length, marginLeft: gap * (columns - row.length - 1) }} /> : null}
        </View>
      ))}
    </View>
  );
}
