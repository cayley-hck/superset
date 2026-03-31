#!/bin/sh
set -e

echo "Starting all Next.js apps in production mode..."

cd /app

PORT=3001 /usr/bin/node apps/api/server.js &
api_pid=$!
PORT=3000 /usr/bin/node apps/web/server.js &
web_pid=$!
PORT=3003 /usr/bin/node apps/admin/server.js &
admin_pid=$!
PORT=3002 /usr/bin/node apps/marketing/server.js &
marketing_pid=$!
PORT=3004 /usr/bin/node apps/docs/server.js &
docs_pid=$!

cleanup() {
  kill "$api_pid" "$web_pid" "$admin_pid" "$marketing_pid" "$docs_pid" 2>/dev/null || true
}

trap cleanup INT TERM

echo "All apps started:"
echo "  api       -> http://localhost:3001"
echo "  web       -> http://localhost:3000"
echo "  marketing -> http://localhost:3002"
echo "  admin     -> http://localhost:3003"
echo "  docs      -> http://localhost:3004"

# Wait for any process to exit, then stop the rest so the container exits cleanly.
wait -n "$api_pid" "$web_pid" "$admin_pid" "$marketing_pid" "$docs_pid"
status=$?
cleanup
wait || true
exit "$status"
