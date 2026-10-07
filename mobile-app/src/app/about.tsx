import Constants from "expo-constants";
import { View } from "react-native";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Card } from "@/ui/Card";
import { OptionList } from "@/ui/fields";
import { LogoMark } from "@/ui/Logo";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

function Numbered({ n, text }: { n: number; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
        <Text variant="bodyStrong" tone="inverse">
          {n}
        </Text>
      </View>
      <Text variant="body" style={{ flex: 1, paddingTop: 2 }}>
        {text}
      </Text>
    </View>
  );
}

export default function About() {
  const { choice, setChoice } = useTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <Screen back>
      <View style={{ gap: space.md, marginTop: space.sm }}>
        <LogoMark size={52} />
        <Text variant="display" accessibilityRole="header">
          {t("about.title")}
        </Text>
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Text variant="title" accessibilityRole="header">
          {t("about.howTitle")}
        </Text>
        <Card style={{ gap: space.lg }}>
          <Numbered n={1} text={t("about.how1")} />
          <Numbered n={2} text={t("about.how2")} />
          <Numbered n={3} text={t("about.how3")} />
        </Card>
      </View>

      <View style={{ gap: space.md, marginTop: space.xxl }}>
        <Text variant="title" accessibilityRole="header">
          {t("about.privacyTitle")}
        </Text>
        <Notice kind="privacy" body={t("about.privacy1")} />
        <Notice kind="privacy" body={t("about.privacy2")} />
        <Notice kind="privacy" body={t("about.privacy3")} />
      </View>

      <View style={{ gap: space.md, marginTop: space.xxl }}>
        <OptionList
          label={t("about.appearance")}
          options={[
            { value: "system", label: t("about.themeSystem") },
            { value: "light", label: t("about.themeLight") },
            { value: "dark", label: t("about.themeDark") },
          ]}
          value={choice}
          onChange={(v) => setChoice(v as typeof choice)}
        />
      </View>

      <View style={{ gap: space.md, marginTop: space.xxl }}>
        <Text variant="title" accessibilityRole="header">
          {t("about.textSizeTitle")}
        </Text>
        <Text variant="body" tone="muted">
          {t("about.textSizeBody")}
        </Text>
      </View>

      <View style={{ gap: space.xs, marginTop: space.xxl, alignItems: "center" }}>
        <Text variant="small" tone="muted" center>
          {t("about.openSource")}
        </Text>
        <Text variant="small" tone="muted" center>
          {t("about.version", { version })}
        </Text>
      </View>
    </Screen>
  );
}
