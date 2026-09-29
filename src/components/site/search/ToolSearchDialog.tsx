import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft, Search, X } from "lucide-react";
import { ToolIcon } from "../ToolIcon";
import { searchTools } from "@/lib/tool-search";
import { tools, type Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const POPULAR = tools.filter((t) => t.featured);

function ResultItem({ tool, active, id, onPick, onHover }: { tool: Tool; active: boolean; id: string; onPick: () => void; onHover: () => void }) {
  // Keyboard use goes through the search input (arrow keys + Enter); options take pointer clicks.
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onClick={onPick}
      onKeyDown={(e) => e.key === "Enter" && onPick()}
      onMouseMove={onHover}
      className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", active ? "bg-secondary" : "")}
    >
      <ToolIcon tool={tool} compact className="h-8 w-8 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{tool.name}</span>
        <span className="text-muted-foreground block truncate text-[12.5px]">{tool.summary}</span>
      </span>
      {active ? <CornerDownLeft className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
    </li>
  );
}

/** Quick tool finder (⌘K). Arrow keys move, Enter opens, Esc closes. */
export function ToolSearchDialog({
  open,
  onClose,
  onReady,
  takeTyped,
}: {
  open: boolean;
  onClose: () => void;
  onReady: () => void;
  /** Characters typed while this component was still loading. */
  takeTyped: () => string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => (query.trim() ? searchTools(query, 12) : POPULAR), [query]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const typed = takeTyped();
      if (typed) setQuery(typed);
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, takeTyped]);

  const pick = (tool: Tool | undefined) => {
    if (!tool) return;
    onClose();
    setQuery("");
    void navigate({ to: "/tools/$slug", params: { slug: tool.slug } });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (results.length ? (i + step + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[active]);
    }
  };

  return (
    <dialog
      ref={ref}
      aria-label="Search tools"
      onClose={onClose}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent"
    >
      <button type="button" aria-label="Close search" tabIndex={-1} onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[2px]" />
      <div className="bg-surface-raised text-foreground absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col overflow-hidden shadow-2xl sm:inset-x-auto sm:top-[10vh] sm:left-1/2 sm:max-h-[75vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="border-border flex items-center gap-2.5 border-b px-4">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].slug}` : undefined}
            aria-label="Search tools"
            placeholder="Search tools — try “sign”, “jpg”, “shrink”, “black out”"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="placeholder:text-muted-foreground/80 h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="text-muted-foreground hover:bg-secondary grid h-8 w-8 shrink-0 place-items-center rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          <p className="label-xs px-3 pt-2 pb-1.5">{query.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Popular tools"}</p>
          {results.length ? (
            <ul id={listId} role="listbox" aria-label="Tools">
              {results.map((t, i) => (
                <ResultItem key={t.slug} id={`${listId}-${t.slug}`} tool={t} active={i === active} onPick={() => pick(t)} onHover={() => setActive(i)} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-3 py-8 text-center text-[13.5px]">
              No tool matches “{query}”. Try a simpler word, like “merge”, “sign” or “compress”.
            </p>
          )}
        </div>
        <p className="border-border text-muted-foreground hidden border-t px-4 py-2 text-[11.5px] sm:block">
          <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> to move · <kbd className="font-mono">Enter</kbd> to open · <kbd className="font-mono">Esc</kbd> to close
        </p>
      </div>
    </dialog>
  );
}
