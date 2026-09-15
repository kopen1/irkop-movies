#!/bin/sh
# Build stream_map otomatis (isi cache host+id player) lewat endpoint admin.
#
# Syarat: RELAY_URL sudah aktif di Cloudflare (biar halaman detail bisa diambil).
#
# Pemakaian:
#   EMAIL=emailmu@gmail.com ./build-streammap.sh
#
# Opsi lewat env:
#   BASE=https://irkop-movies.pages.dev   # URL situs
#   LIMIT=10                              # judul per halaman (maks 30, disarankan 10)
#   START_PAGE=1
#   MAX_PAGES=500                         # batas jumlah halaman
#   SLEEP=0                               # jeda antar halaman (detik)
#
# Contoh melanjutkan dari halaman 30:
#   EMAIL=emailmu@gmail.com START_PAGE=30 MAX_PAGES=200 ./build-streammap.sh

set -u

BASE="${BASE:-https://irkop-movies.pages.dev}"
EMAIL="${EMAIL:-}"
LIMIT="${LIMIT:-10}"
START_PAGE="316"
MAX_PAGES="${MAX_PAGES:-500}"
SLEEP="${SLEEP:-0}"

if [ -z "$EMAIL" ]; then
  echo "Set EMAIL dulu, contoh: EMAIL=emailmu@gmail.com $0"
  exit 1
fi

COOKIE="$(mktemp)"
trap 'rm -f "$COOKIE"' EXIT

echo "==> Login sebagai $EMAIL ..."
login=$(curl -s -m 30 -c "$COOKIE" -X POST "$BASE/api/auth/admin" \
  -H "Content-Type: application/json" --data "{\"email\":\"$EMAIL\"}")
echo "    $login"
echo "$login" | grep -q '"role":"admin"' || { echo "!! Login gagal / bukan admin."; exit 1; }

total_built=0
total_skip=0
total_fail=0
page="$START_PAGE"
end=$((START_PAGE + MAX_PAGES - 1))
empty_pages=0

while [ "$page" -le "$end" ]; do
  r=$(curl -s -m 240 -b "$COOKIE" "$BASE/api/admin/stream-map/build?limit=$LIMIT&page=$page")
  parsed=$(echo "$r" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(int(d.get('built', 0)), int(d.get('skipped', 0)), int(d.get('failed', 0)))
except Exception:
    print(0, 0, 0)
")
  set -- $parsed
  b="$1"; s="$2"; f="$3"

  total_built=$((total_built + b))
  total_skip=$((total_skip + s))
  total_fail=$((total_fail + f))
  printf 'page %-4s built=%-3s skipped=%-3s failed=%-3s | total built=%s\n' "$page" "$b" "$s" "$f" "$total_built"

  if [ "$b" -eq 0 ] && [ "$s" -eq 0 ]; then
    empty_pages=$((empty_pages + 1))
    if [ "$empty_pages" -ge 3 ]; then
      echo "==> 3 halaman kosong berturut-turut. Berhenti (mungkin sudah judul lama / relay mati)."
      break
    fi
  else
    empty_pages=0
  fi

  page=$((page + 1))
  if [ "$SLEEP" -gt 0 ]; then sleep "$SLEEP"; fi
done

echo "==> SELESAI. built=$total_built skipped=$total_skip failed=$total_fail (sampai page $((page - 1)))"
echo "    Lanjut: EMAIL=$EMAIL START_PAGE=$page ./build-streammap.sh"
