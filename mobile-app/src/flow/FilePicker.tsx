/**
 * Step 1 of every tool: big buttons to bring files in, then a clear list of what was picked,
 * with plain "move up / move down / remove" buttons instead of drag gestures.
 */
import { ArrowDown, ArrowUp, Camera, FileText, FolderOpen, Image as ImageIcon, Images, Plus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { acceptsFile, formatBytes, type LocalFile } from "@/engine/core";
import { countPages, pickDocuments, pickPhotos, takePhoto } from "@/files/pick";
import { t } from "@/i18n";
import type { Source, Tool } from "@/tools/types";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Notice } from "@/ui/Notice";
import { Text } from "@/ui/Text";
import { useFileData } from "./useFileData";

type Props = {
  tool: Tool;
  files: LocalFile[];
  onChange: (files: LocalFile[]) => void;
  /** Open this source as soon as the screen appears (the Scan tab opens the camera). */
  autoSource?: Source;
};

export function FilePicker({ tool, files, onChange, autoSource }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const sources: Source[] = tool.sources ?? ["files"];
  const hasFiles = files.length > 0;

  const add = async (source: Source) => {
    try {
      const picked =
        source === "camera"
          ? [await takePhoto()].filter((f): f is LocalFile => !!f)
          : source === "photos"
            ? await pickPhotos(tool.multiple)
            : await pickDocuments(tool.accept, tool.multiple);
      setMessage(null);
      if (!picked.length) return;
      const ok = picked.filter((f) => acceptsFile(tool.accept, f));
      const rejected = picked.find((f) => !acceptsFile(tool.accept, f));
      if (rejected) setMessage(t("tool.wrongType", { name: rejected.name }));
      if (!ok.length) return;
      onChange(tool.multiple ? [...files, ...ok] : ok.slice(0, 1));
    } catch (e) {
      setMessage(e instanceof Error && e.message ? e.message : t("tool.pickerError"));
    }
  };

  useEffect(() => {
    if (!autoSource) return;
    // Once, just after the screen has appeared, so the camera slides up over a drawn page.
    const timer = setTimeout(() => void add(autoSource), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...files];
    const [item] = next.splice(index, 1);
    next.splice(index + dir, 0, item!);
    onChange(next);
  };

  const pickLabel = (source: Source) => {
    if (source === "camera") return t("tool.takePhoto");
    if (source === "photos") return t("tool.pickPhotos");
    if (tool.accept === "*") return t("tool.pickAnyFiles");
    if (tool.accept === "application/pdf") return tool.multiple ? t("tool.pickPdfs") : t("tool.pickPdf");
    return t("tool.pickFiles");
  };
  const sourceIcon = { camera: Camera, photos: Images, files: FolderOpen };

  return (
    <View style={{ gap: space.md }}>
      {hasFiles ? (
        <>
          {tool.multiple && files.length > 1 ? (
            <Text variant="small" tone="muted">
              {tool.orderHint ?? t("tool.orderHint")}
            </Text>
          ) : null}
          {files.map((file, i) => (
            <FileCard
              key={file.id}
              file={file}
              index={tool.multiple ? i + 1 : undefined}
              onRemove={() => onChange(files.filter((_, n) => n !== i))}
              onUp={tool.multiple && i > 0 ? () => move(i, -1) : undefined}
              onDown={tool.multiple && i < files.length - 1 ? () => move(i, 1) : undefined}
            />
          ))}
          {tool.multiple ? (
            <View style={{ gap: space.sm }}>
              {sources.map((s) => (
                <Button
                  key={s}
                  kind="secondary"
                  icon={s === "files" ? Plus : sourceIcon[s]}
                  label={s === "files" && sources.length === 1 ? t("tool.addMore") : pickLabel(s)}
                  onPress={() => void add(s)}
                />
              ))}
            </View>
          ) : (
            <Button kind="ghost" label={t("tool.replace")} onPress={() => void add(sources[0]!)} />
          )}
        </>
      ) : (
        <View style={{ gap: space.md }}>
          {sources.map((s, i) => (
            <BigPickButton
              key={s}
              source={s}
              label={pickLabel(s)}
              hint={i === 0 ? tool.acceptLabel : undefined}
              prominent={i === 0}
              onPress={() => void add(s)}
            />
          ))}
        </View>
      )}
      {message ? <Notice kind="warning" body={message} /> : null}
    </View>
  );
}

/** The very first thing people see on a tool: a huge, obvious "choose" target. */
function BigPickButton({ source, label, hint, prominent, onPress }: { source: Source; label: string; hint?: string; prominent: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const Icon = source === "camera" ? Camera : source === "photos" ? Images : FolderOpen;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.big,
        prominent
          ? { minHeight: 108, borderStyle: "dashed", borderColor: colors.accent, backgroundColor: colors.accentSoft }
          : { borderColor: colors.borderStrong, backgroundColor: colors.card },
        pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[styles.bigIcon, { backgroundColor: prominent ? colors.accent : colors.surface }]}>
        <Icon size={24} color={prominent ? colors.accentForeground : colors.foreground} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading">{label}</Text>
        {hint ? (
          <Text variant="small" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function FileCard({ file, index, onRemove, onUp, onDown }: { file: LocalFile; index?: number; onRemove: () => void; onUp?: () => void; onDown?: () => void }) {
  const { colors } = useTheme();
  const info = useFileData(file, countPages);
  const pages = info.status === "ready" ? info.value : null;
  const isImage = file.type.startsWith("image/");
  const Icon = isImage ? ImageIcon : FileText;
  const details = [formatBytes(file.size), pages == null ? null : pages === 1 ? t("tool.page") : t("tool.pages", { count: pages })].filter(Boolean).join(" · ");

  const small = (label: string, icon: typeof X, action?: () => void) => {
    const I = icon;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !action }}
        disabled={!action}
        onPress={action}
        hitSlop={4}
        style={({ pressed }) => [
          styles.iconButton,
          { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card },
          !action && { opacity: 0.3 },
        ]}
      >
        <I size={22} color={icon === X ? colors.destructive : colors.foreground} strokeWidth={2.2} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        {index ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text variant="bodyStrong" tone="inverse">
              {index}
            </Text>
          </View>
        ) : (
          <Icon size={26} color={colors.accent} strokeWidth={1.8} />
        )}
        <View style={{ flex: 1 }} accessible accessibilityLabel={`${file.name}, ${details}`}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {file.name}
          </Text>
          <Text variant="small" tone="muted">
            {details}
          </Text>
        </View>
        {small(t("tool.remove", { name: file.name }), X, onRemove)}
      </View>
      {onUp || onDown ? (
        <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
          <View style={{ flex: 1 }}>
            <Button
              kind="secondary"
              icon={ArrowUp}
              label={t("tool.up")}
              accessibilityLabel={t("tool.moveUp", { name: file.name })}
              onPress={() => onUp?.()}
              disabled={!onUp}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              kind="secondary"
              icon={ArrowDown}
              label={t("tool.down")}
              accessibilityLabel={t("tool.moveDown", { name: file.name })}
              onPress={() => onDown?.()}
              disabled={!onDown}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  big: { minHeight: 72, borderWidth: 2, borderRadius: radius.lg, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.lg },
  bigIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.md + 2 },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
