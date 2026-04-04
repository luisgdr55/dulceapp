#!/bin/sh
echo "Iniciando servidor..."
node src/index.js &
SERVER_PID=$!
echo "Esperando que el servidor arranque..."
sleep 5
echo "Ejecutando prisma db push..."
npx prisma db push --accept-data-loss &
echo "Servidor listo."
wait $SERVER_PID
