import type { RepoMetrics } from "../lib/types";

export const NOW = new Date("2026-10-15T00:00:00Z");

export function daysAgo(days: number, from: Date = NOW): string {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** A healthy repo: every factor scores full. Override the fields under test. */
export function makeMetrics(overrides: Partial<RepoMetrics> = {}): RepoMetrics {
  return {
    fullName: "pmndrs/zustand",
    htmlUrl: "https://github.com/pmndrs/zustand",
    description: "Bear necessities for state management in React",
    ownerAvatarUrl: "",
    npmPackage: null,
    archived: false,
    stars: 50000,
    forks: 1500,
    lastCommitAt: daysAgo(3),
    latestRelease: { tag: "v5.0.0", publishedAt: daysAgo(60) },
    weeklyCommits: [1, 2, 3, 0, 4, 5, 1, 0, 2, 3, 4, 6],
    openIssues: 10,
    closedIssues: 700,
    medianIssueCloseDays: 2,
    issueSampleSize: 50,
    community: { readme: true, license: true, licenseName: "MIT", contributing: true },
    activeContributors90d: 8,
    pending: [],
    fetchedAt: NOW.toISOString(),
    ...overrides,
  };
}
