import type { ReactNode } from "react";

/** Sticky bottom bar for phones and tablets; the desktop sidebar carries the same actions. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-[720px] items-center gap-2.5">{children}</div>
    </div>
  );
}

export function PrimaryButton({ children, disabled, onClick, className = "" }: { children: ReactNode; disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-border-strong bg-surface-raised hover:bg-secondary inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-[14px] font-medium transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}
