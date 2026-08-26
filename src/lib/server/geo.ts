import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { GeoLocationInfo } from "@/lib/analytics";

export const getGeoTelemetry = createServerFn({ method: "GET" }).handler(
  async (): Promise<GeoLocationInfo> => {
    const request = getRequest();
    if (!request) {
      return { country: "GB", city: "London", region: "England", colo: "LHR", timezone: "Europe/London" };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqAny = request as any;
    const cf = reqAny?.cf || {};
    const country = cf.country || request.headers?.get?.("cf-ipcountry") || "GB";
    const city = cf.city || request.headers?.get?.("cf-ipcity") || "London";
    const region = cf.region || request.headers?.get?.("cf-region") || "England";
    const colo = cf.colo || request.headers?.get?.("cf-ray")?.split("-").pop() || "LHR";
    const timezone = cf.timezone || request.headers?.get?.("cf-timezone") || "Europe/London";

    return { country, city, region, colo, timezone };
  },
);
