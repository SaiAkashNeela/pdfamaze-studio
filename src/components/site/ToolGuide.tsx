import { howToSteps, toolFaq } from "@/lib/seo";
import type { Tool } from "@/lib/tools";

/** Visible how-to and FAQ, mirroring the page's HowTo and FAQPage structured data. */
export function ToolGuide({ tool }: { tool: Tool }) {
  const steps = howToSteps(tool).map((s) => s.replace(/^\d\.\s*/, ""));
  return (
    <section className="border-border mt-8 grid gap-10 border-t pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">About {tool.name}</h2>
        <p className="text-muted-foreground mt-3 text-[14px] leading-relaxed">{tool.about}</p>
        <h2 className="mt-8 text-[18px] font-semibold tracking-[-0.02em]">How to use {tool.name}</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-[14px] leading-relaxed">
              <span className="bg-secondary text-foreground grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11.5px]">
                {i + 1}
              </span>
              <span className="text-muted-foreground pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Questions</h2>
        <dl className="divide-border border-border mt-4 divide-y border-y">
          {toolFaq(tool).map((f) => (
            <div key={f.q} className="py-3.5">
              <dt className="text-[14px] font-medium">{f.q}</dt>
              <dd className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
