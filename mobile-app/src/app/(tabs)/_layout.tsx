/**
 * Bottom bar with three big, labelled tabs: Tools, Scan and Help.
 * Tool screens open on top of the tabs, so inside a tool the bar steps aside and the
 * tool's main button owns the bottom of the screen.
 */
import { Camera, CircleQuestionMark, LayoutGrid } from "lucide-react-native";
import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: "below-icon",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.tools"),
          tabBarAccessibilityLabel: t("tabs.tools"),
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t("tabs.scan"),
          tabBarAccessibilityLabel: t("tabs.scanHint"),
          tabBarIcon: ({ color }) => <Camera size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: t("tabs.help"),
          tabBarAccessibilityLabel: t("tabs.help"),
          tabBarIcon: ({ color }) => <CircleQuestionMark size={24} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
