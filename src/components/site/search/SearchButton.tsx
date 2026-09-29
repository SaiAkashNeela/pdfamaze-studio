import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

// A failed preload (offline, or a navigation cutting it short) is harmless: opening retries it.
const loadDialog = () => import("./ToolSearchDialog").catch(() => null);
const ToolSearchDialog = lazy(() => import("./ToolSearchDialog").then((m) => ({ default: m.ToolSearchDialog })));

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
}

/** Navbar search trigger. Also opens on ⌘K / Ctrl+K anywhere, and on "/" outside text fields. */
export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mod, setMod] = useState("Ctrl K");
  // Letters typed after ⌘K but before the search code has loaded; handed to the box once it opens.
  const buffer = useRef("");
  const ready = useRef(false);
  const openRef = useRef(false);

  useEffect(() => {
    // Load the search code while the browser is idle, so the first ⌘K never drops keystrokes.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const handle = idle(() => {
      void loadDialog().then((m) => m && setLoaded(true));
    });
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(handle);
  }, []);

  useEffect(() => {
    // Show the shortcut people actually have: ⌘K on Apple devices, Ctrl K elsewhere.
    if (/Mac|iPhone|iPad/i.test(navigator.userAgent)) setMod("⌘K");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const shortcut = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (shortcut || (e.key === "/" && !isTyping(e.target) && !openRef.current)) {
        e.preventDefault();
        openRef.current = true;
        setLoaded(true);
        setOpen(true);
      } else if (openRef.current && !ready.current && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        buffer.current += e.key;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openRef.current = true;
          setLoaded(true);
          setOpen(true);
        }}
        aria-label="Search tools"
        onPointerEnter={() => void loadDialog()}
        onFocus={() => void loadDialog()}
        aria-keyshortcuts="Control+K Meta+K /"
        className="border-border text-muted-foreground hover:text-foreground hover:border-border-strong bg-surface-raised/70 inline-flex h-8 items-center gap-2 rounded-lg border px-2 text-[13px] transition-colors sm:w-56 sm:px-2.5"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:inline">Search tools…</span>
        <kbd className="bg-secondary hidden rounded px-1.5 py-0.5 font-mono text-[10.5px] sm:inline">{mod}</kbd>
      </button>
      {loaded ? (
        <Suspense fallback={null}>
          <ToolSearchDialog
            open={open}
            onReady={() => (ready.current = true)}
            takeTyped={() => {
              const typed = buffer.current;
              buffer.current = "";
              return typed;
            }}
            onClose={() => {
              openRef.current = false;
              setOpen(false);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
