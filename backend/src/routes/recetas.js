// src/routes/recetas.js
import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireWorkspace } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'

const router = Router()
router.use(authenticate)

// GET /api/recetas?workspaceId=&categoria=
router.get('/', requireWorkspace('VIEWER'), async (req, res) => {
  const { categoria, search, activa } = req.query
  const recetas = await prisma.receta.findMany({
    where: {
      workspaceId: req.workspaceId,
      ...(categoria && { categoria }),
      ...(activa !== undefined && { activa: activa === 'true' }),
      ...(search && { nombre: { contains: search, mode: 'insensitive' } })
    },
    include: {
      variantes: true,
      _count: { select: { pedidos: true } }
    },
    orderBy: { nombre: 'asc' }
  })
  res.json(recetas)
})

// GET /api/recetas/:id
router.get('/:id', requireWorkspace('VIEWER'), async (req, res) => {
  const receta = await prisma.receta.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId },
    include: {
      ingredientes: { include: { ingrediente: true } },
      variantes: true,
      _count: { select: { pedidos: true } }
    }
  })
  if (!receta) return res.status(404).json({ error: 'Receta no encontrada' })
  res.json(receta)
})

// POST /api/recetas
router.post('/', requireWorkspace('EDITOR'), async (req, res) => {
  try {
    const ingredienteSchema = z.object({
      ingredienteId: z.string(),
      cantidad: z.number().positive(),
      unidad: z.string()
    })
    const varianteSchema = z.object({
      nombre: z.string(),
      precioEur: z.number().min(0),
      descripcion: z.string().optional()
    })
    const schema = z.object({
      workspaceId: z.string(),
      nombre: z.string().min(1),
      descripcion: z.string().optional(),
      categoria: z.string().optional(),
      imagenUrl: z.string().optional(),
      porciones: z.number().int().min(1).default(1),
      tiempoPrep: z.number().int().optional(),
      costoIngredientesUsd: z.number().min(0).default(0),
      costoGasEur: z.number().min(0).default(0),
      costoEmpaqueEur: z.number().min(0).default(0),
      precioVentaEur: z.number().min(0).default(0),
      notas: z.string().optional(),
      ingredientes: z.array(ingredienteSchema).optional(),
      variantes: z.array(varianteSchema).optional()
    })

    const data = schema.parse(req.body)

    // Obtener tasas para convertir costo de ingredientes USD → EUR
    const [tasaUSD, tasaEUR] = await Promise.all([
      prisma.tasaBCV.findFirst({ where: { workspaceId: req.workspaceId, esCurrent: true, moneda: 'USD' } }),
      prisma.tasaBCV.findFirst({ where: { workspaceId: req.workspaceId, esCurrent: true, moneda: 'EUR' } })
    ])
    const usdToEur = (tasaUSD?.tasa && tasaEUR?.tasa) ? tasaUSD.tasa / tasaEUR.tasa : 1
    const costoIngredientesEnEur = data.costoIngredientesUsd * usdToEur
    const costoTotal = costoIngredientesEnEur + data.costoGasEur + data.costoEmpaqueEur
    const margenGanancia = data.precioVentaEur > 0
      ? ((data.precioVentaEur - costoTotal) / data.precioVentaEur) * 100
      : 0

    const receta = await prisma.receta.create({
      data: {
        workspaceId: req.workspaceId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        imagenUrl: data.imagenUrl,
        porciones: data.porciones,
        tiempoPrep: data.tiempoPrep,
        costoIngredientesUsd: data.costoIngredientesUsd,
        costoGasEur: data.costoGasEur,
        costoEmpaqueEur: data.costoEmpaqueEur,
        costoTotalEur: costoTotal,
        precioVentaEur: data.precioVentaEur,
        margenGanancia,
        notas: data.notas,
        ingredientes: data.ingredientes?.length
          ? { create: data.ingredientes }
          : undefined,
        variantes: data.variantes?.length
          ? { create: data.variantes }
          : undefined
      },
      include: { ingredientes: true, variantes: true }
    })

    res.status(201).json(receta)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/recetas/:id
router.put('/:id', requireWorkspace('EDITOR'), async (req, res) => {
  try {
    const existing = await prisma.receta.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId }
    })
    if (!existing) return res.status(404).json({ error: 'Receta no encontrada' })

    const { ingredientes, variantes, workspaceId: _, ...rest } = req.body

    // Obtener tasas para recalcular conversión USD → EUR
    const [tasaUSD, tasaEUR] = await Promise.all([
      prisma.tasaBCV.findFirst({ where: { workspaceId: req.workspaceId, esCurrent: true, moneda: 'USD' } }),
      prisma.tasaBCV.findFirst({ where: { workspaceId: req.workspaceId, esCurrent: true, moneda: 'EUR' } })
    ])
    const usdToEur = (tasaUSD?.tasa && tasaEUR?.tasa) ? tasaUSD.tasa / tasaEUR.tasa : 1
    const costoUsd = rest.costoIngredientesUsd ?? existing.costoIngredientesUsd
    const costoIngredientesEnEur = costoUsd * usdToEur
    const costoTotal = costoIngredientesEnEur
      + (rest.costoGasEur ?? existing.costoGasEur)
      + (rest.costoEmpaqueEur ?? existing.costoEmpaqueEur)

    const precioVenta = rest.precioVentaEur ?? existing.precioVentaEur
    const margenGanancia = precioVenta > 0 ? ((precioVenta - costoTotal) / precioVenta) * 100 : 0

    // Reconstruir ingredientes y variantes si se envían
    const receta = await prisma.$transaction(async (tx) => {
      if (ingredientes !== undefined) {
        await tx.recetaIngrediente.deleteMany({ where: { recetaId: req.params.id } })
        if (ingredientes.length) {
          await tx.recetaIngrediente.createMany({
            data: ingredientes.map(i => ({ ...i, recetaId: req.params.id }))
          })
        }
      }
      if (variantes !== undefined) {
        await tx.recetaVariante.deleteMany({ where: { recetaId: req.params.id } })
        if (variantes.length) {
          await tx.recetaVariante.createMany({
            data: variantes.map(v => ({ ...v, recetaId: req.params.id }))
          })
        }
      }

      return tx.receta.update({
        where: { id: req.params.id },
        data: { ...rest, costoTotalEur: costoTotal, margenGanancia },
        include: { ingredientes: true, variantes: true }
      })
    })

    res.json(receta)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/recetas/:id
router.delete('/:id', requireWorkspace('OWNER'), async (req, res) => {
  const receta = await prisma.receta.findFirst({
    where: { id: req.params.id, workspaceId: req.workspaceId }
  })
  if (!receta) return res.status(404).json({ error: 'Receta no encontrada' })

  // Soft delete — marcar como inactiva para no romper historial de pedidos
  await prisma.receta.update({ where: { id: req.params.id }, data: { activa: false } })
  res.json({ ok: true })
})

export default router
