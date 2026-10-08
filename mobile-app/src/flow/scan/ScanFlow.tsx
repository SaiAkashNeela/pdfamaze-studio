/**
 * Scan tab: photograph paper pages and turn them into one PDF.
 * Built around the camera rather than the generic tool form: one clear "Take a photo" card,
 * then the pages as a grid of thumbnails you can reorder, remove or add to.
 */
import { Image } from "expo-image";
import { Camera, ChevronLeft, ChevronRight, FolderOpen, Images, Plus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { LocalFile } from "@/engine/core";
import { pickDocuments, pickPhotos, takePhoto } from "@/files/pick";
import { t } from "@/i18n";
import { getTool } from "@/tools/registry";
import type { Source } from "@/tools/types";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Segmented } from "@/ui/fields";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { useStartJob } from "../useStartJob";

const tool = getTool("images-to-pdf")!;

async function pickFrom(source: Source): Promise<LocalFile[]> {
  if (source === "camera") return [await takePhoto()].filter((f): f is LocalFile => !!f);
  if (source === "photos") return pickPhotos(true);
  return pickDocuments(tool.accept, true);
}

function PageThumb({
  file,
  index,
  count,
  onMove,
  onRemove,
}: {
  file: LocalFile;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const n = index + 1;
  const small = (label: string, Icon: typeof X, action: () => void, disabled = false, danger = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      hitSlop={6}
      style={({ pressed }) => [
        styles.thumbButton,
        { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.border },
        disabled && { opacity: 0.3 },
      ]}
    >
      <Icon size={18} color={danger ? colors.destructive : colors.foreground} strokeWidth={2.2} />
    </Pressable>
  );
  return (
    <View style={styles.thumbWrap}>
      <View
        style={[styles.thumb, { borderColor: colors.border, backgroundColor: colors.surface }]}
        accessible
        accessibilityLabel={t("scan.pageLabel", { n, count })}
      >
        <Image source={{ uri: file.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={[styles.pageBadge, { backgroundColor: colors.primary }]}>
          <Text variant="small" tone="inverse" style={{ fontFamily: "IBMPlexSans_600SemiBold" }}>
            {n}
          </Text>
        </View>
      </View>
      <View style={styles.thumbActions}>
        {small(t("scan.moveEarlier", { n }), ChevronLeft, () => onMove(-1), index === 0)}
        {small(t("scan.removePage", { n }), X, onRemove, false, true)}
        {small(t("scan.moveLater", { n }), ChevronRight, () => onMove(1), index === count - 1)}
      </View>
    </View>
  );
}

export function ScanFlow() {
  const { colors } = useTheme();
  const [pages, setPages] = useState<LocalFile[]>([]);
  const [fit, setFit] = useState("a4");
  const [message, setMessage] = useState<string | null>(null);
  const startJob = useStartJob(tool);

  const add = async (source: Source) => {
    try {
      const picked = await pickFrom(source);
      setMessage(null);
      if (picked.length) setPages((p) => [...p, ...picked]);
    } catch (e) {
      setMessage(e instanceof Error && e.message ? e.message : t("tool.pickerError"));
    }
  };

  // Open the camera once, just after the tab first appears.
  useEffect(() => {
    const timer = setTimeout(() => void add("camera"), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (index: number, dir: -1 | 1) =>
    setPages((p) => {
      const next = [...p];
      const [item] = next.splice(index, 1);
      next.splice(index + dir, 0, item!);
      return next;
    });

  const make = () => startJob(pages, (progress) => tool.run(pages, { fit, margin: 24 }, progress));
  const has = pages.length > 0;

  return (
    <Screen
      inTab
      footer={
        has ? (
          <>
            {message ? <Notice kind="warning" body={message} /> : null}
            <Button large label={pages.length === 1 ? t("scan.makeOne") : t("scan.makeMany", { count: pages.length })} onPress={make} />
          </>
        ) : undefined
      }
    >
      <View style={{ gap: 2, marginTop: space.md }}>
        <Text variant="title" accessibilityRole="header">
          {t("scan.title")}
        </Text>
        <Text variant="small" tone="muted">
          {t("scan.subtitle")}
        </Text>
      </View>

      {has ? (
        <>
          <View style={styles.grid}>
            {pages.map((file, i) => (
              <PageThumb
                key={file.id}
                file={file}
                index={i}
                count={pages.length}
                onMove={(dir) => move(i, dir)}
                onRemove={() => setPages((p) => p.filter((x) => x.id !== file.id))}
              />
            ))}
            <View style={styles.thumbWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("scan.addPage")}
                onPress={() => void add("camera")}
                style={({ pressed }) => [
                  styles.thumb,
                  styles.addTile,
                  { borderColor: colors.accent, backgroundColor: pressed ? colors.accentSoft : colors.card },
                ]}
              >
                <Plus size={26} color={colors.accent} strokeWidth={2.2} />
                <Text variant="small" tone="accent" style={{ fontFamily: "IBMPlexSans_600SemiBold" }}>
                  {t("scan.addPage")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" icon={Images} label={t("scan.photos")} onPress={() => void add("photos")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" icon={FolderOpen} label={t("scan.files")} onPress={() => void add("files")} />
            </View>
          </View>

          <View style={{ marginTop: space.xl }}>
            <Segmented
              label={t("scan.pageSize")}
              options={[
                { value: "a4", label: t("scan.a4") },
                { value: "image", label: t("scan.fitPhoto") },
              ]}
              value={fit}
              onChange={setFit}
            />
          </View>
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("tool.takePhoto")}
            accessibilityHint={t("scan.heroHint")}
            onPress={() => void add("camera")}
            style={({ pressed }) => [styles.hero, { borderColor: colors.accent, backgroundColor: colors.accentSoft }, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.heroIcon, { backgroundColor: colors.accent }]}>
              <Camera size={30} color={colors.accentForeground} strokeWidth={2} />
            </View>
            <Text variant="heading" center>
              {t("tool.takePhoto")}
            </Text>
            <Text variant="small" tone="muted" center style={{ maxWidth: 260 }}>
              {t("scan.heroHint")}
            </Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" icon={Images} label={t("scan.photos")} onPress={() => void add("photos")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" icon={FolderOpen} label={t("scan.files")} onPress={() => void add("files")} />
            </View>
          </View>

          {message ? (
            <View style={{ marginTop: space.md }}>
              <Notice kind="warning" body={message} />
            </View>
          ) : null}

          <View style={{ gap: space.sm, marginTop: space.xl }}>
            <Text variant="label" tone="muted">
              {t("scan.tipsTitle")}
            </Text>
            <Text variant="small" tone="muted">
              {t("scan.tip1")}
            </Text>
            <Text variant="small" tone="muted">
              {t("scan.tip2")}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: space.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: "center",
    gap: space.sm,
  },
  heroIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.lg },
  thumbWrap: { width: "30.5%", gap: space.xs },
  thumb: { aspectRatio: 3 / 4, borderRadius: radius.md, borderWidth: 1, overflow: "hidden" },
  addTile: { borderStyle: "dashed", borderWidth: 1.5, alignItems: "center", justifyContent: "center", gap: 4 },
  pageBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  thumbActions: { flexDirection: "row", justifyContent: "space-between" },
  thumbButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
