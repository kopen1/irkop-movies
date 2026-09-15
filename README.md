# NontonGo

Situs streaming (katalog LK21) — **publik tanpa login**, watchlist & riwayat disimpan di
perangkat, dan **panel admin** (login email) untuk mengelola & build cache streaming.

| Bagian | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS → Cloudflare Pages |
| API | Cloudflare Pages Functions (runtime Workers) |
| Database | Cloudflare D1 (SQLite) |
| Player | HLS via hls.js + proxy stream di Worker |
| Relay (opsional) | Node (`relay-node.mjs`) + cloudflared, untuk melewati blokir upstream |

> ⚠️ **Peringatan.** Katalog & stream berasal dari pihak ketiga (LK21). Mempublikasikan situs
> yang mendistribusikan stream berhak cipta berisiko hukum, dan proxy video lewat Cloudflare
> berpotensi melanggar ToS mereka. Gunakan dengan risiko sendiri.

---

## Cara kerja (ringkas)

```
Browser ──► Cloudflare Pages (web/dist statis)
        └─► Pages Functions (/api/*)
                ├─ D1 ................. users, admins, titles, stream_map, visits, dll
                ├─ vault .............. stash.dafton.de        → katalog & metadata (lolos Worker)
                ├─ related ............ youlike.dadadidi.de    → rekomendasi (lolos Worker)
                ├─ videonode/playcdn/stream → resolve & proxy m3u8 (lolos Worker)
                └─ LK21 / gudangvape .. DIBLOKIR Worker (403) → butuh RELAY saat dibutuhkan
```

Poin penting:

- **Katalog** diambil dari *vault* (enumerasi ID) → jalan **tanpa relay**.
- **Pencarian/autocomplete** dibaca dari indeks D1 (`titles`) → jalan **tanpa relay**.
- **Streaming in-app**:
  - **Relay AKTIF** → judul apa pun bisa diputar langsung (detail diambil real-time via relay). **Tidak butuh mapping.**
  - **Relay MATI** → hanya judul yang sudah punya mapping (`stream_map`) yang bisa diputar in-app; sisanya fallback buka mirror di tab baru.
- Karena itu, **relay = opsional**: nyalakan untuk memutar judul baru / membangun mapping, lalu boleh dimatikan.

---

## Struktur

```
web/                          Frontend React (Cloudflare Pages)
  public/                     manifest PWA, icon, sw.js, offline.html
  src/
    components/               Layout, PosterCard, Rail, Skeleton, Pagination, ErrorBoundary
    pages/                    Home, Popular, Discover(Genre), Catalog(Film/Series), YearPage,
                              CountryPage, Search, Detail, Watchlist, History, NotFound, admin/*
    features/player/          HlsPlayer (hls.js)
    lib/                      api client, useAsync
    stores/                   auth, toast, library (localStorage)
functions/                    API (Pages Functions, runtime Workers)
  api/[[path]].ts             entry /api/*
  _lib/
    routes/                   auth, catalog, stream, user, admin, debug, visits
    lk21/                     common, catalog, detail, search, recommend, vault, stream, streamMap, titles
    router.ts, session.ts, crypto.ts, http.ts, cache.ts, env.ts
db/schema.sql                 Skema D1 (semua CREATE TABLE IF NOT EXISTS)
relay-node.mjs                Relay opsional (jalankan di IP residensial)
index-titles.sh               Skrip isi indeks judul (tidak butuh relay)
build-streammap.sh            Skrip isi stream_map (butuh relay)
wrangler.toml                 Konfigurasi Pages + binding D1
.dev.vars.example             Contoh env untuk dev lokal
```

---

## Konfigurasi

Set di **Cloudflare Pages → Settings → Variables and secrets → Production**.
Untuk dev lokal, salin `.dev.vars.example` → `.dev.vars`.

| Name | Wajib | Type | Keterangan |
|---|---|---|---|
| `APP_BASE_URL` | ya | plain | URL situs, mis. `https://irkop-movies.pages.dev` |
| `LK21_BASE` | ya | plain | Sumber halaman detail, mis. `https://tv12.lk21official.cc` |
| `PLAY_MIRROR` | ya | plain | Fallback tombol Tonton → tab baru, mis. `https://xx1.red` |
| `SESSION_SECRET` | ya | secret | String acak panjang; juga jadi `?key=` untuk endpoint build |
| `RELAY_URL` | opsional | plain | **Fallback** relay. Lebih baik diatur dari panel admin (lihat bawah). Format: `https://xxx.trycloudflare.com/?url=` |
| `VAULT_MAX_ID` | opsional | plain | ID tertinggi vault. Kosong = deteksi otomatis & di-cache di D1 |
| `ADMIN_KEY` | opsional | secret | Kalau diset, login admin butuh email **+ kunci** ini |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | opsional | plain/secret | **Legacy** (login admin sekarang pakai email) |
| `DB` | ya | D1 binding | Nama binding **harus `DB`** (huruf besar), arahkan ke database `nontongo` |

