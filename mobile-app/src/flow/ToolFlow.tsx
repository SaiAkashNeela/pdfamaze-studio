/**
 * The standard recipe every simple tool follows, on one scrolling page:
 *   1. Choose your file   2. Choose how   →  big button at the bottom.
 * Only the essential options show by default; the rest wait behind "More options".
 */
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import type { LocalFile } from "@/engine/core";
import { t } from "@/i18n";
import { defaultValues } from "@/tools/registry";
import type { Field, FieldValues, Source, Tool } from "@/tools/types";
import { space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { FieldControl } from "@/ui/fields";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { FilePicker } from "./FilePicker";
import { Step } from "./Step";
import { ToolHeader } from "./ToolHeader";
import { useStartJob } from "./useStartJob";

/** Splits the currently visible fields into the essentials and the "More options" extras. */
function groupFields(tool: Tool, values: FieldValues) {
  const visible = new Set(tool.fieldsFor ? tool.fieldsFor(values) : tool.fields.map((f) => f.name));
  const fields = tool.fields.filter((f) => visible.has(f.name));
  if (!tool.basic) return { upfront: fields, extra: [] as Field[] };
  const basic = new Set(tool.basic);
  return { upfront: fields.filter((f) => basic.has(f.name)), extra: fields.filter((f) => !basic.has(f.name)) };
}

function Options({ tool, values, onChange }: { tool: Tool; values: FieldValues; onChange: (name: string, v: string | number | boolean) => void }) {
  const [showMore, setShowMore] = useState(false);
  const { upfront, extra } = groupFields(tool, values);
  const control = (f: Field) => <FieldControl key={f.name} field={f} value={values[f.name]!} onChange={(v) => onChange(f.name, v)} />;

  if (!upfront.length && !extra.length) {
    return (
      <Text variant="body" tone="muted">
        {t("tool.noOptions")}
      </Text>
    );
  }
  return (
    <View style={{ gap: space.xl }}>
      {upfront.map(control)}
      {extra.length ? (
        <Button
          kind="secondary"
          icon={showMore ? ChevronUp : ChevronDown}
          label={showMore ? t("common.fewer") : t("common.more")}
          onPress={() => setShowMore((s) => !s)}
          accessibilityHint={extra.map((f) => f.label).join(", ")}
        />
      ) : null}
      {showMore ? extra.map(control) : null}
    </View>
  );
}

function Footer({ tool, files, onStart }: { tool: Tool; files: LocalFile[]; onStart: () => void }) {
  const minFiles = Math.max(1, tool.minFiles);
  const ready = files.length >= minFiles;
  const waitingFor = files.length === 0 && minFiles === 1 ? t("tool.needFile") : t("tool.needFiles", { count: minFiles });
  return (
    <>
      {ready ? null : (
        <Text variant="small" tone="muted" center>
          {waitingFor}
        </Text>
      )}
      <Button large label={tool.action} onPress={onStart} disabled={!ready} />
    </>
  );
}

export function ToolFlow({ tool, inTab, autoSource }: { tool: Tool; inTab?: boolean; autoSource?: Source }) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [values, setValues] = useState<FieldValues>(() => defaultValues(tool));
  const startJob = useStartJob(tool);
  const start = () => startJob(files, (progress) => tool.run(files, values, progress));

  return (
    <Screen back={!inTab} inTab={inTab} footer={<Footer tool={tool} files={files} onStart={start} />}>
      <ToolHeader tool={tool} />
      <Step n={1} title={tool.multiple ? t("tool.stepFilesMany") : t("tool.stepFiles")} done={files.length >= Math.max(1, tool.minFiles)}>
        <FilePicker tool={tool} files={files} onChange={setFiles} autoSource={autoSource} />
      </Step>
      <Step n={2} title={t("tool.stepOptions")}>
        <Options tool={tool} values={values} onChange={(name, v) => setValues((old) => ({ ...old, [name]: v }))} />
        {tool.caveat ? <Notice kind="info" body={tool.caveat} /> : null}
      </Step>
    </Screen>
  );
}
