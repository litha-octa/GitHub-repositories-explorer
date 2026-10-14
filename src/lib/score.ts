import { daysBetween, formatAgo, formatDuration } from "./format";
import { SCORE_CONFIG, type ScoreConfig } from "./scoreConfig";
import type { RepoMetrics } from "./types";

export type RepoStatus = "active" | "slowing" | "inactive" | "archived";

export interface ScoreFactor {
  key: "lastCommit" | "issueClose" | "release" | "license";
  label: string;
  weight: number;
  /** 0–1, or null when there is no data (the factor is left out). */
  value: number | null;
  reason: string;
}

export interface HealthReport {
  status: RepoStatus;
  /** 0–100, or null when the repo is archived or no factor could be scored. */
  score: number | null;
  factors: ScoreFactor[];
}

export const STATUS_LABEL: Record<RepoStatus, string> = {
  active: "Active",
  slowing: "Slowing",
  inactive: "Inactive",
  archived: "Archived",
};

function lastCommitFactor(m: RepoMetrics, now: Date, c: ScoreConfig["lastCommit"]): ScoreFactor {
  const base = { key: "lastCommit", label: "Last commit", weight: c.weight } as const;
  if (!m.lastCommitAt) return { ...base, value: 0, reason: "No commits yet" };
  const days = daysBetween(m.lastCommitAt, now);
  const value =
    days < c.fullBelowDays ? 1
    : days < c.halfBelowDays ? 0.5
    : days > c.zeroAboveDays ? 0
    : c.betweenValue;
  return { ...base, value, reason: `Last commit ${formatAgo(days)}` };
}

function issueCloseFactor(m: RepoMetrics, c: ScoreConfig["issueClose"]): ScoreFactor {
  const base = { key: "issueClose", label: "Median time to close an issue", weight: c.weight } as const;
  if (m.medianIssueCloseDays === null) {
    return { ...base, value: null, reason: "No closed issues to measure yet" };
  }
  const days = m.medianIssueCloseDays;
  const value = days < c.fullBelowDays ? 1 : days < c.halfBelowDays ? 0.5 : 0;
  return { ...base, value, reason: `Issues closed in a median of ${formatDuration(days)}` };
}

function releaseFactor(m: RepoMetrics, now: Date, c: ScoreConfig["release"]): ScoreFactor {
  const base = { key: "release", label: "Latest release", weight: c.weight } as const;
  if (!m.latestRelease) return { ...base, value: 0, reason: "Never released" };
  const days = daysBetween(m.latestRelease.publishedAt, now);
  return {
    ...base,
    value: days <= c.fullWithinDays ? 1 : 0,
    reason: `Released ${m.latestRelease.tag} ${formatAgo(days)}`,
  };
}

function licenseFactor(m: RepoMetrics, c: ScoreConfig["license"]): ScoreFactor {
  const base = { key: "license", label: "License", weight: c.weight } as const;
  return m.community.license
    ? {
        ...base,
        value: 1,
        reason: m.community.licenseName ? `${m.community.licenseName} license` : "Has a license",
      }
    : { ...base, value: 0, reason: "No license" };
}

/** Compute the health score and its reasons. Pure function: the result depends only on its arguments. */
export function scoreRepo(
  metrics: RepoMetrics,
  now: Date = new Date(),
  config: ScoreConfig = SCORE_CONFIG,
): HealthReport {
  if (metrics.archived) return { status: "archived", score: null, factors: [] };

  const factors = [
    lastCommitFactor(metrics, now, config.lastCommit),
    issueCloseFactor(metrics, config.issueClose),
    releaseFactor(metrics, now, config.release),
    licenseFactor(metrics, config.license),
  ];

  const counted = factors.filter((f) => f.value !== null);
  const maxPoints = counted.reduce((sum, f) => sum + f.weight, 0);
  const points = counted.reduce((sum, f) => sum + f.weight * (f.value ?? 0), 0);
  const score = maxPoints > 0 ? Math.round((points * 100) / maxPoints) : null;

  const commitDays = metrics.lastCommitAt ? daysBetween(metrics.lastCommitAt, now) : Infinity;
  const s = config.status;
  const status: RepoStatus =
    commitDays > s.inactiveAfterDays || score === null ? "inactive"
    : score >= s.activeMinScore ? "active"
    : score >= s.slowingMinScore ? "slowing"
    : "inactive";

  return { status, score, factors };
}

/** One-line summary, e.g. "Score 72 — Last commit 3 days ago ✓, …". */
export function summarize(report: HealthReport): string {
  if (report.status === "archived") return "Archived — this repo no longer accepts changes";
  const parts = report.factors
    .filter((f) => f.value !== null)
    .map((f) => `${f.reason} ${f.value === 1 ? "✓" : f.value === 0 ? "✗" : "~"}`);
  return `Score ${report.score ?? "–"} — ${parts.join(", ")}`;
}
