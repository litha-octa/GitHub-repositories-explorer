import { daysAgo, makeMetrics, NOW } from "../test/fixtures";
import { scoreRepo, summarize } from "./score";
import { SCORE_CONFIG } from "./scoreConfig";

const factor = (report: ReturnType<typeof scoreRepo>, key: string) =>
  report.factors.find((f) => f.key === key)!;

describe("scoreRepo", () => {
  it("gives a healthy repo a score of 100 and Active status", () => {
    const report = scoreRepo(makeMetrics(), NOW);
    expect(report.score).toBe(100);
    expect(report.status).toBe("active");
    expect(report.factors.every((f) => f.value === 1)).toBe(true);
  });

  it("marks archived repos as Archived without scoring them", () => {
    const report = scoreRepo(makeMetrics({ archived: true }), NOW);
    expect(report).toEqual({ status: "archived", score: null, factors: [] });
  });

  describe("last commit", () => {
    it.each([
      [10, 1],
      [29, 1],
      [30, 0.5],
      [181, 0.5],
      [200, 0.25],
      [365, 0.25],
      [366, 0],
    ])("%i days ago → value %d", (days, expected) => {
      const report = scoreRepo(makeMetrics({ lastCommitAt: daysAgo(days) }), NOW);
      expect(factor(report, "lastCommit").value).toBe(expected);
    });

    it("scores zero when there are no commits", () => {
      const report = scoreRepo(makeMetrics({ lastCommitAt: null }), NOW);
      expect(factor(report, "lastCommit").value).toBe(0);
      expect(factor(report, "lastCommit").reason).toBe("No commits yet");
    });
  });

  describe("median time to close an issue", () => {
    it.each([
      [0.5, 1],
      [6.9, 1],
      [7, 0.5],
      [29.9, 0.5],
      [30, 0],
      [400, 0],
    ])("%d days → value %d", (days, expected) => {
      const report = scoreRepo(makeMetrics({ medianIssueCloseDays: days }), NOW);
      expect(factor(report, "issueClose").value).toBe(expected);
    });

    it("is left out (not zero) when there are no closed issues", () => {
      const report = scoreRepo(makeMetrics({ medianIssueCloseDays: null }), NOW);
      expect(factor(report, "issueClose").value).toBeNull();
      // Every other factor is full, so the normalized score stays at 100.
      expect(report.score).toBe(100);
    });
  });

  describe("latest release", () => {
    it("is full within 6 months and zero after that", () => {
      const recent = scoreRepo(makeMetrics({ latestRelease: { tag: "v1", publishedAt: daysAgo(182) } }), NOW);
      const old = scoreRepo(makeMetrics({ latestRelease: { tag: "v1", publishedAt: daysAgo(183) } }), NOW);
      expect(factor(recent, "release").value).toBe(1);
      expect(factor(old, "release").value).toBe(0);
    });

    it("scores zero when the repo was never released", () => {
      const report = scoreRepo(makeMetrics({ latestRelease: null }), NOW);
      expect(factor(report, "release").value).toBe(0);
      expect(factor(report, "release").reason).toBe("Never released");
    });
  });

  it("license: full when present, zero when missing", () => {
    const none = makeMetrics({
      community: { readme: true, license: false, licenseName: null, contributing: false },
    });
    expect(factor(scoreRepo(none, NOW), "license").value).toBe(0);
    expect(factor(scoreRepo(makeMetrics(), NOW), "license").reason).toBe("MIT license");
  });

  it("sums the weights and normalizes to 0–100", () => {
    // half commit (35 × 0.5) + zero issues + full release (20) + full license (20) = 57.5 / 100
    const report = scoreRepo(
      makeMetrics({ lastCommitAt: daysAgo(60), medianIssueCloseDays: 45 }),
      NOW,
    );
    expect(report.score).toBe(58);
    expect(report.status).toBe("slowing");
  });

  it("is Inactive when the score is below the Slowing threshold", () => {
    const report = scoreRepo(
      makeMetrics({
        lastCommitAt: daysAgo(300),
        medianIssueCloseDays: 90,
        latestRelease: null,
      }),
      NOW,
    );
    expect(report.score).toBe(29); // (35 × 0.25 + 20) / 100
    expect(report.status).toBe("inactive");
  });

  it("is Inactive when the last commit is over a year old, whatever the score", () => {
    // The score is still 65 (release, license, fast issues), but nothing was committed in over a year.
    const report = scoreRepo(makeMetrics({ lastCommitAt: daysAgo(400) }), NOW);
    expect(report.score).toBe(65);
    expect(report.status).toBe("inactive");
  });

  it("uses the config it is given", () => {
    const strict = {
      ...SCORE_CONFIG,
      status: { ...SCORE_CONFIG.status, activeMinScore: 101 },
    };
    expect(scoreRepo(makeMetrics(), NOW, strict).status).toBe("slowing");
  });
});

describe("summarize", () => {
  it("writes the score along with its reasons", () => {
    const report = scoreRepo(
      makeMetrics({ medianIssueCloseDays: 45, latestRelease: { tag: "v2.0.0", publishedAt: daysAgo(65) } }),
      NOW,
    );
    expect(summarize(report)).toBe(
      "Score 75 — Last commit 3 days ago ✓, Issues closed in a median of 45 days ✗, " +
        "Released v2.0.0 2 months ago ✓, MIT license ✓",
    );
  });

  it("explains archived repos", () => {
    expect(summarize(scoreRepo(makeMetrics({ archived: true }), NOW))).toMatch(/^Archived/);
  });
});
