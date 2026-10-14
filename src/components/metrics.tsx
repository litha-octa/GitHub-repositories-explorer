import type { ReactNode } from "react";
import { HStack, Text } from "@chakra-ui/react";
import { daysBetween, formatAgo, formatDuration, formatNumber, plural } from "../lib/format";
import type { RepoMetrics } from "../lib/types";
import { FactorMark, Sparkline } from "./bits";

export interface MetricDef {
  key: string;
  label: string;
  /** The GitHub endpoint this number comes from, so every number can be explained. */
  source: string;
  render: (m: RepoMetrics, now: Date) => ReactNode;
}

const Muted = ({ children }: { children: ReactNode }) => (
  <Text as="span" color="gray.500">
    {children}
  </Text>
);

const Pending = () => <Muted>Still being computed by GitHub…</Muted>;

export const METRICS: MetricDef[] = [
  {
    key: "lastCommit",
    label: "Last commit",
    source: "GET /repos/{owner}/{repo}/commits?per_page=1",
    render: (m, now) =>
      m.lastCommitAt ? formatAgo(daysBetween(m.lastCommitAt, now)) : <Muted>No commits yet</Muted>,
  },
  {
    key: "release",
    label: "Latest release",
    source: "GET /repos/{owner}/{repo}/releases/latest",
    render: (m, now) =>
      m.latestRelease ? (
        <>
          {formatAgo(daysBetween(m.latestRelease.publishedAt, now))}{" "}
          <Muted>({m.latestRelease.tag})</Muted>
        </>
      ) : (
        <Muted>Never released</Muted>
      ),
  },
  {
    key: "weeklyCommits",
    label: "Commits, last 12 weeks",
    source: "GET /repos/{owner}/{repo}/stats/commit_activity",
    render: (m) =>
      m.weeklyCommits ? (
        <HStack spacing={3} align="end">
          <Sparkline values={m.weeklyCommits} />
          <Text as="span">{plural(m.weeklyCommits.reduce((a, b) => a + b, 0), "commit")}</Text>
        </HStack>
      ) : m.pending.includes("weeklyCommits") ? (
        <Pending />
      ) : (
        <Muted>Not available</Muted>
      ),
  },
  {
    key: "issues",
    label: "Open / closed issues",
    source: "Search API: repo:{owner}/{repo} is:issue is:open|closed",
    render: (m) =>
      m.openIssues === null || m.closedIssues === null ? (
        <Muted>Not available</Muted>
      ) : (
        `${formatNumber(m.openIssues)} / ${formatNumber(m.closedIssues)}`
      ),
  },
  {
    key: "medianClose",
    label: "Median time to close an issue",
    source: "Search API: last 50 closed issues, closed_at − created_at",
    render: (m) =>
      m.medianIssueCloseDays === null ? (
        <Muted>No data yet</Muted>
      ) : (
        <>
          {formatDuration(m.medianIssueCloseDays)}{" "}
          <Muted>(from {plural(m.issueSampleSize, "issue")})</Muted>
        </>
      ),
  },
  {
    key: "contributors",
    label: "Active contributors (90 days)",
    source: "GET /repos/{owner}/{repo}/stats/contributors",
    render: (m) =>
      m.activeContributors90d !== null ? (
        plural(m.activeContributors90d, "contributor")
      ) : m.pending.includes("activeContributors90d") ? (
        <Pending />
      ) : (
        <Muted>Not available</Muted>
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
    label: "Stars / forks (not scored)",
    source: "GET /repos/{owner}/{repo}",
    render: (m) => `${formatNumber(m.stars)} / ${formatNumber(m.forks)}`,
  },
];
