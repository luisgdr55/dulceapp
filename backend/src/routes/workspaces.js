// src/routes/workspaces.js
import { Router } from 'express'
import { authenticate, requireWorkspace } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'

const router = Router()
router.use(authenticate)

// GET /api/workspaces — todos los workspaces del usuario autenticado
router.get('/', async (req, res) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.user.id },
    include: { workspace: { include: { businessConfig: true } } }
  })
  res.json(memberships.map(m => ({ ...m.workspace, role: m.role })))
})

// GET /api/workspaces/:workspaceId/config
router.get('/:workspaceId/config', requireWorkspace('VIEWER'), async (req, res) => {
  const config = await prisma.businessConfig.findUnique({
    where: { workspaceId: req.workspaceId }
  })
  res.json(config)
})

// PUT /api/workspaces/:workspaceId/config
router.put('/:workspaceId/config', requireWorkspace('OWNER'), async (req, res) => {
  const { nombre, apellido, negocio, ciudad, email, telefono, monedaPrincipal } = req.body

  const config = await prisma.businessConfig.upsert({
    where: { workspaceId: req.workspaceId },
    create: { workspaceId: req.workspaceId, nombre, apellido, negocio, ciudad, email, telefono, monedaPrincipal },
    update: { nombre, apellido, negocio, ciudad, email, telefono, monedaPrincipal }
  })

  // Sincronizar nombre del workspace
  await prisma.workspace.update({
    where: { id: req.workspaceId },
    data: { nombre: negocio }
  })

  res.json(config)
})

// GET /api/workspaces/:workspaceId/miembros
router.get('/:workspaceId/miembros', requireWorkspace('OWNER'), async (req, res) => {
  const miembros = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.workspaceId },
    include: { user: { select: { id: true, email: true, nombre: true, apellido: true } } }
  })
  res.json(miembros)
})

// POST /api/workspaces/:workspaceId/miembros — invitar por email
router.post('/:workspaceId/miembros', requireWorkspace('OWNER'), async (req, res) => {
  const { email, role = 'EDITOR' } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado. Debe registrarse primero.' })

  const exists = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: req.workspaceId } }
  })
  if (exists) return res.status(409).json({ error: 'El usuario ya es miembro' })

  const member = await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: req.workspaceId, role },
    include: { user: { select: { id: true, email: true, nombre: true } } }
  })

  res.status(201).json(member)
})

// DELETE /api/workspaces/:workspaceId/miembros/:userId
router.delete('/:workspaceId/miembros/:userId', requireWorkspace('OWNER'), async (req, res) => {
  // No puede removerse a sí mismo si es el único OWNER
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: 'No puedes removerte a ti mismo' })
  }
  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId: req.params.userId, workspaceId: req.workspaceId } }
  })
  res.json({ ok: true })
})

// GET /api/workspaces/:workspaceId/tasa-bcv
router.get('/:workspaceId/tasa-bcv', requireWorkspace('VIEWER'), async (req, res) => {
  const [actual, historial] = await Promise.all([
    prisma.tasaBCV.findFirst({ where: { workspaceId: req.workspaceId, esCurrent: true } }),
    prisma.tasaBCV.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { fecha: 'desc' },
      take: 30
    })
  ])
  res.json({ actual, historial })
})

// POST /api/workspaces/:workspaceId/tasa-bcv
router.post('/:workspaceId/tasa-bcv', requireWorkspace('EDITOR'), async (req, res) => {
  const tasa = parseFloat(req.body.tasa)
  if (!tasa || isNaN(tasa) || tasa <= 0) {
    return res.status(400).json({ error: 'Tasa inválida. Debe ser un número positivo.' })
  }
  await prisma.tasaBCV.updateMany({
    where: { workspaceId: req.workspaceId, esCurrent: true },
    data: { esCurrent: false }
  })
  const nueva = await prisma.tasaBCV.create({
    data: { workspaceId: req.workspaceId, tasa, esCurrent: true, fuente: 'manual' }
  })
  res.status(201).json(nueva)
})

export default router
