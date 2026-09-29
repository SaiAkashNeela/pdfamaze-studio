import type { Field } from "@/lib/tools";

type FieldValue = string | number | boolean | undefined;
type ControlProps<T extends Field["type"]> = {
  id: string;
  field: Extract<Field, { type: T }>;
  value: FieldValue;
  busy: boolean;
  onChange: (value: string | number | boolean) => void;
};

const textClass =
  "border-input bg-surface-raised placeholder:text-muted-foreground/70 h-9 w-full rounded-[3px] border px-2.5 font-mono text-[13px]";

function SelectControl({ id, field, value, busy, onChange }: ControlProps<"select">) {
  return (
    <select
      id={id}
      value={String(value)}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      className="border-input bg-surface-raised h-9 w-full rounded-[3px] border px-2 text-[13.5px]"
    >
      {field.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TextControl({ id, field, value, busy, onChange }: ControlProps<"text" | "password">) {
  return (
    <input
      id={id}
      type={field.type === "password" ? "password" : "text"}
      value={String(value)}
      disabled={busy}
      placeholder={"placeholder" in field ? field.placeholder : undefined}
      onChange={(e) => onChange(e.target.value)}
      className={textClass}
    />
  );
}

function TextareaControl({ id, field, value, busy, onChange }: ControlProps<"textarea">) {
  return (
    <textarea
      id={id}
      value={String(value)}
      disabled={busy}
      rows={field.rows ?? 4}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="border-input bg-surface-raised placeholder:text-muted-foreground/70 w-full resize-y rounded-[3px] border px-2.5 py-2 font-mono text-[12.5px] leading-relaxed"
    />
  );
}

function ColorControl({ id, value, busy, onChange }: ControlProps<"color">) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={String(value)}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        className="border-input h-9 w-12 cursor-pointer rounded-[3px] border bg-transparent p-1"
      />
      <span className="text-muted-foreground font-mono text-[12px] uppercase">{String(value)}</span>
    </div>
  );
}

function RangeControl({ id, field, value, busy, onChange }: ControlProps<"range">) {
  return (
    <input
      id={id}
      type="range"
      min={field.min}
      max={field.max}
      step={field.step}
      value={Number(value)}
      disabled={busy}
      onChange={(e) => onChange(Number(e.target.value))}
      className="accent-accent w-full"
    />
  );
}

function Hint({ text }: { text: string | undefined }) {
  return text ? <p className="text-muted-foreground mt-1.5 text-[12px] leading-snug">{text}</p> : null;
}

function Control(props: { id: string; field: Field; value: FieldValue; busy: boolean; onChange: (v: string | number | boolean) => void }) {
  const { field } = props;
  switch (field.type) {
    case "select":
      return <SelectControl {...props} field={field} />;
    case "text":
    case "password":
      return <TextControl {...props} field={field} />;
    case "textarea":
      return <TextareaControl {...props} field={field} />;
    case "color":
      return <ColorControl {...props} field={field} />;
    case "range":
      return <RangeControl {...props} field={field} />;
    default:
      return null;
  }
}

export function ToolRunnerField({
  field,
  value,
  busy,
  onChange,
}: {
  field: Field;
  value: FieldValue;
  busy: boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  const id = `field-${field.name}`;

  if (field.type === "switch") {
    return (
      <div>
        <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4">
          <span className="text-[13.5px]">{field.label}</span>
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            disabled={busy}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-accent h-4 w-4"
          />
        </label>
        <Hint text={field.hint} />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]">
        <span>{field.label}</span>
        {field.type === "range" ? (
          <span className="text-muted-foreground font-mono text-[11.5px] tabular-nums">
            {String(value)}
            {field.unit ?? ""}
          </span>
        ) : null}
      </label>
      <Control id={id} field={field} value={value} busy={busy} onChange={onChange} />
      <Hint text={field.hint} />
    </div>
  );
}
