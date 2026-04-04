// src/utils/jsonField.js
// Abstrae la diferencia entre SQLite (campos Json como String) y PostgreSQL (Json nativo)
// En producción (PostgreSQL) los campos Json son objetos directamente.
// En desarrollo (SQLite) están serializados como string.

export function parseJsonField(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return value }
  }
  return value // ya es objeto (PostgreSQL)
}

export function stringifyJsonField(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value // ya es string (SQLite)
  return value // PostgreSQL: Prisma acepta el objeto directamente
}
