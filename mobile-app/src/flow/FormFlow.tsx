/**
 * Fill a PDF form: every box in the form becomes a big, labelled control on the phone,
 * one under the other, so nobody has to pinch-zoom into a tiny page.
 */
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { LocalFile } from "@/engine/core";
import { fillForm, readFormFields, type FormFieldInfo, type FormValues } from "@/engine/ops/forms";
import { t } from "@/i18n";
import type { Tool } from "@/tools/types";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { OptionList, TextField, ToggleRow } from "@/ui/fields";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { FilePicker } from "./FilePicker";
import { Step } from "./Step";
import { ToolHeader } from "./ToolHeader";
import { useFileData, type FileData } from "./useFileData";
import { useStartJob } from "./useStartJob";

type Value = string | boolean | string[];

/** Field names are often machine-like ("txtFirstName_1"); make them readable. */
function prettyName(name: string) {
  const last = name.split(".").pop() ?? name;
  const words = last
    .replace(/^(txt|chk|cb|rb|ddl|fld|field)(?=[A-Z_])/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+\d+$/, "")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : name;
}

function MultiChoice({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const chosen = new Set(value);
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="bodyStrong">{label}</Text>
      {options.map((o) => (
        <ToggleRow key={o} label={o} value={chosen.has(o)} onChange={(on) => onChange(on ? [...value, o] : value.filter((x) => x !== o))} />
      ))}
    </View>
  );
}

/** One form field as the right big control. Locked fields show but can't be changed. */
function FormField({ field, value, onChange }: { field: FormFieldInfo; value: Value | undefined; onChange: (v: Value) => void }) {
  const label = prettyName(field.name);
  const hint = field.readOnly ? t("form.readOnly") : undefined;
  const set = (v: Value) => {
    if (!field.readOnly) onChange(v);
  };
  switch (field.kind) {
    case "text":
      return (
        <TextField
          label={label}
          hint={hint}
          value={String(value ?? "")}
          onChange={(v) => set(field.maxLength ? v.slice(0, field.maxLength) : v)}
          multiline={field.multiline}
        />
      );
    case "checkbox":
      return <ToggleRow label={label} hint={hint} value={Boolean(value)} onChange={set} />;
    case "radio":
      return (
        <OptionList
          label={label}
          hint={hint ?? t("form.choose")}
          options={field.options.map((o) => ({ value: o, label: o }))}
          value={String(value ?? "")}
          onChange={set}
        />
      );
    case "dropdown":
    case "list": {
      const current = (value as string[] | undefined) ?? [];
      if (field.multi) return <MultiChoice label={label} options={field.options} value={current} onChange={set} />;
      return (
        <OptionList
          label={label}
          hint={hint ?? t("form.choose")}
          options={field.options.map((o) => ({ value: o, label: o }))}
          value={current[0] ?? ""}
          onChange={(v) => set([v])}
        />
      );
    }
    case "signature":
      return <Notice kind="info" title={label} body={t("form.signatureField")} />;
    default:
      return null;
  }
}

function FieldsSection({
  data,
  values,
  onChange,
  flatten,
  onFlatten,
}: {
  data: FileData<FormFieldInfo[]>;
  values: FormValues;
  onChange: (name: string, v: Value) => void;
  flatten: boolean;
  onFlatten: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  if (data.status === "loading") {
    return (
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} />
        <Text tone="muted">{t("form.loading")}</Text>
      </View>
    );
  }
  if (data.status === "error") {
    return <Notice kind="error" title={t("error.title")} body={data.error instanceof Error ? data.error.message : t("tool.readError")} />;
  }
  if (data.status !== "ready") return null;
  const fields = data.value.filter((f) => f.kind !== "button");
  if (!fields.length) return <Notice kind="info" body={t("form.none")} />;
  return (
    <View style={{ gap: space.xl }}>
      {fields.map((f) => (
        <FormField key={f.name} field={f} value={values[f.name]} onChange={(v) => onChange(f.name, v)} />
      ))}
      <ToggleRow label={t("form.flatten")} hint={t("form.flattenHint")} value={flatten} onChange={onFlatten} />
    </View>
  );
}

/** Current answers: what's already in the PDF, overlaid with what the person has typed. */
function currentValues(data: FileData<FormFieldInfo[]>, edits: FormValues): FormValues {
  const values: FormValues = {};
  if (data.status === "ready") for (const f of data.value) if ("value" in f) values[f.name] = f.value;
  return { ...values, ...edits };
}

export function FormFlow({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [edits, setEdits] = useState<{ fileId: string; values: FormValues } | null>(null);
  const [flatten, setFlatten] = useState(false);
  const startJob = useStartJob(tool);
  const file = files[0];
  const data = useFileData(file, readFormFields);

  const myEdits = file && edits?.fileId === file.id ? edits.values : {};
  const values = currentValues(data, myEdits);
  const ready = data.status === "ready" && data.value.some((f) => !f.readOnly && f.kind !== "signature" && f.kind !== "button");

  const change = (name: string, v: Value) => {
    if (file) setEdits({ fileId: file.id, values: { ...myEdits, [name]: v } });
  };
  const start = () => {
    if (file) startJob([file], (progress) => fillForm(file, values, { flatten }, progress));
  };

  return (
    <Screen
      back
      footer={
        <>
          {file ? null : (
            <Text variant="small" tone="muted" center>
              {t("tool.needFile")}
            </Text>
          )}
          <Button large label={t("form.action")} onPress={start} disabled={!ready} />
        </>
      }
    >
      <ToolHeader tool={tool} />
      <Step n={1} title={t("tool.stepFiles")} done={!!file}>
        <FilePicker tool={tool} files={files} onChange={setFiles} />
      </Step>
      {file ? (
        <Step n={2} title={t("form.fieldsTitle")}>
          <FieldsSection data={data} values={values} onChange={change} flatten={flatten} onFlatten={setFlatten} />
        </Step>
      ) : null}
    </Screen>
  );
}
