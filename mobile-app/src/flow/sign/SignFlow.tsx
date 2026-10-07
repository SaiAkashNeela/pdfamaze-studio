/**
 * Sign PDF, mobile style. No fiddly drag-and-resize on a tiny page preview:
 *   1. Choose the PDF   2. Draw (or reuse) a signature   3. Pick page, spot and size.
 */
import { Eraser, PenLine, Undo2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { LocalFile } from "@/engine/core";
import { signPdf } from "@/engine/ops/sign";
import { countPages } from "@/files/pick";
import { t } from "@/i18n";
import type { Tool } from "@/tools/types";
import { space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { OptionList, PositionGrid, Stepper, ToggleRow } from "@/ui/fields";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { FilePicker } from "../FilePicker";
import { Result } from "../Result";
import { Step } from "../Step";
import { ToolHeader } from "../ToolHeader";
import { useFileData } from "../useFileData";
import { useJob } from "../useJob";
import { Working } from "../Working";
import { inkFromStrokes, PAD_STROKE, type Point } from "./ink";
import { forgetSignature, loadSignature, saveSignature } from "./savedSignature";
import { SignaturePad } from "./SignaturePad";

const SIZES: Record<string, number> = { small: 0.22, medium: 0.32, large: 0.45 };
const INKS: Record<string, string> = { blue: "#1f3a8a", black: "#1c1712" };

type Placement = { pages: string; pageNumber: number; position: string; size: string };

/** The remembered signature, scaled to fit a small preview. */
function SavedPreview({ strokes, color }: { strokes: Point[][]; color: string }) {
  const ink = inkFromStrokes(strokes);
  if (!ink) return null;
  const pad = PAD_STROKE * 2;
  const vb = `${ink.box.x - pad} ${ink.box.y - pad} ${ink.box.width + pad * 2} ${ink.box.height + pad * 2}`;
  const width = 240;
  const height = Math.min(120, (width * (ink.box.height + pad * 2)) / (ink.box.width + pad * 2));
  return (
    <Svg width={width} height={height} viewBox={vb} accessibilityLabel={t("sign.useSaved")}>
      {ink.paths.map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={PAD_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
    </Svg>
  );
}

function SignatureStep(props: {
  saved: Point[][] | null;
  useSaved: boolean;
  onUseSaved: (v: boolean) => void;
  strokes: Point[][];
  onStrokes: (s: Point[][]) => void;
  onDrawing: (d: boolean) => void;
  ink: string;
  onInk: (v: string) => void;
  remember: boolean;
  onRemember: (v: boolean) => void;
}) {
  const { saved, strokes, onStrokes } = props;
  const color = INKS[props.ink]!;
  return (
    <>
      {props.useSaved && saved ? (
        <View style={{ gap: space.md }}>
          <Card style={{ alignItems: "center", paddingVertical: space.xl }}>
            <SavedPreview strokes={saved} color={color} />
          </Card>
          <Button kind="secondary" icon={PenLine} label={t("sign.drawNew")} onPress={() => props.onUseSaved(false)} />
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <SignaturePad color={color} strokes={strokes} onChange={onStrokes} onDrawing={props.onDrawing} />
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" icon={Undo2} label={t("sign.undo")} onPress={() => onStrokes(strokes.slice(0, -1))} disabled={!strokes.length} />
            </View>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" icon={Eraser} label={t("sign.clear")} onPress={() => onStrokes([])} disabled={!strokes.length} />
            </View>
          </View>
          {saved ? <Button kind="ghost" label={t("sign.useSaved")} onPress={() => props.onUseSaved(true)} /> : null}
        </View>
      )}
      <OptionList
        label={t("sign.ink")}
        options={[
          { value: "blue", label: t("sign.inkBlue") },
          { value: "black", label: t("sign.inkBlack") },
        ]}
        value={props.ink}
        onChange={props.onInk}
      />
      <ToggleRow label={t("sign.remember")} hint={t("sign.rememberHint")} value={props.remember} onChange={props.onRemember} />
    </>
  );
}

function PlacementStep({ value, onChange, pageCount }: { value: Placement; onChange: (p: Placement) => void; pageCount: number | null }) {
  const set = (patch: Partial<Placement>) => onChange({ ...value, ...patch });
  return (
    <View style={{ gap: space.xl }}>
      <OptionList
        label={t("sign.pages")}
        options={[
          { value: "last", label: t("sign.pageLast") },
          { value: "first", label: t("sign.pageFirst") },
          { value: "all", label: t("sign.pageAll") },
          { value: "number", label: t("sign.pageNumber") },
        ]}
        value={value.pages}
        onChange={(pages) => set({ pages })}
      />
      {value.pages === "number" ? (
        <Stepper label={t("sign.pageNumber")} value={value.pageNumber} min={1} max={Math.max(1, pageCount ?? 999)} step={1} onChange={(pageNumber) => set({ pageNumber })} />
      ) : null}
      <PositionGrid label={t("sign.position")} value={value.position} onChange={(position) => set({ position })} />
      <OptionList
        label={t("sign.size")}
        options={[
          { value: "small", label: t("sign.sizeSmall") },
          { value: "medium", label: t("sign.sizeMedium") },
          { value: "large", label: t("sign.sizeLarge") },
        ]}
        value={value.size}
        onChange={(size) => set({ size })}
      />
      <Notice kind="info" body={t("sign.caveat")} />
    </View>
  );
}

export function SignFlow({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [saved] = useState(loadSignature);
  const [useSaved, setUseSaved] = useState(!!saved);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [drawing, setDrawing] = useState(false);
  const [remember, setRemember] = useState(!!saved);
  const [ink, setInk] = useState("blue");
  const [placement, setPlacement] = useState<Placement>({ pages: "last", pageNumber: 1, position: "9", size: "medium" });
  const job = useJob();

  const file = files[0];
  const pageInfo = useFileData(file, countPages);
  const activeStrokes = useSaved && saved ? saved : strokes;
  const ready = !!file && activeStrokes.length > 0;
  const waiting = file ? t("sign.needSignature") : t("tool.needFile");

  const start = () => {
    const signature = inkFromStrokes(activeStrokes);
    if (!file || !signature) return;
    if (remember) saveSignature(activeStrokes);
    else forgetSignature();
    const pages = placement.pages === "number" ? String(placement.pageNumber) : placement.pages;
    const opts = { pages, position: Number(placement.position), width: SIZES[placement.size] ?? 0.32, color: INKS[ink]! };
    void job.run(file.size, (progress) => signPdf(file, signature, opts, progress));
  };

  if (job.state.phase === "done") {
    return (
      <Result
        results={job.state.results}
        inputSize={job.state.inputSize}
        onAgain={() => {
          setFiles([]);
          job.reset();
        }}
      />
    );
  }

  return (
    <>
      <Screen
        back
        scrollEnabled={!drawing}
        footer={
          <>
            {job.state.phase === "error" ? <Notice kind="error" title={t("error.title")} body={job.state.message} /> : null}
            {ready ? null : (
              <Text variant="small" tone="muted" center>
                {waiting}
              </Text>
            )}
            <Button large icon={PenLine} label={t("sign.action")} onPress={start} disabled={!ready} />
          </>
        }
      >
        <ToolHeader tool={tool} />
        <Step n={1} title={t("tool.stepFiles")} done={!!file}>
          <FilePicker tool={tool} files={files} onChange={setFiles} />
        </Step>
        <Step n={2} title={t("sign.drawTitle")} done={activeStrokes.length > 0}>
          <SignatureStep
            saved={saved}
            useSaved={useSaved}
            onUseSaved={setUseSaved}
            strokes={strokes}
            onStrokes={setStrokes}
            onDrawing={setDrawing}
            ink={ink}
            onInk={setInk}
            remember={remember}
            onRemember={setRemember}
          />
        </Step>
        <Step n={3} title={t("sign.placeTitle")}>
          <PlacementStep value={placement} onChange={setPlacement} pageCount={pageInfo.status === "ready" ? pageInfo.value : null} />
        </Step>
      </Screen>
      {job.state.phase === "running" ? <Working status={job.state.status} ratio={job.state.ratio} /> : null}
    </>
  );
}
