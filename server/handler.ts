import type { ApiErrorBody, RepoMetrics } from "../src/lib/types";
import { createGitHubClient, ReportError, type GitHubClientOptions } from "./github";
import { buildReport } from "./report";

const SIX_HOURS = 6 * 60 * 60;

export interface HandlerOptions extends GitHubClientOptions {
  now?: () => Date;
}

// In-memory cache while the function instance stays warm; the Netlify CDN handles the rest.
const memoryCache = new Map<string, { expires: number; body: RepoMetrics }>();

export function clearMemoryCache() {
  memoryCache.clear();
}

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function cacheHeaders(seconds: number): Record<string, string> {
  return {
    // The browser keeps it briefly; the Netlify CDN holds the long-lived cache.
    "Cache-Control": "public, max-age=300",
    "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${seconds}, stale-while-revalidate=3600`,
    "Netlify-Vary": "query=q",
  };
}

/** GET /api/report?q=<owner/repo | GitHub URL | npm package name> */
export async function handleReportRequest(
  req: Request,
  options: HandlerOptions = {},
): Promise<Response> {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const key = q.toLowerCase();
  const now = options.now ?? (() => new Date());

  const cached = memoryCache.get(key);
  if (cached && cached.expires > now().getTime()) {
    return json(cached.body, 200, { ...cacheHeaders(SIX_HOURS), "X-Cache": "HIT" });
  }

  try {
    const report = await buildReport(q, {
      github: createGitHubClient(options),
      fetch: options.fetch,
      now,
    });
    // Do not cache incomplete stats for long, so the next request can fill them in.
    if (report.pending.length > 0) {
      return json(report, 200, { "Cache-Control": "no-store" });
    }
    memoryCache.set(key, { expires: now().getTime() + SIX_HOURS * 1000, body: report });
    return json(report, 200, cacheHeaders(SIX_HOURS));
  } catch (err) {
    if (err instanceof ReportError) {
      const body: ApiErrorBody = {
        error: { code: err.code, message: err.message, resetAt: err.resetAt },
      };
      const cacheable = err.code === "NOT_FOUND" || err.code.startsWith("NPM_");
      return json(body, err.status, cacheable ? cacheHeaders(60 * 60) : { "Cache-Control": "no-store" });
    }
    console.error(err);
    const body: ApiErrorBody = {
      error: { code: "UPSTREAM", message: "Failed to fetch data from GitHub" },
    };
    return json(body, 502, { "Cache-Control": "no-store" });
  }
}
