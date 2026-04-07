#!/bin/sh
set -e

echo "=== DULCEAPP Backend Startup ==="
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "PORT: ${PORT:-3000}"

echo "[1/2] Aplicando schema a la base de datos..."
node_modules/.bin/prisma db push --accept-data-loss --skip-generate
echo "[1/2] Schema aplicado correctamente."

echo "[2/2] Iniciando servidor..."
exec node src/index.js
