/** Data mentah satu repo, persis seperti yang dikumpulkan proxy dari GitHub. */
export interface RepoMetrics {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  ownerAvatarUrl: string;
  /** Nama package npm kalau laporan ini diminta lewat nama package. */
  npmPackage: string | null;
  archived: boolean;
  /** Info saja, tidak masuk skor. */
  stars: number;
  forks: number;

  lastCommitAt: string | null;
  latestRelease: { tag: string; publishedAt: string } | null;
  /** Total commit per minggu, 12 minggu terakhir (terlama → terbaru). */
  weeklyCommits: number[] | null;

  openIssues: number | null;
  closedIssues: number | null;
  medianIssueCloseDays: number | null;
  /** Jumlah issue tertutup yang dipakai untuk menghitung median. */
  issueSampleSize: number;

  community: {
    readme: boolean;
    license: boolean;
    licenseName: string | null;
    contributing: boolean;
  };
  activeContributors90d: number | null;

  /** Metrik yang masih dihitung GitHub (endpoint stats membalas 202). */
  pending: Array<"weeklyCommits" | "activeContributors90d">;
  fetchedAt: string;
}

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "NPM_NOT_FOUND"
  | "NPM_NO_REPO"
  | "RATE_LIMITED"
  | "UPSTREAM";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; resetAt?: string };
}
