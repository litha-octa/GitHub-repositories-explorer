import { daysBetween, formatAgo, formatDuration } from "./format";
import { SCORE_CONFIG, type ScoreConfig } from "./scoreConfig";
import type { RepoMetrics } from "./types";

export type RepoStatus = "active" | "slowing" | "inactive" | "archived";

export interface ScoreFactor {
  key: "lastCommit" | "issueClose" | "release" | "license";
  label: string;
  weight: number;
  /** 0–1, atau null kalau datanya tidak ada (faktor tidak ikut dihitung). */
  value: number | null;
  reason: string;
}

export interface HealthReport {
  status: RepoStatus;
  /** 0–100, null kalau repo diarsipkan atau tidak ada faktor yang bisa dihitung. */
  score: number | null;
  factors: ScoreFactor[];
}

export const STATUS_LABEL: Record<RepoStatus, string> = {
  active: "Aktif",
  slowing: "Melambat",
  inactive: "Tidak aktif",
  archived: "Diarsipkan",
};

function lastCommitFactor(m: RepoMetrics, now: Date, c: ScoreConfig["lastCommit"]): ScoreFactor {
  const base = { key: "lastCommit", label: "Commit terakhir", weight: c.weight } as const;
  if (!m.lastCommitAt) return { ...base, value: 0, reason: "Belum ada commit" };
  const days = daysBetween(m.lastCommitAt, now);
  const value =
    days < c.fullBelowDays ? 1
    : days < c.halfBelowDays ? 0.5
    : days > c.zeroAboveDays ? 0
    : c.betweenValue;
  return { ...base, value, reason: `Commit terakhir ${formatAgo(days)}` };
}

function issueCloseFactor(m: RepoMetrics, c: ScoreConfig["issueClose"]): ScoreFactor {
  const base = { key: "issueClose", label: "Median issue ditutup", weight: c.weight } as const;
  if (m.medianIssueCloseDays === null) {
    return { ...base, value: null, reason: "Belum ada issue tertutup untuk diukur" };
  }
  const days = m.medianIssueCloseDays;
  const value = days < c.fullBelowDays ? 1 : days < c.halfBelowDays ? 0.5 : 0;
  return { ...base, value, reason: `Issue rata-rata ditutup dalam ${formatDuration(days)}` };
}

function releaseFactor(m: RepoMetrics, now: Date, c: ScoreConfig["release"]): ScoreFactor {
  const base = { key: "release", label: "Rilis terakhir", weight: c.weight } as const;
  if (!m.latestRelease) return { ...base, value: 0, reason: "Belum pernah membuat rilis" };
  const days = daysBetween(m.latestRelease.publishedAt, now);
  return {
    ...base,
    value: days <= c.fullWithinDays ? 1 : 0,
    reason: `Rilis ${m.latestRelease.tag} ${formatAgo(days)}`,
  };
}

function licenseFactor(m: RepoMetrics, c: ScoreConfig["license"]): ScoreFactor {
  const base = { key: "license", label: "Lisensi", weight: c.weight } as const;
  return m.community.license
    ? { ...base, value: 1, reason: `Lisensi ${m.community.licenseName ?? "tersedia"}` }
    : { ...base, value: 0, reason: "Tidak ada lisensi" };
}

/** Hitung skor kesehatan beserta alasannya. Fungsi murni: hasil hanya bergantung pada argumen. */
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

/** Kalimat ringkas, misalnya "Skor 72 — Commit terakhir 3 hari lalu ✓, …". */
export function summarize(report: HealthReport): string {
  if (report.status === "archived") return "Diarsipkan — repo ini tidak lagi menerima perubahan";
  const parts = report.factors
    .filter((f) => f.value !== null)
    .map((f) => `${f.reason} ${f.value === 1 ? "✓" : f.value === 0 ? "✗" : "~"}`);
  return `Skor ${report.score ?? "–"} — ${parts.join(", ")}`;
}
