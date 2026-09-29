import { useMemo, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { ToolRow } from "../ToolRow";
import { searchTools } from "@/lib/tool-search";
import { tools } from "@/lib/tools";

/** Search box that swaps the category listing for ranked results while there's a query. */
export function ToolFinder({ query, onQuery, children }: { query: string; onQuery: (q: string) => void; children: ReactNode }) {
  const results = useMemo(() => searchTools(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <div>
      <div className="mx-auto max-w-[640px]">
        <label className="border-border-strong bg-surface-raised focus-within:border-accent focus-within:ring-accent/20 flex h-12 items-center gap-2.5 rounded-xl border px-4 shadow-sm transition-shadow focus-within:ring-4">
          <Search className="text-muted-foreground h-[18px] w-[18px] shrink-0" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={`Search ${tools.length} tools — “sign”, “jpg”, “compress”, “black out”…`}
            aria-label="Search tools"
            className="placeholder:text-muted-foreground/80 h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          {searching ? (
            <button type="button" onClick={() => onQuery("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground grid h-8 w-8 place-items-center rounded-md">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </div>

      {searching ? (
        <section aria-live="polite" aria-label="Search results" className="mt-8">
          <p className="text-muted-foreground text-[13px]">
            {results.length ? `${results.length} tool${results.length === 1 ? "" : "s"} for “${query.trim()}”` : `No tools match “${query.trim()}”.`}
          </p>
          {results.length ? (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((t) => (
                <ToolRow key={t.slug} tool={t} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-[13.5px]">
              Try a simpler word like “merge”, “sign”, “split” or “convert”, or{" "}
              <button type="button" onClick={() => onQuery("")} className="text-foreground underline underline-offset-4">
                browse every tool
              </button>
              .
            </p>
          )}
        </section>
      ) : (
        children
      )}
    </div>
  );
}
