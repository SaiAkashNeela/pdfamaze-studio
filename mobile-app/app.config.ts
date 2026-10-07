import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json holds the config; this only adds what differs per build.
 * Production Android builds drop the INTERNET permission entirely, so the OS itself guarantees
 * PDFamaze can't send anything anywhere. Development and preview builds keep it so they can
 * reach the Metro dev server.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const production = process.env.APP_VARIANT === "production";
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      blockedPermissions: production ? ["android.permission.INTERNET"] : [],
    },
  };
};
