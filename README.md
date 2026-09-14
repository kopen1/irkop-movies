# NontonGo

Website streaming (katalog LK21) — **situs publik tanpa login**, watchlist & riwayat
disimpan lokal, dan **panel admin** (login email) untuk build cache streaming.

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS → Cloudflare Pages
- **API**: Cloudflare Pages Functions (runtime Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Player**: HLS via hls.js + proxy stream di Worker
- **Relay**: Node (`relay-node.mjs`) opsional untuk melewati blokir upstream

> ⚠️ **Peringatan.** Katalog & stream berasal dari sumber pihak ketiga (LK21).
> Mempublikasikan situs yang mendistribusikan stream berhak cipta berisiko hukum.
> Proxy video lewat Cloudflare juga berpotensi melanggar ToS mereka. Gunakan dengan risiko sendiri.

---

## Arsitektur singkat

```
Browser ──► Cloudflare Pages (web/dist statis)
        └─► Pages Functions (/api/*)
                ├─ D1 (users, admins, stream_map, feature_flags, ...)
                ├─ vault   : stash.dafton.de   → katalog & metadata (lolos dari Worker)
                ├─ related : youlike.dadadidi.de → rekomendasi (lolos)
                ├─ videonode/playcdn/stream    → resolve m3u8 (lolos dari Worker)
                └─ LK21 (tv12...) / gudangvape → DIBLOKIR Worker → lewat RELAY (IP residensial)
```

- **Katalog** diambil dari *vault* (enumerasi ID) sehingga jalan tanpa relay.
- **Streaming in-app**: butuh `stream_map` (slug → host+id). Diisi **sekali** via relay,
  setelah itu menonton **tidak perlu relay** (videonode/playcdn/m3u8 diakses langsung Worker).
- Judul yang belum punya mapping → tombol Tonton membuka mirror di tab baru.

---

## Struktur

```
web/                     Frontend React (Cloudflare Pages)
  public/                manifest PWA, icon, sw.js
  src/
    components/          Layout, PosterCard, Rail, Skeleton, Pagination, dll
    pages/               Home, Popular, Discover(Genre), Catalog(Film/Series), Detail,
                         Search, Watchlist, History, NotFound, admin/*
    features/player/     HlsPlayer (hls.js)
    lib/                 api client, useAsync
    stores/              auth, toast, library (localStorage)
functions/               API (Pages Functions)
  api/[[path]].ts        entry /api/*
  _lib/
    routes/              auth, catalog, stream, user, admin, debug
    lk21/                common, catalog, detail, search, recommend, vault, stream, streamMap
    router.ts, session.ts, crypto.ts, http.ts, env.ts
db/schema.sql            Skema D1
relay-node.mjs           Relay opsional (jalankan di IP residensial)
build-streammap.sh       Skrip isi stream_map massal
wrangler.toml            Konfigurasi Pages + binding D1
.dev.vars.example        Contoh env untuk dev lokal
```

---

## Konfigurasi Environment

Set di **Cloudflare Pages → Settings → Variables and secrets (Production)**.
Untuk dev lokal, salin `.dev.vars.example` → `.dev.vars`.

| Name | Wajib | Type | Contoh / keterangan |
|---|---|---|---|
| `APP_BASE_URL` | ya | plain | `https://irkop-movies.pages.dev` |
| `LK21_BASE` | ya | plain | `https://tv12.lk21official.cc` (sumber halaman detail; bisa diganti mirror) |
| `PLAY_MIRROR` | ya | plain | `https://xx1.red` (fallback tombol Tonton → tab baru) |
| `SESSION_SECRET` | ya | secret | string acak panjang; juga dipakai sebagai `?key=` untuk build mapping |
| `RELAY_URL` | opsional | plain | `https://<tunnel>.trycloudflare.com/?url=` (khusus isi mapping) |
| `VAULT_MAX_ID` | opsional | plain | angka ID tertinggi vault (kalau kosong: deteksi otomatis, di-cache di D1) |
| `ADMIN_KEY` | opsional | secret | kalau diset, login admin butuh email + kunci ini |
| `GOOGLE_CLIENT_ID` | opsional | plain | **legacy** (login admin sekarang pakai email; endpoint Google masih ada) |
| `GOOGLE_CLIENT_SECRET` | opsional | secret | **legacy** |
| `DB` | ya | D1 binding | nama binding **harus `DB`** (huruf besar), arahkan ke database `nontongo` |

> Binding name bersifat case-sensitive. `db` ≠ `DB`. Kode memakai `ctx.env.DB`.

---

## Database (D1)

Buat database lalu terapkan skema:

```bash
npx wrangler d1 create nontongo
# salin results.database_id ke wrangler.toml (GANTI_DATABASE_ID_DARI_WRANGLER)

npm run db:init         # remote (--remote)
npm run db:init:local   # lokal (--local)
```

Atau tempel isi `db/schema.sql` di **D1 Console** (dashboard). Semua perintah
`CREATE TABLE IF NOT EXISTS` sehingga aman diulang.

### Tabel
`users`, `admins`, `sessions`, `watchlist`, `history`, `favorites`, `ratings`,
`feature_flags`, `curated_items`, `stream_map`, `stream_servers`, `audit_logs`.

### Tambah admin (login panel)
```sql
INSERT OR IGNORE INTO admins (email, note) VALUES ('emailmu@gmail.com', 'owner');
```
Login ke panel: buka `/admin` → isi email admin (tanpa password).

---

## Relay (untuk build mapping stream & pencarian)

Upstream (`tv12.lk21official.cc`, `gudangvape.com`) memblokir IP datacenter (Cloudflare Worker).
Relay di **IP residensial** (HP/PC rumah) melewatinya.

```bash
# 1) jalankan relay (root repo)
node relay-node.mjs                 # default port 8080

# 2) expose ke internet (sesi lain)
pkg install cloudflared             # jika belum ada (Termux)
cloudflared tunnel --url http://localhost:8080
#   → dapat URL: https://xxxx.trycloudflare.com

# 3) set env di Cloudflare Pages lalu redeploy
RELAY_URL=https://xxxx.trycloudflare.com/?url=
```

Catatan:
- URL `trycloudflare.com` berubah tiap restart `cloudflared` → update `RELAY_URL`.
- Relay hanya perlu saat **mengisi mapping** (dan fitur genre/pencarian via listing).
  Setelah mapping terisi, streaming in-app tidak butuh relay.

---

## Isi mapping stream (stream_map)

Butuh `RELAY_URL` aktif. Dua cara:

**A. Panel admin** (login `/admin` → tab **Streams**):
- Atur Halaman & Jumlah → klik **Build** (ulangi `page=1,2,3,...`).

**B. Skrip otomatis** (disarankan):
```bash
EMAIL=emailmu@gmail.com ./build-streammap.sh
# opsi: START_PAGE=1 MAX_PAGES=500 LIMIT=10 SLEEP=0
```

**C. curl** (butuh `SESSION_SECRET`):
```bash
curl "https://<domain>/api/admin/stream-map/build?key=<SESSION_SECRET>&limit=10&page=1"
```

Cek: `GET /api/admin/stream-health?slug=<slug>` → `{ ok: true, fileUrl }`.

---

## Setup lokal

Prasyarat: Node 18+ (untuk wrangler: Linux/macOS/WSL — **tidak** bisa di Termux).

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
2. Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build settings:
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `web/dist`
   - **Root directory**: `/`
4. Environment variables (Production): lihat tabel di atas.
5. D1 binding `DB` → database `nontongo`.
6. `npm run db:init`.
7. Tambahkan email admin ke tabel `admins`, lalu buka `/admin`.

---

## Fitur UI

- Home: hero, rail Lanjutkan Menonton (progress bar), Trending, rail per genre (Action/Drama/Horror), Rating, grid Jelajah ber-paginasi.
- **Populer**, **Genre**, **Film**, **Series**, **Tahun**, **Negara** — semua ber-paginasi dengan info "Halaman X dari Y total halaman".
- Pencarian: **autocomplete** + filter **tipe** & **tahun**.
- Detail: sinopsis, rating, **bagikan**, rekomendasi serupa, **daftar episode** (per-season), **auto-next episode**.
- Player ber-frame (tidak auto-fullscreen), **pilih server**, tandai selesai otomatis.
- Watchlist & Riwayat lokal (localStorage, tanpa login).
- PWA (installable) + halaman offline.
- Admin: dashboard (termasuk jumlah mapping), kelola user/flag/audit, kelola `stream_map` (cari/hapus), build mapping dengan progres, cek health stream.

---

## Endpoint API

- **Auth**: `POST /api/auth/admin` (login email), `GET /api/auth/me`, `POST /api/auth/logout`
  (legacy: `GET /api/auth/google`, `/api/auth/google/callback`)
- **Katalog**: `GET /api/catalog/trending | popular | top | latest | genre | list | year | country | search | suggest | episodes | related | detail/:slug`
  - `search` menerima `?q=&page=&type=movie|series&year=`
  - `list` menerima `?t=movie|series&page=`
- **Stream**: `GET /api/stream/play?slug=&s=<index-server>`, `GET /api/stream/hls?u=`
- **User** (opsional/legacy): `/api/user/watchlist|history|favorites|ratings|profile|sessions`
- **Admin**: `GET /api/admin/stats|users|flags|audit|stream-health`, `PATCH/DELETE /api/admin/users/:id`, `POST /api/admin/flags`, `GET/POST/DELETE /api/admin/curated`
  - `GET /api/admin/stream-map?q=&page=` (daftar mapping)
  - `DELETE /api/admin/stream-map/:slug`
  - `GET /api/admin/stream-map/build?limit=&page=` (batch)
  - `GET /api/admin/stream-map/build-stream?limit=&page=` (NDJSON, progres per judul)
- **Debug**: `GET /api/health`, `GET /api/debug/lk21`

---

## Scripts (root `package.json`)

| Script | Fungsi |
|---|---|
| `npm run dev` | Frontend dev (Vite) |
| `npm run build` | Build frontend → `web/dist` |
| `npm run typecheck` | Typecheck frontend |
| `npm run typecheck:api` | Typecheck Functions |
| `npm run db:init` | Terapkan skema D1 (remote) |
| `npm run db:init:local` | Terapkan skema D1 (lokal) |
| `npm run deploy` | `wrangler pages deploy web/dist` |

---

## Catatan platform

- `wrangler` ada di **optionalDependencies** (binary `workerd` tidak mendukung Android/Termux).
  Di Termux `npm install` tetap sukses (wrangler dilewati). Untuk deploy/D1, jalankan dari Linux/WSL/VPS.
- Script root memanggil `node` langsung (bukan shim `.bin`) agar kompatibel dengan Termux.
- `relay-node.mjs` menyertakan fallback `curl` untuk host yang menolak fingerprint Node (mis. `gudangvape.com`).
