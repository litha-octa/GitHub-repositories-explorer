import type { ApiErrorBody, RepoMetrics } from "../src/lib/types";
import { createGitHubClient, ReportError, type GitHubClientOptions } from "./github";
import { buildReport } from "./report";

const SIX_HOURS = 6 * 60 * 60;

export interface HandlerOptions extends GitHubClientOptions {
  now?: () => Date;
}

// Cache di memori selama instance function masih hangat; CDN Netlify menangani sisanya.
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
    // Browser simpan sebentar; CDN Netlify yang memegang cache panjang.
    "Cache-Control": "public, max-age=300",
    "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${seconds}, stale-while-revalidate=3600`,
    "Netlify-Vary": "query=q",
  };
}

/** GET /api/report?q=<owner/repo | URL GitHub | nama package npm> */
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
    // Data stats yang belum siap jangan di-cache lama, supaya request berikutnya melengkapinya.
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
      error: { code: "UPSTREAM", message: "Gagal mengambil data dari GitHub" },
    };
    return json(body, 502, { "Cache-Control": "no-store" });
  }
}
