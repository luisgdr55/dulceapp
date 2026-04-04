// src/middleware/auth.js
// JWT con jose + autorización por workspace y rol

import * as jose from 'jose'
import { prisma } from '../utils/prisma.js'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

// ─── Generar token ───────────────────────────────────────────────────────────
export async function signToken(payload) {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '7d')
    .sign(secret)
}

// ─── Verificar token ─────────────────────────────────────────────────────────
export async function verifyToken(token) {
  const { payload } = await jose.jwtVerify(token, secret)
  return payload
}

// ─── Middleware: autenticar usuario ─────────────────────────────────────────
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' })
    }
    const token = authHeader.slice(7)
    const payload = await verifyToken(token)
    req.user = { id: payload.userId, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

// ─── Middleware: verificar acceso al workspace ───────────────────────────────
// Uso: router.get('/ruta', requireWorkspace('VIEWER'), handler)
export function requireWorkspace(minRole = 'VIEWER') {
  const ROLES = { VIEWER: 0, EDITOR: 1, OWNER: 2 }

  return async (req, res, next) => {
    // workspaceId puede venir en query, params o body
    const workspaceId =
      req.query.workspaceId ||
      req.params.workspaceId ||
      req.body?.workspaceId

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.user.id, workspaceId } }
    })

    if (!member) {
      return res.status(403).json({ error: 'Sin acceso a este workspace' })
    }

    if (ROLES[member.role] < ROLES[minRole]) {
      return res.status(403).json({ error: `Se requiere rol ${minRole} o superior` })
    }

    req.workspaceId = workspaceId
    req.workspaceRole = member.role
    next()
  }
}

// ─── Autenticar sesión de Telegram ───────────────────────────────────────────
export async function authenticateTelegram(chatId) {
  if (!chatId) return null
  return prisma.telegramSession.findFirst({
    where: { chatId: String(chatId), activa: true },
    include: { workspace: true }
  })
}
