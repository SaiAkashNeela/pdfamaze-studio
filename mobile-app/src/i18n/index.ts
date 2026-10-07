/**
 * Minimal i18n. `t("home.title")` looks a dot-path up in the active language, falls back to
 * English, then to the provided default. `{name}` placeholders are filled from `vars`.
 */
import { getLocales } from "expo-localization";
import { en, type Strings } from "./en";

/** Register translations here, keyed by language code. */
const LANGUAGES: Record<string, Partial<Strings> & Record<string, unknown>> = { en };

function pickLanguage(): string {
  try {
    const code = getLocales()[0]?.languageCode ?? "en";
    return code in LANGUAGES ? code : "en";
  } catch {
    return "en";
  }
}

const active = LANGUAGES[pickLanguage()] ?? en;

function lookup(table: unknown, path: string): string | undefined {
  let node: unknown = table;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === "string" ? node : undefined;
}

export type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function t(path: string, vars?: Vars, fallback?: string): string {
  const text = lookup(active, path) ?? lookup(en, path) ?? fallback ?? path;
  return fill(text, vars);
}

/** Translatable text that ships with an English default, such as a tool's name. */
export function tx(path: string, english: string, vars?: Vars): string {
  return t(path, vars, english);
}
