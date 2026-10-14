import type { ReactNode } from "react";
import { HStack, Text } from "@chakra-ui/react";
import { daysBetween, formatAgo, formatDuration, formatNumber } from "../lib/format";
import type { RepoMetrics } from "../lib/types";
import { FactorMark, Sparkline } from "./bits";

export interface MetricDef {
  key: string;
  label: string;
  /** Endpoint GitHub asal angka ini, supaya setiap angka bisa dijelaskan. */
  source: string;
  render: (m: RepoMetrics, now: Date) => ReactNode;
}

const Muted = ({ children }: { children: ReactNode }) => (
  <Text as="span" color="gray.500">
    {children}
  </Text>
);

const Pending = () => <Muted>Sedang dihitung GitHub…</Muted>;

export const METRICS: MetricDef[] = [
  {
    key: "lastCommit",
    label: "Commit terakhir",
    source: "GET /repos/{owner}/{repo}/commits?per_page=1",
    render: (m, now) =>
      m.lastCommitAt ? formatAgo(daysBetween(m.lastCommitAt, now)) : <Muted>Belum ada commit</Muted>,
  },
  {
    key: "release",
    label: "Rilis terakhir",
    source: "GET /repos/{owner}/{repo}/releases/latest",
    render: (m, now) =>
      m.latestRelease ? (
        <>
          {formatAgo(daysBetween(m.latestRelease.publishedAt, now))}{" "}
          <Muted>({m.latestRelease.tag})</Muted>
        </>
      ) : (
        <Muted>Belum pernah rilis</Muted>
      ),
  },
  {
    key: "weeklyCommits",
    label: "Commit 12 minggu terakhir",
    source: "GET /repos/{owner}/{repo}/stats/commit_activity",
    render: (m) =>
      m.weeklyCommits ? (
        <HStack spacing={3} align="end">
          <Sparkline values={m.weeklyCommits} />
          <Text as="span">{formatNumber(m.weeklyCommits.reduce((a, b) => a + b, 0))} commit</Text>
        </HStack>
      ) : m.pending.includes("weeklyCommits") ? (
        <Pending />
      ) : (
        <Muted>Tidak tersedia</Muted>
      ),
  },
  {
    key: "issues",
    label: "Issue terbuka / tertutup",
    source: "Search API: repo:{owner}/{repo} is:issue is:open|closed",
    render: (m) =>
      m.openIssues === null || m.closedIssues === null ? (
        <Muted>Tidak tersedia</Muted>
      ) : (
        `${formatNumber(m.openIssues)} / ${formatNumber(m.closedIssues)}`
      ),
  },
  {
    key: "medianClose",
    label: "Median issue ditutup",
    source: "Search API: 50 issue tertutup terakhir, closed_at − created_at",
    render: (m) =>
      m.medianIssueCloseDays === null ? (
        <Muted>Belum ada data</Muted>
      ) : (
        <>
          {formatDuration(m.medianIssueCloseDays)} <Muted>(dari {m.issueSampleSize} issue)</Muted>
        </>
      ),
  },
  {
    key: "contributors",
    label: "Kontributor aktif 90 hari",
    source: "GET /repos/{owner}/{repo}/stats/contributors",
    render: (m) =>
      m.activeContributors90d !== null ? (
        `${m.activeContributors90d} orang`
      ) : m.pending.includes("activeContributors90d") ? (
        <Pending />
      ) : (
        <Muted>Tidak tersedia</Muted>
      ),
  },
  {
    key: "community",
    label: "README · LICENSE · CONTRIBUTING",
    source: "GET /repos/{owner}/{repo}/community/profile",
    render: (m) => (
      <HStack spacing={4}>
        {(
          [
            ["README", m.community.readme],
            ["LICENSE", m.community.license],
            ["CONTRIBUTING", m.community.contributing],
          ] as const
        ).map(([name, ok]) => (
          <HStack key={name} spacing={1}>
            <FactorMark value={ok ? 1 : 0} />
            <Text as="span" fontSize="sm">
              {name}
            </Text>
          </HStack>
        ))}
      </HStack>
    ),
  },
  {
    key: "popularity",
    label: "Star / fork (tidak masuk skor)",
    source: "GET /repos/{owner}/{repo}",
    render: (m) => `${formatNumber(m.stars)} / ${formatNumber(m.forks)}`,
  },
];
