// @vitest-environment node
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { RepoMetrics } from "../src/lib/types";
import { clearMemoryCache, handleReportRequest } from "./handler";

const GH = "https://api.github.com";
const NOW = new Date("2026-10-15T00:00:00Z");
const day = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * day).toISOString();

/** Handler GitHub untuk satu repo sehat; test bisa menimpa endpoint tertentu dengan server.use(). */
function githubHandlers(full = "pmndrs/zustand") {
  const weekSec = Math.floor((NOW.getTime() - 10 * day) / 1000);
  return [
    http.get(`${GH}/repos/${full}`, () =>
      HttpResponse.json({
        full_name: full,
        html_url: `https://github.com/${full}`,
        description: "Bear necessities",
        owner: { avatar_url: "https://avatars/x.png" },
        archived: false,
        stargazers_count: 50000,
        forks_count: 1500,
        license: { spdx_id: "MIT", name: "MIT License" },
      }),
    ),
    http.get(`${GH}/repos/${full}/commits`, () =>
      HttpResponse.json([{ commit: { committer: { date: iso(2) } } }]),
    ),
    http.get(`${GH}/repos/${full}/releases/latest`, () =>
      HttpResponse.json({ tag_name: "v5.0.0", published_at: iso(40) }),
    ),
    http.get(`${GH}/repos/${full}/stats/commit_activity`, () =>
      HttpResponse.json(Array.from({ length: 52 }, (_, i) => ({ total: i }))),
    ),
    http.get(`${GH}/search/issues`, ({ request }) => {
      const q = new URL(request.url).searchParams.get("q") ?? "";
      if (q.includes("is:open")) return HttpResponse.json({ total_count: 12, items: [] });
      return HttpResponse.json({
        total_count: 300,
        items: [
          { created_at: iso(10), closed_at: iso(9) }, // 1 hari
          { created_at: iso(10), closed_at: iso(7) }, // 3 hari
          { created_at: iso(20), closed_at: iso(10) }, // 10 hari
        ],
      });
    }),
    http.get(`${GH}/repos/${full}/community/profile`, () =>
      HttpResponse.json({ files: { readme: {}, license: {}, contributing: null } }),
    ),
    http.get(`${GH}/repos/${full}/stats/contributors`, () =>
      HttpResponse.json([
        { weeks: [{ w: weekSec, c: 3 }] }, // aktif 10 hari lalu
        { weeks: [{ w: weekSec - 200 * 86400, c: 5 }] }, // terakhir 210 hari lalu
        { weeks: [{ w: weekSec, c: 0 }] }, // tidak ada commit
      ]),
    ),
  ];
}

const server = setupServer(...githubHandlers());
const noSleep = async () => {};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  clearMemoryCache();
});
afterAll(() => server.close());

async function request(q: string) {
  const res = await handleReportRequest(
    new Request(`http://localhost/api/report?q=${encodeURIComponent(q)}`),
    { now: () => NOW, sleep: noSleep, token: "test-token" },
  );
  return { res, body: await res.json() };
}

