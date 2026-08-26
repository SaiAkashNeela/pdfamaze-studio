import { Globe2 } from "lucide-react";

interface LocationItem {
  code: string;
  count: number;
  name: string;
  flag: string;
}

export function GeoTrafficChart({
  locations,
  totalVisits,
}: {
  locations: LocationItem[];
  totalVisits: number;
}) {
  return (
    <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Geographic Distribution</h3>
          <p className="text-muted-foreground text-[12px]">
            Detected via Cloudflare edge routing headers
          </p>
        </div>
        <Globe2 className="text-accent h-4 w-4" />
      </div>

      <div className="mt-4 space-y-3">
        {locations.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">No location sessions recorded yet.</p>
        ) : (
          locations.map((loc) => {
            const percent =
              totalVisits > 0 ? Math.round((loc.count / totalVisits) * 100) : 100;

            return (
              <div key={loc.code} className="space-y-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{loc.flag}</span>
                    <span className="font-medium text-foreground">{loc.name}</span>
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {loc.count} ({percent}%)
                  </span>
                </div>
                <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-accent/80 h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${Math.max(8, percent)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
