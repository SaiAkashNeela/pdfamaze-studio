/**
 * PDFamaze mark: a sheet of paper whose lower half has been re-cut into three
 * bands — the "operation" the product performs — with one accent band.
 * Drawn in currentColor so it inherits the surrounding text colour.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      strokeLinecap="square"
    >
      <path
        d="M4.5 2.5h9.2L19.5 8v13.5h-15z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="miter"
      />
      <path d="M13.4 2.8V8h5.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.6 12.4h8.8" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
      <path d="M7.6 15.5h8.8" stroke="var(--color-accent)" strokeWidth="1.6" />
      <path d="M7.6 18.6h5.2" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[15px] font-semibold tracking-[-0.02em] ${className}`}>
      PDF<span className="text-muted-foreground font-normal">amaze</span>
    </span>
  );
}
