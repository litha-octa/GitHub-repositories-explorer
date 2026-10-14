# RepoCheckup

Cek dalam 5 detik apakah sebuah library masih dirawat dan aman dipakai.

Masukkan `owner/repo`, URL GitHub, atau nama package npm (misalnya `zustand`). Hasilnya satu laporan kesehatan: status (**Aktif**, **Melambat**, **Tidak aktif**, atau **Diarsipkan**), skor 0–100 beserta alasannya, dan rincian metrik. Laporan bisa dibandingkan dengan 1–3 library lain, dan link-nya bisa dibagikan:

```
/?repos=pmndrs/zustand,reduxjs/redux,jotai
```

## Cara skor dihitung

Skor tidak dibuat sebagai kotak hitam. Ada empat faktor, masing-masing dengan bobot:

| Faktor | Bobot | Nilai penuh | Setengah | Nol |
| --- | --- | --- | --- | --- |
| Commit terakhir | 35 | < 30 hari | < 6 bulan | > 1 tahun (6 bulan–1 tahun: ¼) |
| Median issue ditutup | 25 | < 7 hari | < 30 hari | ≥ 30 hari |
| Rilis terakhir | 20 | ≤ 6 bulan | – | > 6 bulan atau belum pernah |
| Lisensi | 20 | Ada | – | Tidak ada |

- **Skor** = jumlah poin ÷ jumlah bobot faktor yang datanya tersedia × 100. Kalau repo belum punya issue tertutup, faktor itu tidak ikut dihitung (bukan dianggap nol).
- **Status:** Aktif kalau skor ≥ 70, Melambat kalau ≥ 40, selain itu Tidak aktif. Repo yang commit terakhirnya lebih dari 1 tahun lalu selalu Tidak aktif.
- **Diarsipkan:** repo dengan `archived: true` langsung berstatus Diarsipkan tanpa dihitung.
- **Star dan fork** hanya ditampilkan sebagai info. Banyak library ber-star tinggi yang sebenarnya sudah tidak dirawat.

Semua ambang ada di [`src/lib/scoreConfig.ts`](src/lib/scoreConfig.ts), logikanya di [`src/lib/score.ts`](src/lib/score.ts) (fungsi murni, diuji di `score.test.ts`).

## Sumber data

Setiap angka bisa dijelaskan asalnya. Laporan juga menampilkan endpoint ini di bawah setiap metrik.

| Metrik | Endpoint GitHub |
| --- | --- |
| Info repo, status arsip, star/fork | `GET /repos/{owner}/{repo}` |
| Commit terakhir | `GET /repos/{owner}/{repo}/commits?per_page=1` |
| Rilis terakhir (404 = belum pernah rilis) | `GET /repos/{owner}/{repo}/releases/latest` |
| Commit 12 minggu terakhir | `GET /repos/{owner}/{repo}/stats/commit_activity` |
| Jumlah issue terbuka | Search API `repo:{owner}/{repo} is:issue is:open` |
| Jumlah issue tertutup + median waktu tutup | Search API `repo:{owner}/{repo} is:issue is:closed` (50 issue terakhir) |
| README, LICENSE, CONTRIBUTING | `GET /repos/{owner}/{repo}/community/profile` |
| Kontributor aktif 90 hari | `GET /repos/{owner}/{repo}/stats/contributors` |
| Nama package npm → repo | `registry.npmjs.org/{package}/latest`, field `repository.url` |

Median waktu tutup diambil dari Search API, bukan `/issues?state=closed`, karena endpoint itu juga memuat PR. Di repo yang aktif, 30 item terakhirnya bisa hampir semuanya PR sehingga sampel issue tinggal 1–5.

## Arsitektur

```
Browser (React + TanStack Query)
   │  GET /api/report?q=zustand
   ▼
Netlify Function  ── token GitHub hanya ada di sini
   ├─► registry.npmjs.org   (nama package → owner/repo)
   └─► api.github.com       (8 request per laporan, 7 di antaranya paralel)
```

- **Proxy** ([`netlify/functions/report.ts`](netlify/functions/report.ts) → [`server/`](server/)): browser tidak pernah memegang token.
- **Respons 202:** endpoint `/stats/*` membalas 202 selama GitHub masih menghitung. Proxy mencoba ulang dua kali (±4 detik). Kalau masih 202, metrik ditandai `pending`, respons tidak di-cache, dan frontend mengambil ulang tiap 5 detik.
- **Rate limit:** 403/429 dengan `x-ratelimit-remaining: 0` diubah menjadi error `RATE_LIMITED` beserta jam reset-nya.
- **Caching:** respons sukses di-cache 6 jam di CDN Netlify (`Netlify-CDN-Cache-Control`) dan di memori function, supaya library populer tidak dihitung ulang. TanStack Query juga menyimpan hasil di browser.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env    # isi GITHUB_TOKEN (opsional, tapi tanpa token batasnya 60 request/jam)
npm run dev             # http://localhost:5173, /api/report dilayani langsung oleh Vite
```

`npm run dev` menjalankan handler yang sama dengan Netlify Function lewat middleware Vite, jadi tidak perlu `netlify-cli`.

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server + API lokal |
| `npm test` | Vitest (watch mode) |
| `npm run test:run` | Vitest sekali jalan |
| `npm run build` | Typecheck + build produksi ke `dist/` |

Test memakai Vitest + React Testing Library + MSW: unit test skor dan parser input, test proxy dengan GitHub/npm yang di-mock (202, 404, rate limit, cache), dan test UI.

## Deploy ke Netlify

1. Hubungkan repo ini ke Netlify. Build command dan folder publish sudah diatur di `netlify.toml`.
2. Tambahkan environment variable `GITHUB_TOKEN`: personal access token tanpa scope apa pun sudah cukup untuk repo publik.

## Stack

React 18, TypeScript, Vite, Chakra UI, TanStack Query, Netlify Functions, Vitest, React Testing Library, MSW.

Riwayat perubahan ada di [CHANGELOG.md](CHANGELOG.md).
