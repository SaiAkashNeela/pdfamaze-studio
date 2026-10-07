/**
 * PDFamaze design system, mobile edition.
 * Same "paper & ink" palette as the web app (converted from its OKLCH tokens): warm neutral
 * surfaces, a single vermilion accent, quiet borders instead of shadows, IBM Plex type.
 * Sizes are scaled up for phones and for people who find small text and targets hard.
 */
export type ToolTag = "ORGANIZE" | "OPTIMIZE" | "EDIT" | "CONVERT" | "SECURITY" | "SHARE";

export type Palette = {
  background: string;
  foreground: string;
  surface: string;
  surfaceRaised: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  accentSoft: string;
  destructive: string;
  destructiveSoft: string;
  success: string;
  successSoft: string;
  border: string;
  borderStrong: string;
  input: string;
  tags: Record<ToolTag, string>;
  tagIconForeground: string;
};

export const light: Palette = {
  background: "#faf7f3",
  foreground: "#1c1712",
  surface: "#f3f1ec",
  surfaceRaised: "#ffffff",
  card: "#ffffff",
  primary: "#29231d",
  primaryForeground: "#faf8f4",
  secondary: "#eeebe5",
  muted: "#efece8",
  mutedForeground: "#5f5a53",
  accent: "#c84a27",
  accentForeground: "#fdfcf8",
  accentSoft: "#f8e6df",
  destructive: "#be2f2c",
  destructiveSoft: "#f7e2e0",
  success: "#2a7449",
  successSoft: "#e1efe6",
  border: "#dcd9d3",
  borderStrong: "#bebab3",
  input: "#d7d4ce",
  tags: {
    ORGANIZE: "#1f74bf",
    OPTIMIZE: "#cb5a1a",
    EDIT: "#1c8742",
    CONVERT: "#8156c0",
    SECURITY: "#bc3f53",
    SHARE: "#008892",
  },
  tagIconForeground: "#ffffff",
};

export const dark: Palette = {
  background: "#13110e",
  foreground: "#eae8e3",
  surface: "#1b1815",
  surfaceRaised: "#231f1b",
  card: "#1b1815",
  primary: "#eae8e3",
  primaryForeground: "#161310",
  secondary: "#26221e",
  muted: "#24211e",
  mutedForeground: "#a5a09a",
  accent: "#e16d43",
  accentForeground: "#130e0b",
  accentSoft: "#3a2219",
  destructive: "#dd574e",
  destructiveSoft: "#3a1d1a",
  success: "#63ba8a",
  successSoft: "#17291f",
  border: "#302d2a",
  borderStrong: "#4b4742",
  input: "#3b3733",
  tags: {
    ORGANIZE: "#3a84ca",
    OPTIMIZE: "#d86d38",
    EDIT: "#3b9555",
    CONVERT: "#8f68cb",
    SECURITY: "#c95463",
    SHARE: "#00969f",
  },
  tagIconForeground: "#ffffff",
};

export const fonts = {
  regular: "IBMPlexSans_400Regular",
  medium: "IBMPlexSans_500Medium",
  semibold: "IBMPlexSans_600SemiBold",
  bold: "IBMPlexSans_700Bold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

/** Type scale. Body text is 16pt and grows with the phone's text-size setting. */
export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  title: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.monoMedium, fontSize: 11, lineHeight: 15, letterSpacing: 1.1 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

/** Comfortable touch target. Platform guidance is 44–48; we stay a little above it. */
export const TAP = 52;

/** Cap on system font scaling, so the very largest settings stay readable without breaking layout. */
export const MAX_FONT_SCALE = 1.6;
