/**
 * Home: one question ("What would you like to do?"), the eight most common jobs as big tiles,
 * then every tool in plain-language groups. Search is right there for anyone who knows the word.
 */
import { router } from "expo-router";
import { Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { t } from "@/i18n";
import { JobsBanner } from "@/jobs/JobsBanner";
import { CATEGORIES, FAVOURITES, getTool, searchTools, toolsIn } from "@/tools/registry";
import type { Tool } from "@/tools/types";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, MAX_FONT_SCALE, radius, space, TAP } from "@/theme/tokens";
import { Wordmark } from "@/ui/Logo";
import { Notice } from "@/ui/Notice";
import { PrivacyBadge } from "@/ui/PrivacyBadge";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { ToolRow, ToolTile } from "@/ui/ToolCards";

const favourites = FAVOURITES.map(getTool).filter((tool): tool is Tool => !!tool);

function pairs<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
  return out;
}

export default function Home() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const results = searchTools(query);
  const searching = query.trim().length > 0;

  return (
    <Screen inTab headerLeft={<Wordmark />} headerRight={<PrivacyBadge onPress={() => router.navigate("/help")} />}>
      <View style={{ gap: space.xs + 2, marginTop: space.md }}>
        <Text variant="label" tone="accent">
          {t("home.eyebrow")}
        </Text>
        <Text variant="display" accessibilityRole="header">
          {t("home.title")}
        </Text>
        <Text variant="body" tone="muted">
          {t("home.subtitle")}
        </Text>
      </View>

      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.borderStrong }]}>
        <Search size={20} color={colors.mutedForeground} />
        <TextInput
          accessibilityLabel={t("home.searchLabel")}
          value={query}
          onChangeText={setQuery}
          placeholder={t("home.searchPlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="search"
          autoCorrect={false}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {searching ? null : <JobsBanner />}

        {searching ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => setQuery("")} hitSlop={10} style={styles.clear}>
            <X size={22} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>

      {searching ? null : <JobsBanner />}

      {searching ? (
        <View style={{ gap: space.md, marginTop: space.lg }}>
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            {results.length ? t("home.results", { count: results.length }) : t("home.noResults", { query: query.trim() })}
          </Text>
          {results.map((tool) => (
            <ToolRow key={tool.slug} tool={tool} />
          ))}
        </View>
      ) : (
        <>
          <Section title={t("home.favourites")}>
            <View style={{ gap: space.md }}>
              {pairs(favourites).map((row) => (
                <View key={row.map((r) => r.slug).join()} style={{ flexDirection: "row", gap: space.md }}>
                  {row.map((tool) => (
                    <ToolTile key={tool.slug} tool={tool} />
                  ))}
                </View>
              ))}
            </View>
          </Section>

          <View style={{ marginTop: space.xl }}>
            <Notice kind="privacy" title={t("privacy.title")} body={t("privacy.body")} />
          </View>

          {CATEGORIES.map((c) => (
            <Section key={c.key} title={t(`home.categories.${c.key}`)} color={colors.tags[c.tags[0]!]}>
              <View style={{ gap: space.sm }}>
                {toolsIn(c.tags).map((tool) => (
                  <ToolRow key={tool.slug} tool={tool} />
                ))}
              </View>
            </Section>
          ))}
        </>
      )}
    </Screen>
  );
}

function Section({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: space.xl, gap: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }} accessibilityRole="header">
        {color ? <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} /> : null}
        <Text variant="title">{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: space.lg,
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingLeft: space.lg,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, minHeight: TAP - 4, fontFamily: fonts.regular, fontSize: 16 },
  clear: { width: TAP, height: TAP, alignItems: "center", justifyContent: "center" },
});
