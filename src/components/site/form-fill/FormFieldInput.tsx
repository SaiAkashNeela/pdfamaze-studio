import type { FormFieldInfo } from "@/lib/pdf/ops/forms";

type Value = string | boolean | string[] | undefined;

const inputClass = "border-input bg-surface-raised h-9 w-full rounded-[3px] border px-2.5 text-[13.5px] disabled:opacity-60";

function Control({ field, value, disabled, onChange }: { field: FormFieldInfo; value: Value; disabled: boolean; onChange: (v: string | boolean | string[]) => void }) {
  const id = `ff-${field.name}`;
  const off = disabled || field.readOnly;
  switch (field.kind) {
    case "text":
      return field.multiline ? (
        <textarea id={id} aria-label={field.name} rows={3} value={String(value ?? "")} maxLength={field.maxLength} disabled={off} onChange={(e) => onChange(e.target.value)} className={`${inputClass} h-auto py-2`} />
      ) : (
        <input id={id} aria-label={field.name} type="text" value={String(value ?? "")} maxLength={field.maxLength} disabled={off} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      );
    case "checkbox":
      return <input id={id} aria-label={field.name} type="checkbox" checked={Boolean(value)} disabled={off} onChange={(e) => onChange(e.target.checked)} className="accent-accent h-4 w-4" />;
    case "radio":
      return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-x-4 gap-y-1.5">
          {field.options.map((o) => (
            <label key={o} className="inline-flex items-center gap-1.5 text-[13px]">
              <input type="radio" aria-label={`${field.name}: ${o}`} name={id} checked={value === o} disabled={off} onChange={() => onChange(o)} className="accent-accent" />
              {o}
            </label>
          ))}
        </div>
      );
    case "dropdown":
    case "list":
      return field.multi ? (
        <select id={id} aria-label={field.name} multiple value={Array.isArray(value) ? value : []} disabled={off} onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))} className={`${inputClass} h-24`}>
          {field.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <select id={id} aria-label={field.name} value={Array.isArray(value) ? (value[0] ?? "") : ""} disabled={off} onChange={(e) => onChange(e.target.value ? [e.target.value] : [])} className={inputClass}>
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    default:
      return null;
  }
}

export function FormFieldInput({ field, value, disabled, onChange }: { field: FormFieldInfo; value: Value; disabled: boolean; onChange: (v: string | boolean | string[]) => void }) {
  const inline = field.kind === "checkbox";
  return (
    <div className={inline ? "flex items-center justify-between gap-4 px-4 py-3" : "space-y-1.5 px-4 py-3"}>
      <label id={`ff-${field.name}-label`} htmlFor={`ff-${field.name}`} className="flex items-baseline gap-2 text-[13.5px]">
        <span className="font-medium break-all">{field.name}</span>
        {field.readOnly ? <span className="text-muted-foreground text-[11px]">read-only</span> : null}
      </label>
      <Control field={field} value={value} disabled={disabled} onChange={onChange} />
    </div>
  );
}
