import type { ApiErrorCode } from "../src/lib/types";

/** Error yang sudah punya kode & status HTTP untuk dikirim ke browser. */
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
  /** Jeda sebelum mencoba ulang endpoint stats yang membalas 202. */
  statsRetryDelays?: number[];
}

const API = "https://api.github.com";
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createGitHubClient({
  token,
  fetch: fetchImpl = fetch,
  sleep = defaultSleep,
  // Total ±4 detik: cukup untuk kebanyakan repo, tetap di bawah batas waktu Netlify Function.
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
        "Batas request GitHub API tercapai",
        429,
        reset ? new Date(Number(reset) * 1000).toISOString() : undefined,
      );
    }
    if (res.status >= 500) {
      throw new ReportError("UPSTREAM", `GitHub membalas ${res.status}`, 502);
    }

    const data = res.status === 202 || res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data: data as T };
  }

  /**
   * Endpoint /stats/* membalas 202 selama GitHub masih menghitung di belakang layar.
   * Coba ulang beberapa kali; kalau masih 202, laporkan sebagai "pending".
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
