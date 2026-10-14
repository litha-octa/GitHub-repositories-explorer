import { queryOptions } from "@tanstack/react-query";
import type { ApiErrorBody, ApiErrorCode, RepoMetrics } from "./lib/types";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode | "NETWORK",
    message: string,
    public resetAt?: string,
  ) {
    super(message);
  }
}

export async function fetchReport(input: string, signal?: AbortSignal): Promise<RepoMetrics> {
  const url = new URL("/api/report", window.location.origin);
  url.searchParams.set("q", input);

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError("NETWORK", "Tidak bisa terhubung ke server");
  }

  const body = (await res.json().catch(() => null)) as RepoMetrics | ApiErrorBody | null;
  if (!res.ok || !body || "error" in body) {
    const error = body && "error" in body ? body.error : null;
    throw new ApiError(
      error?.code ?? "UPSTREAM",
      error?.message ?? `Server membalas ${res.status}`,
      error?.resetAt,
    );
  }
  return body;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const PENDING_REFETCH_MS = 5000;
const MAX_PENDING_REFETCHES = 4;

export function reportQuery(input: string) {
  return queryOptions({
    queryKey: ["report", input.trim().toLowerCase()],
    queryFn: ({ signal }) => fetchReport(input, signal),
    staleTime: SIX_HOURS,
    // Error yang jelas (404, rate limit, input salah) tidak perlu dicoba ulang.
    retry: (count, err) =>
      err instanceof ApiError && (err.code === "UPSTREAM" || err.code === "NETWORK") && count < 1,
    // Kalau GitHub masih menghitung statistik (202), ambil ulang sebentar lagi.
    refetchInterval: (query) =>
      query.state.data?.pending.length && query.state.dataUpdateCount <= MAX_PENDING_REFETCHES
        ? PENDING_REFETCH_MS
        : false,
  });
}