> Nama binding **case-sensitive**: `db` ≠ `DB`. Kode memakai `ctx.env.DB`.

### Relay URL dari panel admin (disarankan)
Tidak perlu ubah env/redeploy saat URL tunnel berubah:

1. Buka **/admin** → tab **Streams** → bagian **Relay URL**.
2. Tempel `https://xxx.trycloudflare.com/?url=` → **Simpan**.
3. Nilai tersimpan di D1 (`feature_flags.relay_url`) dan berlaku ±10 detik.

---

## Database (D1)

```bash
npx wrangler d1 create nontongo
# salin database_id ke wrangler.toml (GANTI_DATABASE_ID_DARI_WRANGLER)

npm run db:init         # remote
npm run db:init:local   # lokal
```

Atau tempel isi `db/schema.sql` di **D1 Console** (dashboard). Semua `CREATE TABLE IF NOT EXISTS` → aman diulang.

**Tabel:** `users`, `admins`, `sessions`, `watchlist`, `history`, `favorites`, `ratings`,
`feature_flags`, `curated_items`, `stream_map`, `stream_servers`, `titles`, `title_overviews`,
`visits`, `audit_logs`.

**Tambah admin** (login panel):
```sql
INSERT OR IGNORE INTO admins (email, note) VALUES ('emailmu@gmail.com', 'owner');
```
Login: buka `/admin` → isi email admin (tanpa password). Kalau `ADMIN_KEY` diset, sertakan kuncinya.

> **Catatan kuota D1 (free tier):** ada batas **baris tulis per hari**. Mengindeks seluruh katalog
> (±34 ribu baris) bisa menghabiskan kuota. Upgrade D1 bila ingin build besar-besaran, atau lakukan bertahap.

---

## Relay (opsional)

Dipakai saat perlu mengambil halaman detail/lainnya yang diblokir dari IP datacenter.
Jalankan di **IP residensial** (HP/PC rumah):

```bash
# 1) relay (di root repo, biarkan jalan)
node relay-node.mjs                 # default port 8080

# 2) expose ke internet (sesi lain)
pkg install cloudflared             # Termux, jika belum ada
cloudflared tunnel --url http://localhost:8080
#    → catat URL: https://xxxx.trycloudflare.com

# 3) set URL-nya di panel admin (Streams → Relay URL), atau via env RELAY_URL
```

Catatan:
- URL `trycloudflare.com` berubah tiap restart → cukup perbarui di **panel admin**.
  Untuk URL tetap, gunakan **named tunnel** (butuh domain).
- Relay di Termux menyertakan fallback `curl` untuk host yang menolak fingerprint Node.

---

## Streaming & mapping

| Kondisi | Bisa ditonton in-app? |
|---|---|
| Relay AKTIF | ✅ Semua judul (tanpa perlu mapping) |
| Relay MATI, judul sudah di `stream_map` | ✅ |
| Relay MATI, judul belum di-mapping | ❌ → fallback buka mirror di tab baru |

**Membangun mapping (opsional, agar bisa nonton tanpa relay):**
- Panel admin → **Streams** → **Build + progres** (per halaman), atau
- Skrip:
  ```bash
  EMAIL=emailmu@gmail.com ./build-streammap.sh
  # opsi: START_PAGE=1 MAX_PAGES=500 LIMIT=10 SLEEP=0
  ```
  (butuh relay aktif)

**Cek satu judul:** `GET /api/admin/stream-health?slug=<slug>` → `{ ok, fileUrl }`.

---

## Indeks judul (pencarian/autocomplete)

Autocomplete & pencarian membaca dari tabel `titles` (D1) → **tidak butuh relay**, mencakup
seluruh judul yang terindeks.

```bash
EMAIL=emailmu@gmail.com ./index-titles.sh
# opsi: FROM=1 PAGES=10 ROUNDS=10   (PAGES maks 200 per panggilan)
```
Atau lewat panel admin → **Streams → Index judul**.

---

## Setup lokal

Prasyarat: Node 18+. (Wrangler: Linux/macOS/WSL — **tidak** jalan di Termux.)

```bash
npm install
cp .dev.vars.example .dev.vars     # isi APP_BASE_URL, LK21_BASE, PLAY_MIRROR, SESSION_SECRET
npm run db:init:local              # buat tabel di D1 lokal

npx wrangler pages dev --d1=DB --compatibility-date=2025-01-01   # API :8788
npm run dev                        # frontend :5173 (proxy /api → 8788)
```

---

## Deploy ke Cloudflare Pages (via GitHub)

1. Push repo ke GitHub.
2. Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `web/dist`
   - **Root directory**: `/`
