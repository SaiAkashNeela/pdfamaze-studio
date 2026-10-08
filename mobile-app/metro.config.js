// Bundle the offline page renderer (assets/renderer/pdf-renderer.html) as an app asset.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("html");

module.exports = config;
