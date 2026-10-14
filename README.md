# RepoCheckup

Find out in 5 seconds whether a library is still maintained and safe to use.

Enter `owner/repo`, a GitHub URL, or an npm package name (for example `zustand`). You get a single health report: a status (**Active**, **Slowing**, **Inactive**, or **Archived**), a 0–100 score with the reasons behind it, and a breakdown of each metric. You can compare the report with 1–3 other libraries and share the link:

```
/?repos=pmndrs/zustand,reduxjs/redux,jotai
```

## How the score works

The score is not a black box. It uses four weighted factors:

| Factor | Weight | Full | Half | Zero |
| --- | --- | --- | --- | --- |
| Last commit | 35 | < 30 days | < 6 months | > 1 year (6 months–1 year: ¼) |
| Median time to close an issue | 25 | < 7 days | < 30 days | ≥ 30 days |
| Latest release | 20 | ≤ 6 months | – | > 6 months, or never released |
| License | 20 | Present | – | Missing |

- **Score:** points earned ÷ total weight of the factors that have data × 100. If a repo has no closed issues yet, that factor is left out instead of counting as zero.
- **Status:** Active if the score is ≥ 70, Slowing if it is ≥ 40, Inactive otherwise. A repo whose last commit is more than a year old is always Inactive.
- **Archived:** a repo with `archived: true` is marked Archived right away, without a score.
- **Stars and forks** are shown for reference only. Plenty of highly starred libraries are no longer maintained.

All thresholds live in [`src/lib/scoreConfig.ts`](src/lib/scoreConfig.ts). The logic is in [`src/lib/score.ts`](src/lib/score.ts), a pure function tested in `score.test.ts`.

## Data sources

Every number can be traced back to where it came from. The report also shows the endpoint under each metric.

| Metric | GitHub endpoint |
| --- | --- |
| Repo info, archived status, stars/forks | `GET /repos/{owner}/{repo}` |
| Last commit | `GET /repos/{owner}/{repo}/commits?per_page=1` |
| Latest release (404 = never released) | `GET /repos/{owner}/{repo}/releases/latest` |
| Commits over the last 12 weeks | `GET /repos/{owner}/{repo}/stats/commit_activity` |
| Open issue count | Search API `repo:{owner}/{repo} is:issue is:open` |
| Closed issue count + median time to close | Search API `repo:{owner}/{repo} is:issue is:closed` (last 50 issues) |
| README, LICENSE, CONTRIBUTING | `GET /repos/{owner}/{repo}/community/profile` |
| Active contributors in the last 90 days | `GET /repos/{owner}/{repo}/stats/contributors` |
| npm package name → repo | `registry.npmjs.org/{package}/latest`, `repository.url` field |

The median time to close comes from the Search API rather than `/issues?state=closed`, because that endpoint also returns pull requests. On an active repo, its 30 most recent items can be almost all PRs, which leaves a sample of only 1–5 issues.

## Architecture

```
Browser (React + TanStack Query)
   │  GET /api/report?q=zustand
   ▼
Netlify Function  ── the GitHub token lives only here
   ├─► registry.npmjs.org   (package name → owner/repo)
   └─► api.github.com       (8 requests per report, 7 of them in parallel)
```

- **Proxy** ([`netlify/functions/report.ts`](netlify/functions/report.ts) → [`server/`](server/)): the browser never sees the token.
- **202 responses:** the `/stats/*` endpoints return 202 while GitHub is still computing the data. The proxy retries twice (about 4 seconds). If it still gets 202, the metric is marked `pending`, the response is not cached, and the frontend refetches every 5 seconds.
- **Rate limits:** a 403/429 with `x-ratelimit-remaining: 0` becomes a `RATE_LIMITED` error that includes the reset time.
- **Caching:** successful responses are cached for 6 hours on the Netlify CDN (`Netlify-CDN-Cache-Control`) and in the function's memory, so popular libraries are not recomputed. TanStack Query also keeps results in the browser.

## Running locally

```bash
npm install
cp .env.example .env    # set GITHUB_TOKEN (optional, but without it the limit is 60 requests/hour)
npm run dev             # http://localhost:5173, /api/report is served by Vite itself
```

`npm run dev` runs the same handler as the Netlify Function through Vite middleware, so you don't need `netlify-cli`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server + local API |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest, single run |
| `npm run build` | Type check + production build to `dist/` |

Tests use Vitest, React Testing Library, and MSW. They cover unit tests for the score and the input parser, proxy tests against mocked GitHub/npm (202, 404, rate limits, cache), and UI tests.

## Deploying to Netlify

1. Connect this repo to Netlify. The build command and publish folder are already set in `netlify.toml`.
2. Add a `GITHUB_TOKEN` environment variable. A personal access token with no scopes is enough for public repos.

## Stack

React 18, TypeScript, Vite, Chakra UI, TanStack Query, Netlify Functions, Vitest, React Testing Library, MSW.

See [CHANGELOG.md](CHANGELOG.md) for the release history.
