import type { Theme } from "./theme-context";

export const THEME_STORAGE_KEY = "pdfamaze.theme";

/**
 * The saved theme, or null. Never throws: browsers that block site storage (e.g. "block all
 * cookies") throw on any localStorage access, and that used to take down every page.
 */
export function readStoredTheme(
  getStorage: () => Storage = () => window.localStorage,
): Theme | null {
  try {
    const stored = getStorage().getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : null;
  } catch {
    return null;
  }
}

/** Inline script: applies the stored theme before first paint (no flash). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
