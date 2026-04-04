#!/bin/sh
echo "Iniciando servidor..."
node src/index.js &
SERVER_PID=$!
echo "Ejecutando prisma db push..."
npx prisma db push --accept-data-loss
echo "DB sincronizada. Servidor corriendo."
wait $SERVER_PID
