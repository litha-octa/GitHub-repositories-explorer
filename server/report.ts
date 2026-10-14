import { parseInput } from "../src/lib/parseInput";
import type { RepoMetrics } from "../src/lib/types";
import { ReportError, type GitHubClient } from "./github";
import { resolveNpmPackage } from "./npm";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReportDeps {
  github: GitHubClient;
  fetch?: typeof fetch;
  now?: () => Date;
}

interface IssueItem {
  created_at: string;
  closed_at: string | null;
  pull_request?: unknown;
}

interface ContributorStats {
  weeks: Array<{ w: number; c: number }>;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Kumpulkan semua metrik satu repo. Setiap metrik berasal dari satu endpoint GitHub REST API. */
export async function buildReport(input: string, deps: ReportDeps): Promise<RepoMetrics> {
  const { github } = deps;
  const now = deps.now?.() ?? new Date();

  const parsed = parseInput(input);
  if (parsed.kind === "invalid") {
    throw new ReportError(
      "INVALID_INPUT",
      "Masukkan owner/repo, URL GitHub, atau nama package npm",
      400,
    );
  }
  const ref = parsed.kind === "npm" ? await resolveNpmPackage(parsed.name, deps.fetch) : parsed;

  const repoRes = await github.get(`/repos/${ref.owner}/${ref.repo}`);
  if (repoRes.status === 404) {
    throw new ReportError("NOT_FOUND", `Repo ${ref.owner}/${ref.repo} tidak ditemukan`, 404);
  }
  if (repoRes.status !== 200) {
    throw new ReportError("UPSTREAM", `GitHub membalas ${repoRes.status}`, 502);
  }
  const repo = repoRes.data;
  // Pakai nama kanonik dari GitHub (repo yang di-rename otomatis di-redirect).
  const full: string = repo.full_name;
  const searchIssues = (state: "open" | "closed", perPage: number) =>
    github.get<{ total_count: number; items: IssueItem[] }>(
      `/search/issues?per_page=${perPage}&sort=updated&order=desc&q=${encodeURIComponent(
        `repo:${full} is:issue is:${state}`,
      )}`,
    );

  const [commits, release, activity, openSearch, closedSearch, community, contributors] =
    await Promise.all([
      github.get(`/repos/${full}/commits?per_page=1`), // 409 kalau repo kosong
      github.get(`/repos/${full}/releases/latest`), // 404 kalau belum pernah rilis
      github.getStats<Array<{ total: number }>>(`/repos/${full}/stats/commit_activity`),
      searchIssues("open", 1),
      // Satu panggilan untuk jumlah issue tertutup sekaligus sampel median waktu tutup.
      // Lebih baik dari /issues?state=closed yang ikut memuat PR: di repo aktif,
      // 30 item terakhir bisa hampir semuanya PR sehingga sampel issue tinggal 1–5.
      searchIssues("closed", 50),
      github.get(`/repos/${full}/community/profile`),
      github.getStats<ContributorStats[]>(`/repos/${full}/stats/contributors`),
    ]);

  const closeDurations =
    closedSearch.status === 200 && Array.isArray(closedSearch.data?.items)
      ? closedSearch.data.items
          .filter((issue) => !issue.pull_request && issue.closed_at)
          .map((issue) => (Date.parse(issue.closed_at!) - Date.parse(issue.created_at)) / DAY_MS)
      : [];
  const medianClose = median(closeDurations);

  const cutoff = now.getTime() - 90 * DAY_MS;
  const activeContributors =
    contributors.pending || !Array.isArray(contributors.data)
      ? null
      : contributors.data.filter((c) => c.weeks.some((w) => w.c > 0 && w.w * 1000 >= cutoff))
          .length;

  const files = community.status === 200 ? community.data?.files ?? {} : {};
  const licenseName: string | null =
    repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
      ? repo.license.spdx_id
      : repo.license?.name ?? files.license?.name ?? null;

  const pending: RepoMetrics["pending"] = [];
  if (activity.pending) pending.push("weeklyCommits");
  if (contributors.pending) pending.push("activeContributors90d");

  return {
    fullName: full,
    htmlUrl: repo.html_url,
    description: repo.description ?? null,
    ownerAvatarUrl: repo.owner?.avatar_url ?? "",
    npmPackage: parsed.kind === "npm" ? parsed.name : null,
    archived: Boolean(repo.archived),
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,

    lastCommitAt:
      commits.status === 200 && Array.isArray(commits.data) && commits.data[0]
        ? commits.data[0].commit.committer?.date ?? commits.data[0].commit.author?.date ?? null
        : null,
    latestRelease:
      release.status === 200 && release.data
        ? {
            tag: release.data.tag_name,
            publishedAt: release.data.published_at ?? release.data.created_at,
          }
        : null,
    weeklyCommits:
      !activity.pending && Array.isArray(activity.data)
        ? activity.data.slice(-12).map((week) => week.total)
        : null,

    openIssues: openSearch.status === 200 ? openSearch.data.total_count : null,
    closedIssues: closedSearch.status === 200 ? closedSearch.data.total_count : null,
    medianIssueCloseDays: medianClose === null ? null : Math.round(medianClose * 10) / 10,
    issueSampleSize: closeDurations.length,

    community: {
      readme: Boolean(files.readme),
      license: Boolean(files.license || repo.license),
      licenseName,
      contributing: Boolean(files.contributing),
    },
    activeContributors90d: activeContributors,

    pending,
    fetchedAt: now.toISOString(),
  };
}
