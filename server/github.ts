import type { ApiErrorCode } from "../src/lib/types";

/** An error that already carries the code & HTTP status to send to the browser. */
export class ReportError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public resetAt?: string,
  ) {
    super(message);
  }
}

export interface GitHubResponse<T = unknown> {
  status: number;
  data: T;
}

export type StatsResult<T> = { pending: true } | { pending: false; data: T | null };

export interface GitHubClientOptions {
  token?: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Delays before retrying a stats endpoint that returned 202. */
  statsRetryDelays?: number[];
}

const API = "https://api.github.com";
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createGitHubClient({
  token,
  fetch: fetchImpl = fetch,
  sleep = defaultSleep,
  // About 4 seconds in total: enough for most repos, and still under the Netlify Function time limit.
  statsRetryDelays = [1500, 2500],
}: GitHubClientOptions = {}) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RepoCheckup",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  async function get<T = any>(path: string): Promise<GitHubResponse<T>> {
    const res = await fetchImpl(`${API}${path}`, { headers });

    const limited =
      (res.status === 403 || res.status === 429) &&
      (res.headers.get("x-ratelimit-remaining") === "0" || res.headers.has("retry-after"));
    if (limited) {
      const reset = res.headers.get("x-ratelimit-reset");
      throw new ReportError(
        "RATE_LIMITED",
        "GitHub API rate limit reached",
        429,
        reset ? new Date(Number(reset) * 1000).toISOString() : undefined,
      );
    }
    if (res.status >= 500) {
      throw new ReportError("UPSTREAM", `GitHub responded with ${res.status}`, 502);
    }

    const data = res.status === 202 || res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data: data as T };
  }

  /**
   * The /stats/* endpoints return 202 while GitHub is still computing in the background.
   * Retry a few times; if it is still 202, report the metric as "pending".
   */
  async function getStats<T = any>(path: string): Promise<StatsResult<T>> {
    for (let attempt = 0; ; attempt++) {
      const res = await get<T>(path);
      if (res.status !== 202) {
        return { pending: false, data: res.status === 200 ? res.data : null };
      }
      if (attempt >= statsRetryDelays.length) return { pending: true };
      await sleep(statsRetryDelays[attempt]);
    }
  }

  return { get, getStats };
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;
