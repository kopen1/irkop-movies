#!/bin/sh
# Index judul ke D1 (untuk autocomplete & pencarian tanpa relay).
# Analog build-streammap.sh, tapi memanggil /api/admin/index-titles.
#
# Pemakaian:
#   EMAIL=emailmu@gmail.com ./index-titles.sh
#
# Opsi (env):
#   BASE=https://irkop-movies.pages.dev
#   FROM=1        # mulai dari halaman katalog ke berapa
#   PAGES=30      # jumlah halaman per panggilan (maks 200)
#   ROUNDS=10     # berapa kali panggil (tiap round maju PAGES)
#
# Contoh melanjutkan:
#   EMAIL=emailmu@gmail.com FROM=301 PAGES=100 ROUNDS=5 ./index-titles.sh

set -u

BASE="${BASE:-https://irkop-movies.pages.dev}"
EMAIL="${EMAIL:-}"
FROM="${FROM:-1}"
PAGES="${PAGES:-30}"
ROUNDS="${ROUNDS:-10}"

if [ -z "$EMAIL" ]; then
  echo "Set EMAIL dulu, contoh: EMAIL=emailmu@gmail.com $0"
  exit 1
fi

COOKIE="$(mktemp)"
trap 'rm -f "$COOKIE"' EXIT

echo "==> Login sebagai $EMAIL ..."
login=$(curl -s -m 30 -c "$COOKIE" -X POST "$BASE/api/auth/admin" \
  -H "Content-Type: application/json" --data "{\"email\":\"$EMAIL\"}")
echo "$login" | grep -q '"role":"admin"' || { echo "!! Login gagal / bukan admin."; exit 1; }

f="$FROM"
i=1
while [ "$i" -le "$ROUNDS" ]; do
  echo "==> Round $i: halaman $f..$((f + PAGES - 1))"
  out=$(curl -s -m 600 -b "$COOKIE" "$BASE/api/admin/index-titles?from=$f&pages=$PAGES")
  echo "$out" | python3 -c "
import sys, json
last = None
errs = 0
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        o = json.loads(line)
    except Exception:
        errs += 1
        continue
    if o.get('done'):
        last = o
if last:
    print('    selesai round: +%s dari round ini, total indeks sekarang = %s' % (last.get('indexed'), last.get('total')))
else:
    print('    (tidak ada ringkasan; baris tidak valid: %s)' % errs)
" 2>/dev/null || echo "    (gagal parse output)"

  f=$((f + PAGES))
  i=$((i + 1))
done

echo "==> Selesai. Lanjut kalau perlu: EMAIL=$EMAIL FROM=$f PAGES=$PAGES ROUNDS=$ROUNDS ./index-titles.sh"
