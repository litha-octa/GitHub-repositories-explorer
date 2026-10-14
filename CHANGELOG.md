# Changelog

## 0.1.0 — RepoCheckup (October 15, 2026)

The old **GitHub Repositories Explorer** app (search for a user, then browse their repos) has been fully replaced by **RepoCheckup**, a tool for checking whether a library is still maintained and safe to use.

### New features

- **Repo health report.** Shows a status (Active, Slowing, Inactive, or Archived), a 0–100 score with the reason behind each factor, and 8 metrics. Each metric lists the GitHub endpoint it came from.
- **Flexible input.** Accepts `owner/repo`, a GitHub URL, or an npm package name, including scoped ones like `@tanstack/react-query`. Package names are resolved to a GitHub repo through the npm registry.
- **Compare mode.** Up to 4 libraries side by side in one table.
- **Shareable links.** The repos you are viewing are stored in the URL, for example `?repos=pmndrs/zustand,reduxjs/redux`, and the "Copy link" button copies it.
- **Loading and error states.** A skeleton while loading, plus specific messages for a repo that doesn't exist, an npm package that doesn't exist, a package with no GitHub repo, invalid input, and a hit GitHub rate limit (with the reset time).

### Backend

- **Netlify Function proxy** (`/api/report`). The GitHub token stays on the server and is never sent to the browser.
- **Handles 202 responses.** The `/stats/*` endpoints are retried. If GitHub is still computing, the metric is marked `pending` and the frontend refetches automatically every 5 seconds.
- **Caching.** Results are cached for 6 hours on the Netlify CDN and in the function's memory. Responses that are still `pending` are not cached.
- **Fewer requests.** The median time to close an issue now comes from the Search API `is:issue is:closed`, in the same call that returns the closed issue count. The sample contains only issues (no PRs), and a report takes 8 requests in total.

### Score

- Four weighted factors: last commit (35), median time to close an issue (25), latest release (20), and license (20).
- Factors with no data are left out instead of counting as zero.
- All thresholds live in one file, `src/lib/scoreConfig.ts`.
- Stars and forks are shown for reference only and don't affect the score.

### Technical changes

- Moved from Create React App to **Vite**. During `npm run dev`, Vite also serves `/api/report`, so `netlify-cli` isn't needed.
- Added **TanStack Query** for fetching and browser-side caching.
- Removed `axios`, `react-spinners`, `web-vitals`, and `react-scripts`.
- Added **Vitest + React Testing Library + MSW**: 73 tests covering the score function, the input parser, the proxy (against mocked GitHub/npm), and the UI.
- Added `netlify.toml` and `.env.example`.
- New scripts: `npm run dev`, `npm test`, `npm run test:run`, `npm run build`, and `npm run typecheck`.

### Upgrading

1. Run `npm install`, since many dependencies changed.
2. Copy `.env.example` to `.env` and set `GITHUB_TOKEN`.
3. On Netlify, add a `GITHUB_TOKEN` environment variable. The publish folder is now `dist` instead of `build` (already set in `netlify.toml`).
