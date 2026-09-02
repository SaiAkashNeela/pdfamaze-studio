import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

import { getGlobalStatsFromKv, recordEventInKv } from "./lib/server/kv-stats";

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Provide Cloudflare edge geographic telemetry
    if (url.pathname === "/api/geo") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cf = (request as any).cf || {};
      const country = cf.country || request.headers.get("cf-ipcountry") || "GB";
      const city = cf.city || request.headers.get("cf-ipcity") || "London";
      const region = cf.region || request.headers.get("cf-region") || "England";
      const colo = cf.colo || request.headers.get("cf-ray")?.split("-").pop() || "LHR";
      const timezone = cf.timezone || request.headers.get("cf-timezone") || "UTC";

      return new Response(
        JSON.stringify({
          country,
          city,
          region,
          colo,
          timezone,
        }),
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        },
      );
    }

    // Get global aggregate stats from Cloudflare KV
    if (url.pathname === "/api/stats" && request.method === "GET") {
      const stats = await getGlobalStatsFromKv(env);
      return new Response(JSON.stringify(stats), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store, no-cache, must-revalidate",
          "access-control-allow-origin": "*",
        },
      });
    }

    // Track anonymous event in Cloudflare KV
    if (url.pathname === "/api/track" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          type: "tool" | "pageview";
          slug?: string | undefined;
          country?: string | undefined;
          colo?: string | undefined;
        };
        const updated = await recordEventInKv(env, body);
        return new Response(JSON.stringify({ success: true, stats: updated }), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
