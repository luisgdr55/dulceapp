// src/routes/dashboard.js
import { Router } from 'express'
import { authenticate, requireWorkspace } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'

const router = Router()
router.use(authenticate)

// GET /api/dashboard?workspaceId=&periodo=7d|30d|mes_actual
router.get('/', requireWorkspace('VIEWER'), async (req, res) => {
  const { periodo = '7d' } = req.query
  const wid = req.workspaceId
  const desde = periodoAFecha(periodo)
  const ahora = new Date()

  const [
    ventasHoy,
    ventasPeriodo,
    pedidosPendientes,
    pedidosEnProceso,
    stockBajo,
    recetasTop,
    notificacionesSinLeer,
    tasaActual,
    ventasSemanaPasada,
    proximasEntregas
  ] = await Promise.all([

    // Ventas del día
    prisma.pedido.aggregate({
      where: { workspaceId: wid, estado: 'ENTREGADO', createdAt: { gte: startOfDay(ahora) } },
      _count: true,
      _sum: { totalEur: true, gananciaEur: true }
    }),

    // Ventas del período seleccionado
    prisma.pedido.aggregate({
      where: { workspaceId: wid, estado: 'ENTREGADO', createdAt: { gte: desde } },
      _count: true,
      _sum: { totalEur: true, totalBs: true, gananciaEur: true, costoTotalEur: true }
    }),

    // Pedidos pendientes
    prisma.pedido.count({ where: { workspaceId: wid, estado: 'PENDIENTE' } }),

    // Pedidos en proceso
    prisma.pedido.count({ where: { workspaceId: wid, estado: 'EN_PROCESO' } }),

    // Ingredientes con stock bajo
    prisma.$queryRaw`
      SELECT id, nombre, "cantidadActual", "cantidadMinima", unidad
      FROM "Ingrediente"
      WHERE "workspaceId" = ${wid}
        AND "cantidadActual" <= "cantidadMinima"
      ORDER BY ("cantidadActual" / NULLIF("cantidadMinima", 0)) ASC
      LIMIT 5
    `,

    // Top 5 recetas más vendidas en el período
    prisma.pedido.groupBy({
      by: ['recetaId'],
      where: { workspaceId: wid, estado: 'ENTREGADO', createdAt: { gte: desde }, recetaId: { not: null } },
      _count: { recetaId: true },
      _sum: { gananciaEur: true },
      orderBy: { _sum: { gananciaEur: 'desc' } },
      take: 5
    }),

    // Notificaciones sin leer
    prisma.notificacion.count({ where: { workspaceId: wid, leida: false } }),

    // Tasa BCV actual
    prisma.tasaBCV.findFirst({ where: { workspaceId: wid, esCurrent: true } }),

    // Ventas de la semana pasada (para comparativa)
    prisma.pedido.aggregate({
      where: {
        workspaceId: wid, estado: 'ENTREGADO',
        createdAt: {
          gte: new Date(Date.now() - 14 * 86400000),
          lt: new Date(Date.now() - 7 * 86400000)
        }
      },
      _sum: { totalEur: true }
    }),

    // Próximas entregas (hoy + mañana)
    prisma.pedido.findMany({
      where: {
        workspaceId: wid,
        estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
        fechaEntrega: { lte: new Date(Date.now() + 2 * 86400000) }
      },
      include: { receta: { select: { nombre: true } } },
      orderBy: { fechaEntrega: 'asc' },
      take: 10
    })
  ])

  // Resolver nombres de recetas top
  const recetaIds = recetasTop.map(r => r.recetaId).filter(Boolean)
  const recetasInfo = recetaIds.length > 0
    ? await prisma.receta.findMany({
        where: { id: { in: recetaIds } },
        select: { id: true, nombre: true }
      })
    : []

  const recetasTopConNombre = recetasTop.map(r => ({
    recetaId: r.recetaId,
    nombre: recetasInfo.find(ri => ri.id === r.recetaId)?.nombre || 'Desconocida',
    ventas: r._count.recetaId,
    gananciaEur: r._sum.gananciaEur || 0
  }))

  // Calcular variación respecto a semana pasada
  const ingresosActuales = ventasPeriodo._sum.totalEur || 0
  const ingresosPasados = ventasSemanaPasada._sum.totalEur || 0
  const variacion = ingresosPasados > 0
    ? ((ingresosActuales - ingresosPasados) / ingresosPasados) * 100
    : null

  res.json({
    periodo,
    tasaBCV: tasaActual?.tasa || 0,
    hoy: {
      ventas: ventasHoy._count,
      ingresosEur: ventasHoy._sum.totalEur || 0,
      gananciaEur: ventasHoy._sum.gananciaEur || 0
    },
    periodo_stats: {
      ventas: ventasPeriodo._count,
      ingresosEur: ventasPeriodo._sum.totalEur || 0,
      ingresosBs: ventasPeriodo._sum.totalBs || 0,
      gananciaEur: ventasPeriodo._sum.gananciaEur || 0,
      costoTotalEur: ventasPeriodo._sum.costoTotalEur || 0,
      variacionPct: variacion ? parseFloat(variacion.toFixed(1)) : null
    },
    pedidosPendientes,
    pedidosEnProceso,
    alertasStockBajo: stockBajo.length,
    stockBajo,
    recetasTop: recetasTopConNombre,
    notificacionesSinLeer,
    proximasEntregas
  })
})

// GET /api/dashboard/historial?workspaceId=&periodo=
// Serie temporal de ventas para gráfico
router.get('/historial', requireWorkspace('VIEWER'), async (req, res) => {
  const { periodo = '30d' } = req.query
  const desde = periodoAFecha(periodo)

  const pedidos = await prisma.pedido.findMany({
    where: { workspaceId: req.workspaceId, estado: 'ENTREGADO', createdAt: { gte: desde } },
    select: { createdAt: true, totalEur: true, gananciaEur: true },
    orderBy: { createdAt: 'asc' }
  })

  // Agrupar por día
  const porDia = {}
  for (const p of pedidos) {
    const dia = p.createdAt.toISOString().split('T')[0]
    if (!porDia[dia]) porDia[dia] = { fecha: dia, ingresos: 0, ganancia: 0, ventas: 0 }
    porDia[dia].ingresos += p.totalEur
    porDia[dia].ganancia += p.gananciaEur
    porDia[dia].ventas++
  }

  res.json(Object.values(porDia))
})

// GET /api/dashboard/notificaciones
router.get('/notificaciones', requireWorkspace('VIEWER'), async (req, res) => {
  const notificaciones = await prisma.notificacion.findMany({
    where: { workspaceId: req.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  res.json(notificaciones)
})

// PATCH /api/dashboard/notificaciones/leer
router.patch('/notificaciones/leer', requireWorkspace('EDITOR'), async (req, res) => {
  const { ids } = req.body
  await prisma.notificacion.updateMany({
    where: {
      workspaceId: req.workspaceId,
      ...(ids?.length ? { id: { in: ids } } : {})
    },
    data: { leida: true }
  })
  res.json({ ok: true })
})

// ─── Utilidades ──────────────────────────────────────────────────────────────
function periodoAFecha(periodo) {
  const dias = { '7d': 7, '30d': 30, '90d': 90, 'mes_actual': 30, 'todo': 3650 }
  return new Date(Date.now() - (dias[periodo] ?? 30) * 86400000)
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export default router
