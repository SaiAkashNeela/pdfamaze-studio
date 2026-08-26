import type { ReactNode } from "react";

/** Shared shell for the reading pages: privacy, terms, support. */
export function DocPage({
  kicker,
  title,
  intro,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-[1180px] px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <header className="max-w-[62ch]">
        <p className="label-xs">{kicker}</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.6vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">{intro}</p>
        {updated ? (
          <p className="text-muted-foreground mt-4 font-mono text-[11.5px]">
            Last updated {updated}
          </p>
        ) : null}
      </header>
      <div className="border-border mt-10 max-w-[68ch] border-t pt-8 pb-4">{children}</div>
    </article>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="text-[16px] font-semibold tracking-[-0.015em]">{heading}</h2>
      <div className="text-muted-foreground mt-2.5 space-y-3 text-[14.5px] leading-[1.65] [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground [&_strong]:font-medium">
        {children}
      </div>
    </section>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="border-border bg-surface text-foreground rounded-[3px] border px-1.5 py-0.5 font-mono text-[12.5px]">
      {children}
    </span>
  );
}
