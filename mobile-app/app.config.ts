import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json holds the config; this only adds what differs per build.
 * Production Android builds drop the INTERNET permission entirely, so the OS itself guarantees
 * PDFamaze can't send anything anywhere, plus two permissions libraries add that the app never
 * uses (drawing over other apps, checking network state). Development and preview builds keep
 * them so they can reach the Metro dev server and show its overlay.
 * With no network, production Android can't fetch over-the-air updates either; see
 * plugins/with-offline-android-updates.js. iOS gets OTA updates from EAS Update.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const production = process.env.APP_VARIANT === "production";
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      blockedPermissions: production
        ? ["android.permission.INTERNET", "android.permission.SYSTEM_ALERT_WINDOW", "android.permission.ACCESS_NETWORK_STATE"]
        : [],
    },
  };
};
