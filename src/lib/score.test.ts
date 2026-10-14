import { daysAgo, makeMetrics, NOW } from "../test/fixtures";
import { scoreRepo, summarize } from "./score";
import { SCORE_CONFIG } from "./scoreConfig";

const factor = (report: ReturnType<typeof scoreRepo>, key: string) =>
  report.factors.find((f) => f.key === key)!;

describe("scoreRepo", () => {
  it("memberi skor 100 dan status Aktif untuk repo yang sehat", () => {
    const report = scoreRepo(makeMetrics(), NOW);
    expect(report.score).toBe(100);
    expect(report.status).toBe("active");
    expect(report.factors.every((f) => f.value === 1)).toBe(true);
  });

  it("langsung berstatus Diarsipkan tanpa menghitung skor", () => {
    const report = scoreRepo(makeMetrics({ archived: true }), NOW);
    expect(report).toEqual({ status: "archived", score: null, factors: [] });
  });

  describe("commit terakhir", () => {
    it.each([
      [10, 1],
      [29, 1],
      [30, 0.5],
      [181, 0.5],
      [200, 0.25],
      [365, 0.25],
      [366, 0],
    ])("%i hari lalu → nilai %d", (days, expected) => {
      const report = scoreRepo(makeMetrics({ lastCommitAt: daysAgo(days) }), NOW);
      expect(factor(report, "lastCommit").value).toBe(expected);
    });

    it("bernilai nol kalau belum ada commit", () => {
      const report = scoreRepo(makeMetrics({ lastCommitAt: null }), NOW);
      expect(factor(report, "lastCommit").value).toBe(0);
      expect(factor(report, "lastCommit").reason).toBe("Belum ada commit");
    });
  });

  describe("median issue ditutup", () => {
    it.each([
      [0.5, 1],
      [6.9, 1],
      [7, 0.5],
      [29.9, 0.5],
      [30, 0],
      [400, 0],
    ])("%d hari → nilai %d", (days, expected) => {
      const report = scoreRepo(makeMetrics({ medianIssueCloseDays: days }), NOW);
      expect(factor(report, "issueClose").value).toBe(expected);
    });

    it("tidak dihitung (bukan nol) kalau tidak ada issue tertutup", () => {
      const report = scoreRepo(makeMetrics({ medianIssueCloseDays: null }), NOW);
      expect(factor(report, "issueClose").value).toBeNull();
      // Faktor lain semuanya penuh, jadi skor tetap 100 setelah dinormalisasi.
      expect(report.score).toBe(100);
    });
  });

  describe("rilis terakhir", () => {
    it("penuh kalau ≤ 6 bulan, nol kalau lebih lama", () => {
      const recent = scoreRepo(makeMetrics({ latestRelease: { tag: "v1", publishedAt: daysAgo(182) } }), NOW);
      const old = scoreRepo(makeMetrics({ latestRelease: { tag: "v1", publishedAt: daysAgo(183) } }), NOW);
      expect(factor(recent, "release").value).toBe(1);
      expect(factor(old, "release").value).toBe(0);
    });

    it("nol kalau belum pernah rilis", () => {
      const report = scoreRepo(makeMetrics({ latestRelease: null }), NOW);
      expect(factor(report, "release").value).toBe(0);
      expect(factor(report, "release").reason).toBe("Belum pernah membuat rilis");
    });
  });

  it("lisensi: penuh kalau ada, nol kalau tidak", () => {
    const none = makeMetrics({
      community: { readme: true, license: false, licenseName: null, contributing: false },
    });
    expect(factor(scoreRepo(none, NOW), "license").value).toBe(0);
    expect(factor(scoreRepo(makeMetrics(), NOW), "license").reason).toBe("Lisensi MIT");
  });

  it("menjumlahkan bobot lalu menormalisasi ke 0–100", () => {
    // commit setengah (35 × 0.5) + issue nol + rilis penuh (20) + lisensi penuh (20) = 57.5 / 100
    const report = scoreRepo(
      makeMetrics({ lastCommitAt: daysAgo(60), medianIssueCloseDays: 45 }),
      NOW,
    );
    expect(report.score).toBe(58);
    expect(report.status).toBe("slowing");
  });

  it("Tidak aktif kalau skor di bawah ambang Melambat", () => {
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

  it("Tidak aktif kalau commit terakhir > 1 tahun, berapa pun skornya", () => {
    // Skor tetap 65 (rilis, lisensi, issue cepat), tapi tidak ada commit setahun lebih.
    const report = scoreRepo(makeMetrics({ lastCommitAt: daysAgo(400) }), NOW);
    expect(report.score).toBe(65);
    expect(report.status).toBe("inactive");
  });

  it("memakai config yang diberikan", () => {
    const strict = {
      ...SCORE_CONFIG,
      status: { ...SCORE_CONFIG.status, activeMinScore: 101 },
    };
    expect(scoreRepo(makeMetrics(), NOW, strict).status).toBe("slowing");
  });
});

describe("summarize", () => {
  it("menuliskan skor beserta alasannya", () => {
    const report = scoreRepo(
      makeMetrics({ medianIssueCloseDays: 45, latestRelease: { tag: "v2.0.0", publishedAt: daysAgo(65) } }),
      NOW,
    );
    expect(summarize(report)).toBe(
      "Skor 75 — Commit terakhir 3 hari lalu ✓, Issue rata-rata ditutup dalam 45 hari ✗, " +
        "Rilis v2.0.0 2 bulan lalu ✓, Lisensi MIT ✓",
    );
  });

  it("menjelaskan repo yang diarsipkan", () => {
    expect(summarize(scoreRepo(makeMetrics({ archived: true }), NOW))).toMatch(/^Diarsipkan/);
  });
});
