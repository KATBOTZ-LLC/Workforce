#!/usr/bin/env bash
# Start the whole platform for a demo. No Google Cloud, no billing.
#
#   ./demo.sh                   local only — http://localhost:3000/live
#   ./demo.sh --public          also opens a public URL other people can open
#   ./demo.sh --with-demo-data  add four INVENTED engagements (avoid; prefer real)
#   ./demo.sh --stop            stop everything
#
# By default this loads REAL data only: 34 real people, 12 real departments,
# 50 real seats, 66 real document requirements, and ZERO engagements. Real
# engagements come from db/import/import_roster.py.
#
# --public publishes this app, including 34 real names and email addresses, to a
# URL anyone can reach. A passcode is generated and required, but the URL is
# still on the public internet. It is your call, so the script asks.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

RUN="$PWD/.demo"; mkdir -p "$RUN"

# Waiting on a listening port, not on an HTTP response: asking Next.js for a
# page makes it compile that page first, which can take 30 seconds and makes
# this script look hung.
wait_port () {  # wait_port PORT SECONDS
  for _ in $(seq 1 "$2"); do
    if lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

stop_all () {
  for f in "$RUN"/*.pid; do
    [ -f "$f" ] || continue
    pid="$(cat "$f")"; kill "$pid" 2>/dev/null && echo "  stopped $(basename "$f" .pid) ($pid)"
    rm -f "$f"
  done
  # npm spawns next-server as a child, so the pid file alone is not enough.
  pkill -f 'uvicorn app.main:app' 2>/dev/null || true
  pkill -f 'next dev'             2>/dev/null || true
  pkill -f 'next-server'          2>/dev/null || true
  pkill -f 'cloudflared tunnel'   2>/dev/null || true
  echo "All stopped."
}

[ "${1:-}" = "--stop" ] && { stop_all; exit 0; }
[ "${1:-}" = "--with-demo-data" ] && WITH_DEMO=1

echo "Stopping anything already running..."
stop_all >/dev/null 2>&1 || true

# --- 1. database ------------------------------------------------------------
echo
echo "1/3  Database"
pg_isready -q || { echo "  PostgreSQL is not running. Start it:  brew services start postgresql@17"; exit 1; }
# Real data only: the 34 real people, 12 real departments, 50 real seats and
# the 66 real document requirements. NO invented engagements — those come from
# db/import/import_roster.py once HR has confirmed types and join dates.
# Pass --with-demo-data if you deliberately want the four fake engagements.
if [ "${WITH_DEMO:-}" = "1" ]; then
  ./db/migrate.sh --demo 2>&1 | sed -n '/tables/,$p' | sed 's/^/  /'
else
  ./db/migrate.sh 2>&1 | sed -n '/tables/,$p' | sed 's/^/  /'
  ENG="$(psql -d "${WF_DB_NAME:-wf_dev}" -tAc 'SELECT count(*) FROM employment' 2>/dev/null || echo '?')"
  echo "  engagements: $ENG  (real data only — import the roster to populate)"
fi

# --- 2. passcode ------------------------------------------------------------
# A FIXED passcode for local runs, so it is the same every time and nobody has
# to hunt for it. Randomised only for --public, where the URL is on the open
# internet and a guessable passcode would be the weak link.
if [ "${1:-}" = "--public" ]; then
  PASSCODE="$(python3 -c 'import secrets,string;print("katbotz-"+"".join(secrets.choice(string.ascii_lowercase+string.digits) for _ in range(6)))')"
else
  PASSCODE="${WF_PASSCODE:-katbotz-demo}"
fi
echo "$PASSCODE" > "$RUN/passcode.txt"

# --- 3. backend -------------------------------------------------------------
echo
echo "2/3  API"
# The whole subshell is backgrounded and exec'd into uvicorn, so $! is the
# process we actually want to be able to stop later.
( cd backend && WF_DEV_LOGIN=1 WF_DEV_LOGIN_PASSCODE="$PASSCODE" \
    exec ./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning \
    > "$RUN/api.log" 2>&1 < /dev/null ) &
echo $! > "$RUN/api.pid"
wait_port 8000 25 || { echo "  API failed to start. Last lines:"; tail -15 "$RUN/api.log"; exit 1; }
echo "  listening on 127.0.0.1:8000"

# --- 4. frontend ------------------------------------------------------------
echo
echo "3/3  Web"
( cd frontend && exec npm run dev > "$RUN/web.log" 2>&1 < /dev/null ) &
echo $! > "$RUN/web.pid"
wait_port 3000 40 || { echo "  Web failed to start. Last lines:"; tail -15 "$RUN/web.log"; exit 1; }
echo "  listening on localhost:3000 (and proxying /api to the API)"
# Next.js compiles a page on first request. Warming it now means the first
# person to open the link does not stare at a blank tab for 20 seconds.
echo "  warming /live (first compile takes a moment)..."
curl -s -m 90 -o /dev/null "http://localhost:3000/live" 2>/dev/null || true

cat <<LOCAL

  Open:      http://localhost:3000/live
  Passcode:  $PASSCODE
  Stop:      ./demo.sh --stop
LOCAL

# --- 5. optional public URL -------------------------------------------------
if [ "${1:-}" = "--public" ]; then
  command -v cloudflared >/dev/null 2>&1 || { echo; echo "cloudflared is not installed:  brew install cloudflared"; exit 1; }
  cat <<WARN

  ------------------------------------------------------------------
  This will publish the app to a public URL. That includes the
  directory: 34 real names and email addresses.

  The passcode above is required to sign in, and the address list is
  withheld until it is entered. The URL is still public, and the
  tunnel is unencrypted-at-rest metadata through Cloudflare.

  Stop it the moment the demo is over:  ./demo.sh --stop
  ------------------------------------------------------------------
WARN
  printf '  Type yes to publish: '; read -r reply
  [ "$reply" = "yes" ] || { echo "  Not published. Still running locally."; exit 0; }

  echo "  Opening tunnel..."
  cloudflared tunnel --url http://localhost:3000 > "$RUN/tunnel.log" 2>&1 &
  echo $! > "$RUN/tunnel.pid"
  for i in $(seq 1 30); do
    URL="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$RUN/tunnel.log" 2>/dev/null | head -1 || true)"
    [ -n "$URL" ] && break; sleep 1
  done
  if [ -n "${URL:-}" ]; then
    echo "$URL" > "$RUN/public_url.txt"
    cat <<PUB

  PUBLIC URL:  $URL/live
  Passcode:    $PASSCODE

  Send both. Stop with ./demo.sh --stop when you are done.
PUB
  else
    echo "  Tunnel did not report a URL. Check $RUN/tunnel.log"
  fi
fi
