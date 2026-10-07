import Constants from "expo-constants";
import { router } from "expo-router";
import { CodeXml, Mail, Sparkles } from "lucide-react-native";
import { Linking } from "react-native";
import { View } from "react-native";
import { t } from "@/i18n";
import { loadPrefs, savePrefs } from "@/theme/prefs";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { OptionList } from "@/ui/fields";
import { LogoMark } from "@/ui/Logo";
import { Notice } from "@/ui/Notice";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

const CONTACT_EMAIL = "sai@levocell.ai";
const REPO_URL = "https://github.com/SaiAkashNeela/pdfamaze-studio";

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
    <Screen inTab>
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

      <View style={{ gap: space.md, marginTop: space.xxl }}>
        <Text variant="title" accessibilityRole="header">
          {t("about.contactTitle")}
        </Text>
        <Text variant="body" tone="muted">
          {t("about.contactBody")}
        </Text>
        <Button
          kind="secondary"
          icon={Mail}
          label={CONTACT_EMAIL}
          accessibilityLabel={t("about.email", { email: CONTACT_EMAIL })}
          onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=PDFamaze`)}
        />
        <Button kind="secondary" icon={CodeXml} label={t("about.github")} accessibilityHint={REPO_URL} onPress={() => void Linking.openURL(REPO_URL)} />
        <Button
          kind="ghost"
          icon={Sparkles}
          label={t("about.welcomeAgain")}
          onPress={() => {
            savePrefs({ ...loadPrefs(), onboarded: false });
            router.replace("/onboarding");
          }}
        />
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
