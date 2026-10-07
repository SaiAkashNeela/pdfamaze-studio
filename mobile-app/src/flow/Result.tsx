/**
 * The finish line: a clear "All done!", the new file(s), and one obvious way to keep them.
 * iOS: the share sheet (it includes "Save to Files"). Android: "Save to phone" opens a folder
 * picker, with Share alongside.
 */
import { router } from "expo-router";
import { CircleCheck, Download, FileText, House, RefreshCw, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Platform, View } from "react-native";
import { formatBytes, OutBlob, zipOutputs } from "@/engine/core";
import { saveToFolder, shareResult, writeResults, type SavedResult } from "@/files/output";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

type Props = {
  results: SavedResult[];
  inputSize: number;
  /** Show how much smaller the file became (compression). */
  showSavings?: boolean;
  onAgain: () => void;
};

export function Result({ results, inputSize, showSavings, onAgain }: Props) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<{ kind: "privacy" | "error"; body: string } | null>(null);
  const many = results.length > 1;
  const android = Platform.OS === "android";

  const guard = async (action: () => Promise<void>) => {
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setMessage({ kind: "error", body: e instanceof Error ? e.message : t("error.generic") });
    }
  };

  const saveAll = () =>
    guard(async () => {
      if (await saveToFolder(results)) setMessage({ kind: "privacy", body: t("result.savedTo") });
    });

  const shareZip = () =>
    guard(async () => {
      const zip = await zipOutputs(
        results.map((r) => ({ name: r.name, blob: new OutBlob(r.bytes, r.type) })),
        "pdfamaze-files.zip",
      );
      const [saved] = writeResults([zip]);
      if (saved) await shareResult(saved);
    });

  const outSize = results.reduce((sum, r) => sum + r.size, 0);
  const percent = inputSize > 0 ? Math.round((1 - outSize / inputSize) * 100) : 0;

  return (
    <Screen
      footer={
        <>
          {android ? (
            <Button large icon={Download} label={t("result.save")} onPress={() => void saveAll()} />
          ) : !many ? (
            <Button large icon={Share2} label={t("result.saveOrShare")} onPress={() => void guard(() => shareResult(results[0]!))} />
          ) : (
            <Button large icon={Share2} label={t("result.shareAll")} onPress={() => void shareZip()} />
          )}
          {android && !many ? (
            <Button kind="secondary" icon={Share2} label={t("result.share")} onPress={() => void guard(() => shareResult(results[0]!))} />
          ) : null}
        </>
      }
    >
      <View
        style={{ alignItems: "center", gap: space.md, marginTop: space.xxl, marginBottom: space.xl }}
        accessible
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
      >
        <CircleCheck size={64} color={colors.success} strokeWidth={1.8} />
        <Text variant="display" center>
          {t("result.title")}
        </Text>
        <Text variant="body" tone="muted" center>
          {many ? t("result.subtitleMany", { count: results.length }) : t("result.subtitleOne")}
        </Text>
      </View>

      <View style={{ gap: space.md }}>
        {results.map((r) => (
          <Card key={r.uri} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <FileText size={32} color={colors.accent} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {r.name}
              </Text>
              <Text variant="small" tone="muted">
                {formatBytes(r.size)}
              </Text>
            </View>
            {many ? (
              <Button
                kind="secondary"
                icon={Share2}
                label={t("result.share")}
                accessibilityLabel={`${t("result.share")} ${r.name}`}
                onPress={() => void guard(() => shareResult(r))}
                style={{ paddingHorizontal: space.md }}
              />
            ) : null}
          </Card>
        ))}
        {showSavings ? (
          percent >= 2 ? (
            <Notice kind="privacy" body={t("result.smaller", { percent })} />
          ) : (
            <Notice kind="info" body={t("result.noSmaller")} />
          )
        ) : null}
        {message ? <Notice kind={message.kind} body={message.body} /> : null}
      </View>

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Button kind="secondary" icon={RefreshCw} label={t("result.startOver")} onPress={onAgain} />
        <Button kind="ghost" icon={House} label={t("result.home")} onPress={() => router.navigate("/")} />
      </View>
    </Screen>
  );
}
