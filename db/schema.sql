-- NontonGo — skema database D1 (SQLite)
-- Jalankan: npm run db:init  (remote)  atau  npm run db:init:local (lokal)

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub    TEXT UNIQUE,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  picture       TEXT,
  role          TEXT NOT NULL DEFAULT 'user',      -- 'user' | 'admin'
  status        TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'banned'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Daftar admin (login email saja, tanpa password/Google).
-- Isi email admin via query D1, mis:
--   INSERT OR IGNORE INTO admins (email, note) VALUES ('emailmu@gmail.com', 'owner');
CREATE TABLE IF NOT EXISTS admins (
  email      TEXT PRIMARY KEY,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,                     -- sha256(raw token)
  user_id    INTEGER NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS watchlist (
  user_id   INTEGER NOT NULL,
  slug      TEXT NOT NULL,
  post_id   INTEGER,
  post_type TEXT,
  title     TEXT,
  poster    TEXT,
  added_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history (
  user_id      INTEGER NOT NULL,
  slug         TEXT NOT NULL,
  post_id      INTEGER,
  post_type    TEXT,
  title        TEXT,
  poster       TEXT,
  position_sec INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id   INTEGER NOT NULL,
  post_id   INTEGER NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'movie',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ratings (
  user_id    INTEGER NOT NULL,
  slug       TEXT NOT NULL,
  score      INTEGER NOT NULL,                     -- 1..10
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS curated_items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL,
  section   TEXT NOT NULL,                          -- 'hero' | 'featured'
  sort      INTEGER NOT NULL DEFAULT 0,
  title     TEXT,
  poster    TEXT,
  added_by  INTEGER,
  added_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (section, slug)
);

-- Cache mapping judul -> server player (host + id) agar streaming tidak perlu
-- mengambil halaman detail tiap kali (halaman detail diblokir dari Worker).
CREATE TABLE IF NOT EXISTS stream_map (
  slug       TEXT PRIMARY KEY,
  origin     TEXT NOT NULL DEFAULT 'https://videonode.de',
  host       TEXT NOT NULL,
  player_id  TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Daftar server player per judul (untuk pilih server di player).
CREATE TABLE IF NOT EXISTS stream_servers (
  slug      TEXT NOT NULL,
  idx       INTEGER NOT NULL,
  origin    TEXT NOT NULL,
  host      TEXT NOT NULL,
  player_id TEXT NOT NULL,
  PRIMARY KEY (slug, idx)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action   TEXT NOT NULL,
  target   TEXT,
  meta     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indeks judul (untuk autocomplete & pencarian tanpa relay).
CREATE TABLE IF NOT EXISTS titles (
  slug       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  title_lc   TEXT NOT NULL,
  year       TEXT,
  type       TEXT,
  poster     TEXT,
  post_id    INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_titles_lc ON titles(title_lc);

-- Statistik kunjungan (tanpa menyimpan IP mentah; disimpan sbg hash).
CREATE TABLE IF NOT EXISTS visits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  path       TEXT,
  referer    TEXT,
  visitor    TEXT,
  ua         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);

-- flag awal
INSERT OR IGNORE INTO feature_flags (key, value) VALUES ('registration_open', 'true');
INSERT OR IGNORE INTO feature_flags (key, value) VALUES ('maintenance', 'false');
