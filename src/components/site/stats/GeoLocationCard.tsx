import { MapPin, Server } from "lucide-react";
import type { GeoLocationInfo } from "@/lib/analytics";

export function GeoLocationCard({
  geo,
  countryNames,
}: {
  geo: GeoLocationInfo;
  countryNames: Record<string, { name: string; flag: string }>;
}) {
  return (
    <div className="border-border bg-surface-raised mt-6 rounded-xl border p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 grid h-10 w-10 place-items-center rounded-lg">
            <MapPin className="text-accent h-5 w-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              Your Detected Cloudflare Edge Location
            </p>
            <p className="text-muted-foreground text-[12.5px]">
              {geo.city ? `${geo.city}, ` : ""}
              {geo.region ? `${geo.region}, ` : ""}
              {countryNames[geo.country]?.name || geo.country}{" "}
              {countryNames[geo.country]?.flag || "🌐"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[12px]">
          <span className="border-border bg-background inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-muted-foreground">
            <Server className="text-accent h-3.5 w-3.5" />
            PoP: {geo.colo}
          </span>
          <span className="border-border bg-background inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-muted-foreground">
            TZ: {geo.timezone}
          </span>
        </div>
      </div>
    </div>
  );
}
