// src/routes/ingredientes.js
import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireWorkspace } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'

const router = Router()
router.use(authenticate)

// GET /api/ingredientes?workspaceId=&bajoStock=true&categoria=
router.get('/', requireWorkspace('VIEWER'), async (req, res) => {
  const { bajoStock, categoria, esAccesorio, search } = req.query

  const ingredientes = await prisma.ingrediente.findMany({
    where: {
      workspaceId: req.workspaceId,
      ...(categoria && { categoria }),
      ...(esAccesorio !== undefined && { esAccesorio: esAccesorio === 'true' }),
      ...(search && { nombre: { contains: search, mode: 'insensitive' } })
    },
    orderBy: { nombre: 'asc' }
  })

  // Filtro post-query para bajoStock (compara dos campos del mismo registro)
  const resultado = bajoStock === 'true'
    ? ingredientes.filter(i => i.cantidadActual <= i.cantidadMinima)
    : ingredientes

  res.json(resultado)
})

// GET /api/ingredientes/:id
router.get('/:id', requireWorkspace('VIEWER'), async (req, res) => {
  const ingrediente = await prisma.ingrediente.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!ingrediente) return res.status(404).json({ error: 'Ingrediente no encontrado' })
  res.json(ingrediente)
})

// POST /api/ingredientes
router.post('/', requireWorkspace('EDITOR'), async (req, res) => {
  try {
    const schema = z.object({
      workspaceId:    z.string(),
      nombre:         z.string().min(1),
      categoria:      z.string().optional(),
      unidad:         z.string().min(1),
      cantidadActual: z.number().min(0).default(0),
      cantidadMinima: z.number().min(0).default(0),
      precioUsd:           z.number().min(0),
      cantidadPorCompra:   z.number().positive().default(1),
      proveedor:      z.string().optional(),
      notas:          z.string().optional(),
      esAccesorio:    z.boolean().default(false)
    })
    const data = schema.parse(req.body)

    const ingrediente = await prisma.ingrediente.create({
      data: { ...data, workspaceId: req.workspaceId }
    })

    // Crear notificación si ya arranca en stock bajo
    if (data.cantidadActual <= data.cantidadMinima && data.cantidadMinima > 0) {
      await prisma.notificacion.create({
        data: {
          workspaceId: req.workspaceId,
          tipo: 'stock_bajo',
          titulo: 'Stock bajo al agregar',
          mensaje: `${data.nombre} fue agregado con stock por debajo del mínimo`,
          referenciaId: ingrediente.id
        }
      })
    }

    res.status(201).json(ingrediente)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/ingredientes/:id
router.put('/:id', requireWorkspace('EDITOR'), async (req, res) => {
  const existing = await prisma.ingrediente.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!existing) return res.status(404).json({ error: 'Ingrediente no encontrado' })

  const { workspaceId: _, ...updates } = req.body
  const updated = await prisma.ingrediente.update({
    where: { id: req.params.id },
    data: updates
  })

  // Verificar alerta de stock bajo después de actualizar
  if (updated.cantidadActual <= updated.cantidadMinima) {
    await prisma.notificacion.create({
      data: {
        workspaceId: req.workspaceId,
        tipo: 'stock_bajo',
        titulo: `Stock bajo: ${updated.nombre}`,
        mensaje: `Quedan ${updated.cantidadActual}${updated.unidad} (mínimo: ${updated.cantidadMinima}${updated.unidad})`,
        referenciaId: updated.id
      }
    })
  }

  res.json(updated)
})

// PATCH /api/ingredientes/:id — actualización parcial (precio, cantidadPorCompra, etc.)
router.patch('/:id', requireWorkspace('EDITOR'), async (req, res) => {
  const existing = await prisma.ingrediente.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!existing) return res.status(404).json({ error: 'Ingrediente no encontrado' })

  const allowed = ['precioUsd', 'cantidadPorCompra', 'cantidadActual', 'cantidadMinima', 'proveedor', 'notas']
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  )
  const updated = await prisma.ingrediente.update({
    where: { id: req.params.id },
    data: updates
  })
  res.json(updated)
})

// PATCH /api/ingredientes/:id/stock — ajuste rápido de cantidad
router.patch('/:id/stock', requireWorkspace('EDITOR'), async (req, res) => {
  const { cantidad, operacion = 'set' } = req.body
  // operacion: 'set' | 'increment' | 'decrement'

  const existing = await prisma.ingrediente.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!existing) return res.status(404).json({ error: 'Ingrediente no encontrado' })

  const nuevaCantidad = operacion === 'increment'
    ? existing.cantidadActual + cantidad
    : operacion === 'decrement'
      ? Math.max(0, existing.cantidadActual - cantidad)
      : cantidad

  const updated = await prisma.ingrediente.update({
    where: { id: req.params.id },
    data: { cantidadActual: nuevaCantidad }
  })

  res.json(updated)
})

// DELETE /api/ingredientes/:id
router.delete('/:id', requireWorkspace('OWNER'), async (req, res) => {
  const ingrediente = await prisma.ingrediente.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!ingrediente) return res.status(404).json({ error: 'Ingrediente no encontrado' })

  // Verificar que no esté en uso en recetas activas
  const enUso = await prisma.recetaIngrediente.count({
    where: {
      ingredienteId: req.params.id,
      receta: { activa: true }
    }
  })
  if (enUso > 0) {
    return res.status(400).json({ error: `Este ingrediente está en uso en ${enUso} receta(s) activa(s)` })
  }

  await prisma.ingrediente.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
