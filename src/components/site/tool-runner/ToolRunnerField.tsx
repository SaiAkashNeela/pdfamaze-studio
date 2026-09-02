import type { Field } from "@/lib/tools";

export function ToolRunnerField({
  field,
  value,
  busy,
  onChange,
}: {
  field: Field;
  value: string | number | boolean | undefined;
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
        {field.hint ? (
          <p className="text-muted-foreground mt-1.5 text-[12px] leading-snug">{field.hint}</p>
        ) : null}
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

      {field.type === "select" ? (
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
      ) : null}

      {field.type === "text" || field.type === "password" ? (
        <input
          id={id}
          type={field.type === "password" ? "password" : "text"}
          value={String(value)}
          disabled={busy}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="border-input bg-surface-raised placeholder:text-muted-foreground/70 h-9 w-full rounded-[3px] border px-2.5 font-mono text-[13px]"
        />
      ) : null}

      {field.type === "range" ? (
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
      ) : null}

      {field.hint ? (
        <p className="text-muted-foreground mt-1.5 text-[12px] leading-snug">{field.hint}</p>
      ) : null}
    </div>
  );
}
