#!/bin/sh
echo "=== DULCEAPP Backend ==="
npx prisma db push --accept-data-loss --skip-generate
echo "DB sincronizada. Iniciando servidor..."
exec node src/index.js
