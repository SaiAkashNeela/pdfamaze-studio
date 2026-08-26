import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="border-border bg-surface inline-flex items-center rounded-[4px] border p-[2px]"
    >
      {options.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            onClick={() => setTheme(value)}
            className={`inline-flex h-7 w-8 items-center justify-center rounded-[3px] transition-colors ${
              active
                ? "bg-background text-foreground border-border border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
