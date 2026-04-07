#!/bin/sh
echo "=== DULCEAPP Backend ==="
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "PORT: ${PORT:-3000}"
exec node src/index.js
