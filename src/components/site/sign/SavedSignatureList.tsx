import { Trash2 } from "lucide-react";
import type { SavedSignature } from "@/lib/signatures";
import { cn } from "@/lib/utils";

export function SavedSignatureList({
  items,
  activeUrl,
  onPick,
  onDelete,
}: {
  items: SavedSignature[];
  activeUrl: string | null;
  onPick: (item: SavedSignature) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="label-xs">Saved on this device</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <button
              type="button"
              onClick={() => onPick(item)}
              aria-label={`Use ${item.label}`}
              aria-pressed={activeUrl === item.dataUrl}
              className={cn(
                "grid h-16 w-full place-items-center rounded-[4px] border bg-white p-1.5 transition-colors",
                activeUrl === item.dataUrl ? "border-accent ring-accent/30 ring-2" : "border-border hover:border-border-strong",
              )}
            >
              <img src={item.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label={`Delete ${item.label}`}
              className="bg-surface-raised text-muted-foreground hover:text-destructive border-border absolute -top-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border shadow-sm"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
