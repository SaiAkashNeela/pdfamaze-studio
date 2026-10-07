/**
 * Tiny on-device preferences store: one JSON file in the app's private documents folder.
 * No account, no cloud sync, nothing leaves the phone.
 */
import { File, Paths } from "expo-file-system";

export type ThemeChoice = "system" | "light" | "dark";

export type Prefs = {
  theme: ThemeChoice;
  /** Has seen the first-run welcome screens. */
  onboarded: boolean;
};

const DEFAULTS: Prefs = { theme: "system", onboarded: false };

function prefsFile() {
  return new File(Paths.document, "prefs.json");
}

export function loadPrefs(): Prefs {
  try {
    const file = prefsFile();
    if (!file.exists) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(file.textSync()) as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    const file = prefsFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience; failing to store one must never break the app.
  }
}
