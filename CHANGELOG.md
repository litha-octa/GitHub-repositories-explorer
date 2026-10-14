# Changelog

## 0.1.0 — RepoCheckup (15 Oktober 2026)

Aplikasi lama **GitHub Repositories Explorer** (cari user lalu lihat daftar repo-nya) diganti seluruhnya dengan **RepoCheckup**: alat untuk mengecek apakah sebuah library masih dirawat dan aman dipakai.

### Fitur baru

- **Laporan kesehatan repo.** Menampilkan status (Aktif, Melambat, Tidak aktif, atau Diarsipkan), skor 0–100 beserta alasan per faktor, dan 8 metrik. Di bawah setiap metrik tertulis endpoint GitHub asalnya.
- **Input fleksibel.** Bisa `owner/repo`, URL GitHub, atau nama package npm, termasuk yang ber-scope seperti `@tanstack/react-query`. Nama package diubah menjadi repo GitHub lewat npm registry.
- **Mode bandingkan.** Sampai 4 library ditampilkan berdampingan dalam satu tabel.
- **Link yang bisa dibagikan.** Daftar repo yang sedang dilihat disimpan di URL, misalnya `?repos=pmndrs/zustand,reduxjs/redux`, dan bisa disalin dengan tombol "Salin link".
- **State loading dan error.** Skeleton saat memuat, lalu pesan khusus untuk repo tidak ditemukan, package npm tidak ditemukan, package tanpa repo GitHub, input tidak valid, dan batas request GitHub tercapai (beserta jam reset-nya).

### Backend

- **Proxy Netlify Function** (`/api/report`). Token GitHub hanya ada di server, tidak pernah dikirim ke browser.
- **Respons 202 ditangani.** Endpoint `/stats/*` dicoba ulang. Kalau GitHub masih menghitung, metrik ditandai `pending` dan frontend mengambil ulang otomatis tiap 5 detik.
- **Caching.** Hasil disimpan 6 jam di CDN Netlify dan di memori function. Respons yang masih `pending` tidak di-cache.
- **Lebih sedikit request.** Median waktu issue ditutup diambil dari Search API `is:issue is:closed`, sekaligus dengan jumlah issue tertutup. Sampelnya hanya berisi issue (tanpa PR) dan totalnya 8 request per laporan.

### Skor

- Empat faktor berbobot: commit terakhir (35), median issue ditutup (25), rilis terakhir (20), dan lisensi (20).
- Faktor yang datanya tidak ada tidak ikut dihitung, bukan dianggap nol.
- Semua ambang ada di satu file, `src/lib/scoreConfig.ts`.
- Star dan fork hanya ditampilkan sebagai info, tidak masuk skor.

### Perubahan teknis

- Pindah dari Create React App ke **Vite**. Saat `npm run dev`, Vite juga melayani `/api/report`, jadi tidak perlu `netlify-cli`.
- Tambah **TanStack Query** untuk fetching dan cache di browser.
- Hapus `axios`, `react-spinners`, `web-vitals`, dan `react-scripts`.
- Tambah **Vitest + React Testing Library + MSW**: 73 test untuk fungsi skor, parser input, proxy (dengan GitHub/npm yang di-mock), dan UI.
- Tambah `netlify.toml` dan `.env.example`.
- Script baru: `npm run dev`, `npm test`, `npm run test:run`, `npm run build`, dan `npm run typecheck`.

### Cara upgrade

1. Jalankan `npm install`, karena dependensinya banyak berubah.
2. Salin `.env.example` ke `.env` lalu isi `GITHUB_TOKEN`.
3. Di Netlify, tambahkan environment variable `GITHUB_TOKEN`. Folder publish sekarang `dist`, bukan `build` (sudah diatur di `netlify.toml`).
