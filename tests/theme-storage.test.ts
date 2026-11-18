import { describe, expect, test } from "bun:test";

import { THEME_STORAGE_KEY, readStoredTheme } from "../src/lib/theme-script";

const storageWith = (values: Record<string, string>) =>
  ({ getItem: (k: string) => values[k] ?? null }) as unknown as Storage;

describe("readStoredTheme (REL-001)", () => {
  test("returns null instead of throwing when storage is blocked", () => {
    const blocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    expect(() => readStoredTheme(blocked)).not.toThrow();
    expect(readStoredTheme(blocked)).toBeNull();
  });

  test("returns a valid saved theme", () => {
    expect(readStoredTheme(() => storageWith({ [THEME_STORAGE_KEY]: "dark" }))).toBe("dark");
  });

  test("ignores unknown or missing values", () => {
    expect(readStoredTheme(() => storageWith({ [THEME_STORAGE_KEY]: "neon" }))).toBeNull();
    expect(readStoredTheme(() => storageWith({}))).toBeNull();
  });
});
