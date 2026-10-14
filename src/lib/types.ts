/** Raw data for one repo, exactly as the proxy collected it from GitHub. */
export interface RepoMetrics {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  ownerAvatarUrl: string;
  /** The npm package name, when the report was requested by package name. */
  npmPackage: string | null;
  archived: boolean;
  /** For reference only; not part of the score. */
  stars: number;
  forks: number;

  lastCommitAt: string | null;
  latestRelease: { tag: string; publishedAt: string } | null;
  /** Total commits per week over the last 12 weeks (oldest → newest). */
  weeklyCommits: number[] | null;

  openIssues: number | null;
  closedIssues: number | null;
  medianIssueCloseDays: number | null;
  /** Number of closed issues used to compute the median. */
  issueSampleSize: number;

  community: {
    readme: boolean;
    license: boolean;
    licenseName: string | null;
    contributing: boolean;
  };
  activeContributors90d: number | null;

  /** Metrics GitHub is still computing (the stats endpoint returned 202). */
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
