# NontonGo

Web app streaming (katalog LK21) dengan akun Google, watchlist, riwayat, rekomendasi, dan panel admin.

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS → Cloudflare Pages
- **API**: Cloudflare Pages Functions (runtime Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Google OAuth (tanpa password/verifikasi email)
- **Player**: HLS via hls.js + proxy stream di Worker

> ⚠️ **Peringatan.** Katalog & stream berasal dari sumber pihak ketiga (LK21). Mempublikasikan
> situs yang mendistribusikan stream berhak cipta berisiko hukum. Proxy video lewat Cloudflare
> juga berpotensi melanggar ToS Cloudflare (video non-Stream). Gunakan dengan risiko sendiri.

## Struktur

```
web/                  Frontend React (Cloudflare Pages)
functions/            API (Pages Functions / Workers)
  api/[[path]].ts     entry /api/*
  _lib/routes/        auth, catalog, stream, user, admin, debug
  _lib/lk21/          adaptor API LK21 (search, detail, recommend, catalog, stream)
db/schema.sql         skema D1
wrangler.toml         konfigurasi Pages + binding D1
legacy/               versi HTML/Node lama (diabaikan git)
```

## Endpoint API

Auth: `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/auth/me`, `POST /api/auth/logout`

Katalog: `GET /api/catalog/trending|top|latest|genre|search|suggest|related|detail/:slug`

Stream: `GET /api/stream/play?slug=`, `GET /api/stream/hls?u=`

User: `GET/POST /api/user/watchlist`, `GET/POST /api/user/history`, `GET/POST /api/user/favorites`,
`GET/POST /api/user/ratings`, `PATCH /api/user/profile`, `GET /api/user/sessions`

Admin: `GET /api/admin/stats|users|flags|audit|stream-health`, `PATCH/DELETE /api/admin/users/:id`,
`POST /api/admin/flags`, `GET/POST/DELETE /api/admin/curated`

Debug: `GET /api/debug/lk21` (uji koneksi upstream dari Worker)

## Catatan platform

- `wrangler` ditaruh di **optionalDependencies** karena binary-nya (`workerd`) tidak mendukung
  Android/Termux. Di Termux `npm install` tetap sukses (wrangler dilewati) dan `npm run build`
  untuk frontend tetap jalan. Di Linux/macOS/CI Cloudflare, wrangler terpasang normal.
- Script di root memakai pemanggilan `node` langsung (bukan shim `.bin`) supaya kompatibel
  dengan Termux yang tidak punya `/usr/bin/env`.
- Untuk memakai wrangler di Termux, jalankan dari WSL/VPS, bukan dari Android.

## Setup lokal

Prasyarat: Node 18+, akun Cloudflare (untuk D1 & deploy).

```bash
npm install

# 1. buat database D1 (sekali)
npx wrangler d1 create nontongo
#    → salin results.database_id ke wrangler.toml (GANTI_DATABASE_ID_DARI_WRANGLER)

# 2. terapkan skema (lokal & remote)
npm run db:init:local
npm run db:init

# 3. buat file .dev.vars (salin dari .dev.vars.example) lalu isi
#    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET

# 4. jalankan API (port 8788)
npx wrangler pages dev --d1=DB --compatibility-date=2025-01-01

# 5. jalankan frontend (port 5173, sudah proxy /api → 8788)
npm run dev
```

## Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create Credentials → OAuth client ID → Web application.
2. **Authorized redirect URIs**:
   - `http://localhost:8788/api/auth/google/callback`
   - `https://<domain-final-kamu>/api/auth/google/callback`
3. Salin Client ID & Client Secret.
   - Dev: tulis di `.dev.vars`
   - Prod: `npx wrangler pages secret put GOOGLE_CLIENT_SECRET` dan set var `GOOGLE_CLIENT_ID` di dashboard Pages.

## Deploy ke Cloudflare Pages (via GitHub)

1. Push repo ini ke GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build settings:
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `web/dist`
   - **Root directory**: `/`
4. Environment variables (Production):
   - `APP_BASE_URL` = `https://<project>.pages.dev` (atau domain custom)
   - `GOOGLE_CLIENT_ID` = client id Google
   - `LK21_BASE` = `https://tv12.lk21official.cc`
   - Secret: `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`
5. Bind D1: Settings → Functions → D1 database bindings → `DB` → `nontongo`.
6. Terapkan skema ke D1 remote: `npm run db:init`.

## Jadikan akun pertama sebagai admin

Login dulu dengan Google, lalu:

```bash
npx wrangler d1 execute nontongo --command "UPDATE users SET role='admin' WHERE email='EMAIL_KAMU';"
```

## Uji konektivitas upstream (penting)

Setelah deploy, buka `/admin/debug` (login admin) atau `GET /api/debug/lk21`.
Endpoint ini menguji apakah `lk21.listing`, `lk21.search`, `lk21.vault`, `lk21.related`,
dan `lk21.stream` bisa diakses **dari dalam Worker**. Jika ada yang 403, upstream memblokir
Cloudflare dan perlu strategi relay terpisah.
