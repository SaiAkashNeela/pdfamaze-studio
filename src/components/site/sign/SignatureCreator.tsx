import { useEffect, useState } from "react";
import { Eraser, ImageUp, PenLine, Type } from "lucide-react";
import { DrawPad } from "./DrawPad";
import {
  imageFileToSignature,
  INK_COLORS,
  renderTextSignature,
  SIGNATURE_FONTS,
} from "@/lib/signature-image";
import { cn } from "@/lib/utils";

type Mode = "draw" | "type" | "upload";

const MODES: { value: Mode; label: string; icon: typeof PenLine }[] = [
  { value: "draw", label: "Draw", icon: PenLine },
  { value: "type", label: "Type", icon: Type },
  { value: "upload", label: "Upload", icon: ImageUp },
];

function InkPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Ink colour">
      {INK_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={value === c.value}
          aria-label={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            "h-6 w-6 rounded-full border-2 transition-transform",
            value === c.value ? "border-foreground scale-110" : "border-transparent",
          )}
          style={{ backgroundColor: c.value }}
        />
      ))}
      <input
        type="color"
        aria-label="Custom ink colour"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
      />
    </div>
  );
}

function DrawTab({ color, onDraft }: { color: string; onDraft: (d: string | null) => void }) {
  const [penWidth, setPenWidth] = useState(2.5);
  const [clearSignal, setClearSignal] = useState(0);
  return (
    <div className="space-y-3">
      <DrawPad color={color} penWidth={penWidth} clearSignal={clearSignal} onChange={onDraft} />
      <div className="flex items-center justify-between gap-3">
        <label className="text-muted-foreground flex items-center gap-2 text-[12px]">
          Pen
          <input
            type="range"
            min={1}
            max={6}
            step={0.5}
            value={penWidth}
            onChange={(e) => setPenWidth(Number(e.target.value))}
            className="accent-accent w-24"
          />
        </label>
        <button
          type="button"
          onClick={() => setClearSignal((n) => n + 1)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[12px]"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}

function TypeTab({ color, onDraft }: { color: string; onDraft: (d: string | null) => void }) {
  const [name, setName] = useState("");
  const [font, setFont] = useState<string>(SIGNATURE_FONTS[0].value);

  useEffect(() => {
    let active = true;
    renderTextSignature(name, font, color).then((d) => {
      if (active) onDraft(d);
    });
    return () => {
      active = false;
    };
  }, [name, font, color, onDraft]);

  const css = SIGNATURE_FONTS.find((f) => f.value === font)?.css;
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        placeholder="Your full name"
        aria-label="Name to use as signature"
        onChange={(e) => setName(e.target.value)}
        className="border-input bg-surface-raised h-9 w-full rounded-[3px] border px-2.5 text-[13.5px]"
      />
      <select
        value={font}
        aria-label="Signature font"
        onChange={(e) => setFont(e.target.value)}
        className="border-input bg-surface-raised h-9 w-full rounded-[3px] border px-2 text-[13.5px]"
      >
        {SIGNATURE_FONTS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <div
        className="border-border-strong grid h-24 place-items-center overflow-hidden rounded-[4px] border border-dashed bg-white px-3 text-[34px] leading-none"
        style={{ fontFamily: css, color }}
      >
        <span className="truncate">{name || "Preview"}</span>
      </div>
    </div>
  );
}

function UploadTab({ onDraft }: { onDraft: (d: string | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return undefined;
    let active = true;
    imageFileToSignature(file, removeBackground).then((d) => {
      if (!active) return;
      setPreview(d);
      onDraft(d);
    });
    return () => {
      active = false;
    };
  }, [file, removeBackground, onDraft]);

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Signature image"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="file:bg-secondary file:text-foreground w-full text-[12.5px] file:mr-3 file:rounded-[3px] file:border-0 file:px-3 file:py-1.5"
      />
      <label className="flex cursor-pointer items-center justify-between gap-4 text-[13px]">
        Remove white background
        <input
          type="checkbox"
          checked={removeBackground}
          onChange={(e) => setRemoveBackground(e.target.checked)}
          className="accent-accent h-4 w-4"
        />
      </label>
      {preview ? (
        <div className="border-border-strong grid h-24 place-items-center rounded-[4px] border border-dashed bg-white p-2">
          <img src={preview} alt="Uploaded signature preview" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}

/** Builds a signature image by drawing, typing or uploading, then hands it to the caller. */
export function SignatureCreator({ onCreate }: { onCreate: (dataUrl: string, save: boolean) => void }) {
  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState<string>(INK_COLORS[0].value);
  const [draft, setDraft] = useState<string | null>(null);
  const [save, setSave] = useState(true);

  const switchMode = (next: Mode) => {
    setMode(next);
    setDraft(null);
  };

  return (
    <div className="space-y-3">
      <div className="bg-secondary grid grid-cols-3 gap-1 rounded-[4px] p-1" role="tablist">
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => switchMode(value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] text-[12.5px] transition-colors",
              mode === value ? "bg-surface-raised text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {mode !== "upload" ? <InkPicker value={color} onChange={setColor} /> : null}
      {mode === "draw" ? <DrawTab color={color} onDraft={setDraft} /> : null}
      {mode === "type" ? <TypeTab color={color} onDraft={setDraft} /> : null}
      {mode === "upload" ? <UploadTab onDraft={setDraft} /> : null}

      <label className="flex cursor-pointer items-center justify-between gap-4 text-[13px]">
        Remember on this device
        <input
          type="checkbox"
          checked={save}
          onChange={(e) => setSave(e.target.checked)}
          className="accent-accent h-4 w-4"
        />
      </label>
      <button
        type="button"
        disabled={!draft}
        onClick={() => draft && onCreate(draft, save)}
        className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-full rounded-xl text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        Use this signature
      </button>
    </div>
  );
}