4. Isi environment variables (Production) — lihat tabel konfigurasi.
5. Tambahkan D1 binding bernama **`DB`** → database `nontongo`.
6. Jalankan `npm run db:init`.
7. Tambahkan email admin ke tabel `admins`, lalu buka `/admin`.

---

## Fitur

- **Home**: hero, rail **Lanjutkan Menonton** (progress), Trending, rail per genre, Rating, grid Jelajah ber-paginasi.
- **Populer / Genre / Film / Series / Tahun / Negara**: ber-paginasi dengan info **"Halaman X dari Y total halaman"**.
- **Pencarian**: autocomplete + filter **tipe** & **tahun**.
- **Detail**: poster, sinopsis, tombol Bagikan, rekomendasi serupa, **daftar episode per-season**, **auto-next episode**.
- **Player**: ber-frame (tidak auto-fullscreen), **pilih server** (p2p/turbovip/cast/hydrax), tandai selesai otomatis.
- **Watchlist & Riwayat**: disimpan lokal (localStorage, tanpa login).
- **PWA**: dapat di-install + halaman offline.
- **Panel admin** (`/admin`): Dashboard, Users, **Kunjungan**, Flags, Streams (Relay URL, build mapping + progres, index judul, kelola `stream_map`, cek stream), Audit, Debug API.

---

## Endpoint API

**Auth** & publik
- `POST /api/auth/admin` — login admin (email, opsional `key`)
- `GET /api/auth/me`, `POST /api/auth/logout`
- `POST /api/visit` — catat kunjungan
- `GET /api/health`, `GET /api/debug/lk21`

**Katalog**
- `GET /api/catalog/trending | popular | top | latest | genre | list | year | country`
- `GET /api/catalog/search?q=&page=&type=movie|series&year=`
- `GET /api/catalog/suggest?q=`
- `GET /api/catalog/episodes?slug=`, `GET /api/catalog/related?ids=&type=`
- `GET /api/catalog/detail/:slug?id=`

**Stream**
- `GET /api/stream/play?slug=&s=<index-server>`
- `GET /api/stream/hls?u=`

**User (legacy/opsional)**
- `/api/user/watchlist | history | favorites | ratings | profile | sessions`

**Admin**
- `GET /api/admin/stats | users | flags | audit | visits | stream-health | settings`
- `POST /api/admin/settings` (simpan Relay URL)
- `PATCH /api/admin/users/:id`, `DELETE /api/admin/users/:id`
- `POST /api/admin/flags`, `GET/POST/DELETE /api/admin/curated`
- `GET /api/admin/stream-map?q=&page=`, `DELETE /api/admin/stream-map/:slug`
- `GET /api/admin/stream-map/build?limit=&page=`
- `GET /api/admin/stream-map/build-stream?limit=&page=` (NDJSON, progres)
- `GET /api/admin/index-titles?from=&pages=` (NDJSON, progres)

---

## Scripts

| Script | Fungsi |
|---|---|
| `npm run dev` | Frontend dev (Vite) |
| `npm run build` | Build frontend → `web/dist` |
| `npm run typecheck` | Typecheck frontend |
| `npm run typecheck:api` | Typecheck Functions |
| `npm run db:init` | Terapkan skema D1 (remote) |
| `npm run db:init:local` | Terapkan skema D1 (lokal) |
| `npm run deploy` | `wrangler pages deploy web/dist` |
| `./index-titles.sh` | Isi indeks judul (tanpa relay) |
| `./build-streammap.sh` | Isi mapping stream (butuh relay) |

---

## Android (native Java)

Folder `android/` berisi aplikasi Android **native** (bukan WebView) yang memakai API yang sama
(Retrofit + Glide + ExoPlayer HLS). Fitur: Home, Populer, Genre, Cari (autocomplete), Film/Series/
Tahun/Negara, Detail (sinopsis + episode per-season + rekomendasi), Player (pilih server, auto-next),
Watchlist & Riwayat lokal, top bar + hamburger (drawer).

Build APK:
- **GitHub Actions**: Actions → **Android APK** → Run workflow (artifact `nontongo-apk`).
- **Android Studio**: buka folder `android/`.
- Detail lengkap & cara signing (agar bisa update tanpa uninstall): lihat `android/README.md`.

---

## Catatan platform

- `wrangler` ada di **optionalDependencies** (binary `workerd` tidak mendukung Android/Termux).
  Di Termux `npm install` tetap sukses (wrangler dilewati). Deploy/D1 jalankan dari Linux/WSL/VPS.
- Script root memanggil `node` langsung (bukan shim `.bin`) agar kompatibel dengan Termux.
- Rate limit per-IP sederhana diterapkan untuk endpoint `/api/catalog`, `/api/stream`, `/api/auth`, `/api/visit`.