describe("GET /api/report", () => {
  it("mengumpulkan semua metrik dari GitHub", async () => {
    const { res, body } = await request("pmndrs/zustand");
    expect(res.status).toBe(200);
    const m = body as RepoMetrics;
    expect(m).toMatchObject({
      fullName: "pmndrs/zustand",
      archived: false,
      lastCommitAt: iso(2),
      latestRelease: { tag: "v5.0.0", publishedAt: iso(40) },
      weeklyCommits: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51],
      openIssues: 12,
      closedIssues: 300,
      medianIssueCloseDays: 3,
      issueSampleSize: 3,
      community: { readme: true, license: true, licenseName: "MIT", contributing: false },
      activeContributors90d: 1,
      pending: [],
    });
  });

  it("mengirim token ke GitHub, tidak pernah ke browser", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${GH}/repos/pmndrs/zustand`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ full_name: "pmndrs/zustand" });
      }),
    );
    const { body } = await request("pmndrs/zustand");
    expect(auth).toBe("Bearer test-token");
    expect(JSON.stringify(body)).not.toContain("test-token");
  });

  it("men-set header cache 6 jam untuk CDN", async () => {
    const { res } = await request("pmndrs/zustand");
    expect(res.headers.get("netlify-cdn-cache-control")).toContain("s-maxage=21600");
  });

  it("memakai cache memori untuk request berikutnya", async () => {
    let calls = 0;
    server.use(
      http.get(`${GH}/repos/pmndrs/zustand`, () => {
        calls++;
        return HttpResponse.json({ full_name: "pmndrs/zustand" });
      }),
    );
    await request("pmndrs/zustand");
    const { res } = await request("PMNDRS/zustand");
    expect(calls).toBe(1);
    expect(res.headers.get("x-cache")).toBe("HIT");
  });

  it("mengubah nama package npm menjadi repo GitHub", async () => {
    server.use(
      http.get("https://registry.npmjs.org/zustand/latest", () =>
        HttpResponse.json({ repository: { url: "git+https://github.com/pmndrs/zustand.git" } }),
      ),
    );
    const { res, body } = await request("zustand");
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ fullName: "pmndrs/zustand", npmPackage: "zustand" });
  });

  it("menangani package npm ber-scope", async () => {
    server.use(
      ...githubHandlers("TanStack/query"),
      http.get("https://registry.npmjs.org/@tanstack%2Freact-query/latest", () =>
        HttpResponse.json({ repository: "github:TanStack/query" }),
      ),
    );
    const { body } = await request("@tanstack/react-query");
    expect(body).toMatchObject({ fullName: "TanStack/query", npmPackage: "@tanstack/react-query" });
  });

  it("404 untuk package npm yang tidak ada", async () => {
    server.use(
      http.get("https://registry.npmjs.org/tidak-ada-pkg/latest", () =>
        HttpResponse.json({}, { status: 404 }),
      ),
    );
    const { res, body } = await request("tidak-ada-pkg");
    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NPM_NOT_FOUND");
  });

  it("404 untuk package tanpa repo GitHub", async () => {
    server.use(
      http.get("https://registry.npmjs.org/gitlab-pkg/latest", () =>
        HttpResponse.json({ repository: "https://gitlab.com/x/y" }),
      ),
    );
    const { body } = await request("gitlab-pkg");
    expect(body.error.code).toBe("NPM_NO_REPO");
  });

  it("404 untuk repo yang tidak ada", async () => {
    server.use(
      http.get(`${GH}/repos/ghost/nothing`, () =>
        HttpResponse.json({ message: "Not Found" }, { status: 404 }),
      ),
    );
    const { res, body } = await request("ghost/nothing");
    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("400 untuk input yang tidak valid", async () => {
    const { res, body } = await request("bukan input valid");
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("menganggap 404 di releases/latest sebagai belum pernah rilis", async () => {
    server.use(
      http.get(`${GH}/repos/pmndrs/zustand/releases/latest`, () =>
        HttpResponse.json({ message: "Not Found" }, { status: 404 }),
      ),
    );
    const { body } = await request("pmndrs/zustand");
    expect(body.latestRelease).toBeNull();
  });

  it("mencoba ulang endpoint stats yang membalas 202", async () => {
    let calls = 0;
    server.use(
      http.get(`${GH}/repos/pmndrs/zustand/stats/commit_activity`, () => {
        calls++;
        return calls < 3
          ? HttpResponse.json({}, { status: 202 })
          : HttpResponse.json([{ total: 7 }]);
      }),
    );
    const { body } = await request("pmndrs/zustand");
    expect(calls).toBe(3);
    expect(body.weeklyCommits).toEqual([7]);
    expect(body.pending).toEqual([]);
  });

  it("menandai metrik pending dan tidak meng-cache kalau 202 terus", async () => {
    server.use(
      http.get(`${GH}/repos/pmndrs/zustand/stats/contributors`, () =>
        HttpResponse.json({}, { status: 202 }),
      ),
    );
    const { res, body } = await request("pmndrs/zustand");
    expect(body.pending).toEqual(["activeContributors90d"]);
    expect(body.activeContributors90d).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("429 dengan waktu reset saat rate limit GitHub habis", async () => {
    const reset = Math.floor(NOW.getTime() / 1000) + 600;
    server.use(
      http.get(`${GH}/repos/pmndrs/zustand`, () =>
        HttpResponse.json(
          { message: "API rate limit exceeded" },
          {
            status: 403,
            headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) },
          },
        ),
      ),
    );
    const { res, body } = await request("pmndrs/zustand");
    expect(res.status).toBe(429);
    expect(body.error).toMatchObject({
      code: "RATE_LIMITED",
      resetAt: new Date(reset * 1000).toISOString(),
    });
  });

  it("langsung meneruskan status archived dari GitHub", async () => {
    server.use(
      http.get(`${GH}/repos/pmndrs/zustand`, () =>
        HttpResponse.json({ full_name: "pmndrs/zustand", archived: true }),
      ),
    );
    const { body } = await request("pmndrs/zustand");
    expect(body.archived).toBe(true);
  });
});
