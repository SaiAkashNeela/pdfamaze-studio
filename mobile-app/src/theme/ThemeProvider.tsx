import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { loadPrefs, savePrefs, type ThemeChoice } from "./prefs";
import { dark, light, type Palette } from "./tokens";

type ThemeContextValue = {
  colors: Palette;
  scheme: "light" | "dark";
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>(() => loadPrefs().theme);
  const scheme = choice === "system" ? (system === "dark" ? "dark" : "light") : choice;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: scheme === "dark" ? dark : light,
      scheme,
      choice,
      setChoice: (next) => {
        setChoiceState(next);
        savePrefs({ ...loadPrefs(), theme: next });
      },
    }),
    [scheme, choice],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
