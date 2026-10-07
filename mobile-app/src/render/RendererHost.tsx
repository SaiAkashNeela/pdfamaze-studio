/**
 * Mount point for the offline page renderer: a 1×1, invisible WebView that loads one bundled
 * HTML file (pdf.js) and nothing else. It exists only while a job is drawing pages.
 */
import { Asset } from "expo-asset";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { attachHost, crashed, receive } from "./client";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RENDERER_HTML = require("../../assets/renderer/pdf-renderer.html") as number;

let assetUri: Promise<string> | null = null;

/** Copies the bundled HTML to a local file once, and reuses it. */
function rendererUri(): Promise<string> {
  if (!assetUri) {
    assetUri = Asset.fromModule(RENDERER_HTML)
      .downloadAsync()
      .then((asset) => asset.localUri ?? asset.uri)
      .catch((e: unknown) => {
        assetUri = null;
        throw e;
      });
  }
  return assetUri;
}

function directoryOf(uri: string) {
  return uri.slice(0, uri.lastIndexOf("/") + 1);
}

export function RendererHost() {
  const [mounted, setMounted] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const webview = useRef<WebView>(null);

  useEffect(() => {
    attachHost({
      setMounted: (next) => {
        setMounted(next);
        if (next) void rendererUri().then(setUri, () => crashed());
      },
      send: (message) => webview.current?.postMessage(message),
    });
    return () => attachHost(null);
  }, []);

  if (!mounted || !uri) return null;

  return (
    <View style={styles.hidden} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <WebView
        ref={webview}
        source={{ uri }}
        originWhitelist={["file://*", "http://*", "https://*"]}
        allowingReadAccessToURL={directoryOf(uri)}
        allowFileAccess
        javaScriptEnabled
        // Never navigate anywhere else; the renderer page is the only thing this view may load.
        onShouldStartLoadWithRequest={(request) => request.url === uri || request.url.startsWith("about:")}
        onMessage={(event) => receive(event.nativeEvent.data)}
        onContentProcessDidTerminate={crashed}
        onRenderProcessGone={crashed}
        cacheEnabled={false}
        incognito
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0, left: -10, top: -10 },
});
