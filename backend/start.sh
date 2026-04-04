#!/bin/sh
echo "Ejecutando prisma db push..."
npx prisma db push --accept-data-loss
echo "Tablas creadas. Iniciando servidor..."
node src/index.js
