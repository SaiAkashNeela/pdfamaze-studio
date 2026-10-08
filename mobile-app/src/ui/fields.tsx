/**
 * Option controls, built for big fingers and tired eyes:
 * choices are large radio cards (never tiny dropdowns), numbers get − and + buttons beside the
 * slider, toggles are whole-row targets, and every control has a visible label.
 */
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { Check, Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { t } from "@/i18n";
import type { Field } from "@/tools/types";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, MAX_FONT_SCALE, radius, space, TAP } from "@/theme/tokens";
import { Text } from "./Text";

type Value = string | number | boolean;

const tick = () => void Haptics.selectionAsync().catch(() => undefined);

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <View style={{ gap: 2, marginBottom: space.sm }}>
      <Text variant="bodyStrong">{text}</Text>
      {hint ? (
        <Text variant="small" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ choices */

export function OptionList({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label text={label} hint={hint} />
      <View style={{ gap: space.sm }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={o.label}
              onPress={() => {
                tick();
                onChange(o.value);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? colors.accentSoft : colors.card,
                  borderColor: selected ? colors.accent : colors.border,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? colors.accent : colors.borderStrong, backgroundColor: selected ? colors.accent : "transparent" },
                ]}
              >
                {selected ? <Check size={14} color={colors.accentForeground} strokeWidth={3} /> : null}
              </View>
              <Text variant={selected ? "bodyStrong" : "body"} style={{ flex: 1 }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A 3×3 picture of a page: tap the spot where something should go. */
export function PositionGrid({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  const cells = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <View>
      <Label text={label} hint={t(`position.${value}`)} />
      <View style={[styles.page, { backgroundColor: colors.card, borderColor: colors.borderStrong }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.gridRow}>
            {cells.slice(row * 3, row * 3 + 3).map((cell) => {
              const selected = cell === value;
              return (
                <Pressable
                  key={cell}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={t(`position.${cell}`)}
                  onPress={() => {
                    tick();
                    onChange(cell);
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border },
                    pressed && !selected && { backgroundColor: colors.muted },
                  ]}
                >
                  {selected ? (
                    <Check size={18} color={colors.accentForeground} strokeWidth={3} />
                  ) : (
                    <View style={[styles.dot, { backgroundColor: colors.borderStrong }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Two or three short choices side by side, for compact screens like Scan. */
export function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label text={label} />
      <View style={[styles.segments, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={o.label}
              onPress={() => {
                tick();
                onChange(o.value);
              }}
              style={[styles.segment, selected && { backgroundColor: colors.card, borderColor: colors.borderStrong }]}
            >
              <Text variant={selected ? "bodyStrong" : "body"} tone={selected ? "default" : "muted"} center numberOfLines={2}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ numbers */

function formatNumber(n: number, step: number) {
  const decimals = step < 1 ? (String(step).split(".")[1]?.length ?? 1) : 0;
  return n.toFixed(decimals);
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  const shown = `${formatNumber(value, step)}${unit ?? ""}`;
  const bump = (dir: 1 | -1) => {
    const next = clamp(value + dir * step);
    if (next !== value) {
      tick();
      onChange(next);
    }
  };
  const roundButton = (dir: 1 | -1) => {
    const disabled = dir < 0 ? value <= min : value >= max;
    const Icon = dir < 0 ? Minus : Plus;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${dir < 0 ? t("fields.decrease") : t("fields.increase")}: ${label}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => bump(dir)}
        style={({ pressed }) => [
          styles.stepButton,
          { borderColor: colors.borderStrong, backgroundColor: colors.card },
          disabled && { opacity: 0.35 },
          pressed && { backgroundColor: colors.muted },
        ]}
      >
        <Icon size={20} color={colors.foreground} strokeWidth={2.4} />
      </Pressable>
    );
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: shown }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === "increment" ? 1 : -1)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Label text={label} hint={hint} />
        </View>
        <Text variant="heading" style={{ marginBottom: space.sm, fontVariant: ["tabular-nums"] }}>
          {shown}
        </Text>
      </View>
      <View style={styles.stepRow}>
        {roundButton(-1)}
        <Slider
          style={{ flex: 1, height: 44 }}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={(v) => onChange(clamp(v))}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={Platform.OS === "android" ? colors.accent : undefined}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
        {roundButton(1)}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ toggles */

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={() => {
        tick();
        onChange(!value);
      }}
      style={({ pressed }) => [styles.toggle, { backgroundColor: pressed ? colors.surface : colors.card, borderColor: value ? colors.accent : colors.border }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="small" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.input }}
        thumbColor={Platform.OS === "android" ? colors.card : undefined}
        ios_backgroundColor={colors.input}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

/* --------------------------------------------------------------------- text */

export function TextField({
  label,
  hint,
  value,
  placeholder,
  onChange,
  multiline,
  rows = 3,
  secure,
  pageNumbers,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  secure?: boolean;
  /** Page lists: offer a keyboard with numbers, commas and dashes. */
  pageNumbers?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  return (
    <View>
      <Label text={label} hint={hint} />
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: focused ? colors.accent : colors.borderStrong }]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline={multiline}
          numberOfLines={multiline ? rows : 1}
          secureTextEntry={secure && !reveal}
          autoCapitalize={secure || pageNumbers ? "none" : "sentences"}
          autoCorrect={!secure && !pageNumbers}
          keyboardType={pageNumbers ? (Platform.OS === "ios" ? "numbers-and-punctuation" : "default") : "default"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[styles.input, { color: colors.foreground }, multiline && { minHeight: 26 * rows + space.lg, textAlignVertical: "top", paddingTop: space.md }]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reveal ? t("fields.passwordHide") : t("fields.passwordShow")}
            onPress={() => setReveal((r) => !r)}
            style={styles.reveal}
          >
            <Text variant="bodyStrong" tone="accent">
              {reveal ? t("common.hide") : t("common.show")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------- colour */

const SWATCHES = [
  { hex: "#1c1712", name: "Black" },
  { hex: "#1f3a8a", name: "Dark blue" },
  { hex: "#c84a27", name: "Red-orange" },
  { hex: "#be2f2c", name: "Red" },
  { hex: "#1c8742", name: "Green" },
  { hex: "#8156c0", name: "Purple" },
  { hex: "#8a8580", name: "Grey" },
  { hex: "#d3d3d3", name: "Light grey" },
];

export function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  const list = SWATCHES.some((s) => s.hex.toLowerCase() === value.toLowerCase()) ? SWATCHES : [{ hex: value, name: value }, ...SWATCHES];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label text={label} hint={hint} />
      <View style={styles.swatches}>
        {list.map((s) => {
          const selected = s.hex.toLowerCase() === value.toLowerCase();
          return (
            <Pressable
              key={s.hex}
              accessibilityRole="radio"
              accessibilityLabel={s.name}
              accessibilityState={{ checked: selected }}
              onPress={() => {
                tick();
                onChange(s.hex);
              }}
              style={[styles.swatch, { borderColor: selected ? colors.foreground : colors.border, borderWidth: selected ? 3 : 1 }]}
            >
              <View style={[styles.swatchFill, { backgroundColor: s.hex }]}>
                {selected ? <Check size={20} color={isLight(s.hex) ? "#1c1712" : "#ffffff"} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

/* --------------------------------------------------------------- dispatcher */

const PAGE_FIELDS = new Set(["pages", "ranges", "order"]);

/** Draws the right control for a tool option. */
export function FieldControl({ field, value, onChange }: { field: Field; value: Value; onChange: (v: Value) => void }) {
  switch (field.type) {
    case "select": {
      const isGrid = field.options.length === 9 && field.options.every((o, i) => o.value === String(i + 1));
      if (isGrid) return <PositionGrid label={field.label} value={String(value)} onChange={onChange} />;
      return <OptionList label={field.label} hint={field.hint} options={field.options} value={String(value)} onChange={onChange} />;
    }
    case "range":
      return (
        <Stepper
          label={field.label}
          hint={field.hint}
          value={Number(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          unit={field.unit}
          onChange={onChange}
        />
      );
    case "switch":
      return <ToggleRow label={field.label} hint={field.hint} value={Boolean(value)} onChange={onChange} />;
    case "color":
      return <ColorField label={field.label} hint={field.hint} value={String(value)} onChange={onChange} />;
    case "password":
      return <TextField label={field.label} hint={field.hint} value={String(value)} onChange={onChange} secure />;
    case "textarea":
      return (
        <TextField
          label={field.label}
          hint={field.hint}
          value={String(value)}
          placeholder={field.placeholder}
          onChange={onChange}
          multiline
          rows={field.rows}
        />
      );
    case "text":
      return (
        <TextField
          label={field.label}
          hint={field.hint}
          value={String(value)}
          placeholder={field.placeholder}
          onChange={onChange}
          pageNumbers={PAGE_FIELDS.has(field.name)}
        />
      );
  }
}

const styles = StyleSheet.create({
  option: {
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  segments: { flexDirection: "row", borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  page: {
    alignSelf: "flex-start",
    width: 180,
    aspectRatio: 1 / 1.3,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: space.sm,
    gap: space.sm,
  },
  gridRow: { flex: 1, flexDirection: "row", gap: space.sm },
  cell: { flex: 1, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", minHeight: 44 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  stepButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  toggle: {
    minHeight: TAP,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: radius.md },
  input: { flex: 1, minHeight: TAP, fontFamily: fonts.regular, fontSize: 16, paddingHorizontal: space.md + 2 },
  reveal: { minHeight: TAP, paddingHorizontal: space.lg, justifyContent: "center" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  swatch: { width: 44, height: 44, borderRadius: 22, padding: 3 },
  swatchFill: { flex: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
