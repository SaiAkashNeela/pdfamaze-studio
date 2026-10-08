/**
 * Personal stats, read from the on-device SQLite file. Headline numbers are plain stat tiles;
 * "most used" and "last 7 days" are single-series bars in one accent hue, each bar carrying its
 * number as text so nothing depends on colour alone.
 */
import { useFocusEffect } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { formatBytes } from "@/engine/core";
import { t } from "@/i18n";
import { clearStats, readStats, type StatsSummary } from "@/stats/db";
import { getTool } from "@/tools/registry";
import { toolName } from "@/tools/text";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { useLayout } from "@/ui/layout";
import { Text } from "@/ui/Text";
import { ToolIcon } from "@/ui/ToolIcon";

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, gap: 2 }}>
      <Text variant="display" style={{ fontVariant: ["tabular-nums"] }} accessibilityLabel={`${value} ${label}`}>
        {value}
      </Text>
      <Text variant="small" tone="muted">
        {label}
      </Text>
    </Card>
  );
}

function TopTools({ items }: { items: StatsSummary["topTools"] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <View style={{ gap: space.md }}>
      {items.map((item) => {
        const tool = getTool(item.slug);
        if (!tool) return null;
        const name = toolName(tool);
        return (
          <View
            key={item.slug}
            style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
            accessible
            accessibilityLabel={t("stats.toolUses", { name, count: item.count })}
          >
            <ToolIcon tool={tool} size={34} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {name}
                </Text>
                <Text variant="bodyStrong" style={{ fontVariant: ["tabular-nums"] }}>
                  {item.count}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <View style={[styles.bar, { width: `${(item.count / max) * 100}%`, backgroundColor: colors.accent }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Tallest bar in the 7-day chart, leaving room for the count label above it. */
const BAR_MAX = 84;

function Week({ days }: { days: StatsSummary["week"] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...days.map((d) => d.count));
  const label = (day: number) => new Date(day).toLocaleDateString(undefined, { weekday: "short" });
  return (
    <View>
      <View style={[styles.columns, { borderBottomColor: colors.borderStrong }]}>
        {days.map((d) => (
          <View
            key={d.day}
            style={styles.column}
            accessible
            accessibilityLabel={t("stats.dayUses", { day: new Date(d.day).toLocaleDateString(undefined, { weekday: "long" }), count: d.count })}
          >
            <Text variant="small" tone={d.count ? "default" : "muted"} style={{ fontVariant: ["tabular-nums"] }}>
              {d.count || ""}
            </Text>
            <View style={[styles.columnBar, { height: d.count ? Math.max(6, (d.count / max) * BAR_MAX) : 0, backgroundColor: colors.accent }]} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", marginTop: space.xs }}>
        {days.map((d) => (
          <Text key={d.day} variant="small" tone="muted" center style={{ flex: 1 }}>
            {label(d.day)}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { wide } = useLayout();
  const [stats, setStats] = useState<StatsSummary | null>(null);

  // Re-read whenever the tab is opened, so a job finished a moment ago shows up.
  useFocusEffect(
    useCallback(() => {
      setStats(readStats());
    }, []),
  );

  const confirmClear = () =>
    Alert.alert(t("stats.clearTitle"), t("stats.clearBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("stats.clear"),
        style: "destructive",
        onPress: () => {
          clearStats();
          setStats(readStats());
        },
      },
    ]);

  const s = stats;
  return (
    <Screen inTab>
      <View style={{ gap: space.xs + 2, marginTop: space.md }}>
        <Text variant="label" tone="accent">
          {t("stats.eyebrow")}
        </Text>
        <Text variant="display" accessibilityRole="header">
          {t("stats.title")}
        </Text>
        <Text variant="body" tone="muted">
          {t("stats.subtitle")}
        </Text>
      </View>

      {s ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {/* Two rows of two on phones, one row of four on tablets. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
            {[
              { value: String(s.runs), label: t("stats.runs") },
              { value: String(s.opens), label: t("stats.opens") },
              { value: String(s.files), label: t("stats.files") },
              { value: formatBytes(s.bytes), label: t("stats.bytes") },
            ].map((tile) => (
              <View key={tile.label} style={{ flexBasis: wide ? "22%" : "45%", flexGrow: 1 }}>
                <StatTile value={tile.value} label={tile.label} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {s && s.runs === 0 ? (
        <View style={{ marginTop: space.xl }}>
          <Notice kind="info" body={t("stats.empty")} />
        </View>
      ) : null}

      {s && s.topTools.length ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Text variant="title" accessibilityRole="header">
            {t("stats.top")}
          </Text>
          <Card>
            <TopTools items={s.topTools} />
          </Card>
        </View>
      ) : null}

      {s && s.runs > 0 ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <Text variant="title" accessibilityRole="header">
            {t("stats.week")}
          </Text>
          <Card>
            <Week days={s.week} />
          </Card>
        </View>
      ) : null}

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Notice kind="privacy" body={t("stats.privacy")} />
        {s?.since ? (
          <Text variant="small" tone="muted" center>
            {t("stats.since", { date: new Date(s.since).toLocaleDateString() })}
          </Text>
        ) : null}
        <Button kind="danger" icon={Trash2} label={t("stats.clear")} onPress={confirmClear} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radius.pill, overflow: "hidden" },
  bar: { height: "100%", borderRadius: radius.pill },
  columns: { flexDirection: "row", alignItems: "flex-end", height: 120, gap: space.sm, borderBottomWidth: 1, paddingTop: space.lg },
  column: { flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center", gap: 4 },
  columnBar: { width: "70%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});
