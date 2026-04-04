// src/routes/pedidos.js
import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireWorkspace } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'
import { generateNumeroPedido } from '../utils/pedidoUtils.js'

const router = Router()
router.use(authenticate)

// GET /api/pedidos?workspaceId=&estado=&page=&limit=
router.get('/', requireWorkspace('VIEWER'), async (req, res) => {
  const { estado, page = 1, limit = 20, search } = req.query
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where = {
    workspaceId: req.workspaceId,
    ...(estado && { estado }),
    ...(search && {
      OR: [
        { clienteNombre: { contains: search, mode: 'insensitive' } },
        { numeroPedido: { contains: search, mode: 'insensitive' } }
      ]
    })
  }

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        receta: { select: { nombre: true, categoria: true } },
        variante: { select: { nombre: true } },
        tags: true
      }
    }),
    prisma.pedido.count({ where })
  ])

  res.json({ data: pedidos, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
})

// GET /api/pedidos/:id
router.get('/:id', requireWorkspace('VIEWER'), async (req, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId },
    include: {
      receta: { include: { ingredientes: { include: { ingrediente: true } } } },
      variante: true,
      tags: true
    }
  })
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })
  res.json(pedido)
})

// POST /api/pedidos
router.post('/', requireWorkspace('EDITOR'), async (req, res) => {
  try {
    const schema = z.object({
      workspaceId:      z.string(),
      recetaId:         z.string(),
      varianteId:       z.string().optional(),
      cantidad:         z.number().int().min(1),
      clienteNombre:    z.string().optional(),
      clienteTelefono:  z.string().optional(),
      clienteDireccion: z.string().optional(),
      fechaEntrega:     z.string().optional(),
      notas:            z.string().optional(),
      tags:             z.array(z.string()).optional(),
      ventaRapida:      z.boolean().default(false)
    })
    const data = schema.parse(req.body)

    const [tasaActual, receta] = await Promise.all([
      prisma.tasaBCV.findFirst({ where: { workspaceId: req.workspaceId, esCurrent: true } }),
      prisma.receta.findUnique({ where: { id: data.recetaId }, include: { variantes: true } })
    ])

    if (!receta) return res.status(404).json({ error: 'Receta no encontrada' })

    const variante = data.varianteId ? receta.variantes.find(v => v.id === data.varianteId) : null
    const precioUnitario = variante?.precioEur ?? receta.precioVentaEur
    const tasa = tasaActual?.tasa ?? 0
    const totalEur = precioUnitario * data.cantidad
    const numeroPedido = await generateNumeroPedido(req.workspaceId)

    const pedido = await prisma.$transaction(async (tx) => {
      const p = await tx.pedido.create({
        data: {
          workspaceId: req.workspaceId,
          numeroPedido,
          recetaId: data.recetaId,
          varianteId: data.varianteId,
          cantidad: data.cantidad,
          precioUnitarioEur: precioUnitario,
          totalEur,
          totalBs: totalEur * tasa,
          costoTotalEur: receta.costoTotalEur * data.cantidad,
          gananciaEur: totalEur - (receta.costoTotalEur * data.cantidad),
          clienteNombre: data.clienteNombre,
          clienteTelefono: data.clienteTelefono,
          clienteDireccion: data.clienteDireccion,
          fechaEntrega: data.fechaEntrega ? new Date(data.fechaEntrega) : null,
          tasaBcvUsada: tasa,
          notas: data.notas,
          ventaRapida: data.ventaRapida,
          estado: 'PENDIENTE',
          tags: data.tags?.length ? { create: data.tags.map(tag => ({ tag })) } : undefined
        }
      })
      return p
    })

    res.status(201).json(pedido)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/pedidos/:id/estado
router.patch('/:id/estado', requireWorkspace('EDITOR'), async (req, res) => {
  const { estado } = req.body
  const estadosValidos = ['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'CANCELADO']
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` })
  }

  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })

  // Al entregar: descontar stock automáticamente
  if (estado === 'ENTREGADO' && pedido.estado !== 'ENTREGADO') {
    const receta = await prisma.receta.findUnique({
      where: { id: pedido.recetaId },
      include: { ingredientes: true }
    })
    if (receta) {
      await prisma.$transaction(
        receta.ingredientes.map(item =>
          prisma.ingrediente.update({
            where: { id: item.ingredienteId },
            data: { cantidadActual: { decrement: item.cantidad * pedido.cantidad } }
          })
        )
      )
    }
  }

  const updated = await prisma.pedido.update({
    where: { id: req.params.id },
    data: { estado }
  })

  await prisma.auditLog.create({
    data: {
      workspaceId: req.workspaceId, userId: req.user.id, canal: 'web',
      accion: 'cambiar_estado_pedido', entidad: 'Pedido', entidadId: pedido.id,
      payload: process.env.NODE_ENV === 'production'
        ? { estadoAnterior: pedido.estado, estadoNuevo: estado }
        : JSON.stringify({ estadoAnterior: pedido.estado, estadoNuevo: estado })
    }
  })

  res.json(updated)
})

// DELETE /api/pedidos/:id (solo OWNER, solo si está en PENDIENTE)
router.delete('/:id', requireWorkspace('OWNER'), async (req, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })
  if (pedido.estado !== 'PENDIENTE') {
    return res.status(400).json({ error: 'Solo se pueden eliminar pedidos en estado PENDIENTE' })
  }

  await prisma.pedido.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
