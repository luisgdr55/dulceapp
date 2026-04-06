#!/bin/sh
set -e

echo "=== DULCEAPP Backend Startup ==="
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "PORT: ${PORT:-3000}"

echo "[1/2] Iniciando servidor..."
node src/index.js &
SERVER_PID=$!

echo "[2/2] Aplicando schema a la base de datos..."
sleep 3
node_modules/.bin/prisma db push --accept-data-loss --skip-generate
echo "[2/2] Schema aplicado correctamente."

wait $SERVER_PID
