const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

/**
 * Production Android builds block the INTERNET permission, so they can't fetch over-the-air updates.
 * This switches expo-updates off in the Android manifest for those builds; the app always runs the
 * bundle it shipped with and updates via Google Play. It only edits the native manifest, so the app
 * config (and the runtime fingerprint) stays the same on every machine and platform.
 */
module.exports = function withOfflineAndroidUpdates(config) {
  return withAndroidManifest(config, (mod) => {
    if (process.env.APP_VARIANT === "production") {
      const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, "expo.modules.updates.ENABLED", "false");
    }
    return mod;
  });
};
