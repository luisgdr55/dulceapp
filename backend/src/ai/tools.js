// src/ai/tools.js
// Implementación real de cada tool — valida con Zod, ejecuta en DB, registra en AuditLog

import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { generateNumeroPedido } from '../utils/pedidoUtils.js'

// En prod (PostgreSQL) payload es Json nativo; en dev (SQLite) es String
const auditPayload = (obj) =>
  process.env.NODE_ENV === 'production' ? obj : JSON.stringify(obj)

export async function executeAITool({ toolName, params, workspaceId, userId, canal }) {
  const context = { workspaceId, userId, canal }
  const handlers = {
    crear_pedido:          () => crearPedido(params, context),
    venta_rapida:          () => ventaRapida(params, context),
    actualizar_stock:      () => actualizarStock(params, context),
    agregar_ingrediente:   () => agregarIngrediente(params, context),
    actualizar_tasa_bcv:   () => actualizarTasaBCV(params, context),
    analizar_rentabilidad: () => analizarRentabilidad(params, context),
    proyectar_demanda:     () => proyectarDemanda(params, context),
    resumen_negocio:       () => resumenNegocio(params, context),
    alertas_stock:         () => alertasStock(params, context),
  }
  const handler = handlers[toolName]
  if (!handler) throw new Error(`Tool desconocida: ${toolName}`)
  return handler()
}

// ─── Herramientas de escritura ────────────────────────────────────────────────

async function crearPedido(params, { workspaceId, userId, canal }) {
  const schema = z.object({
    recetaId:         z.string(),
    varianteId:       z.string().optional(),
    cantidad:         z.number().int().min(1),
    clienteNombre:    z.string().optional(),
    clienteTelefono:  z.string().optional(),
    clienteDireccion: z.string().optional(),
    fechaEntrega:     z.string().optional(),
    notas:            z.string().optional()
  })
  const data = schema.parse(params)

  const [tasaActual, receta] = await Promise.all([
    prisma.tasaBCV.findFirst({ where: { workspaceId, esCurrent: true, moneda: 'EUR' } }),
    prisma.receta.findUnique({ where: { id: data.recetaId }, include: { variantes: true } })
  ])

  if (!receta) throw new Error('Receta no encontrada')

  const variante = data.varianteId ? receta.variantes.find(v => v.id === data.varianteId) : null
  const precioUnitario = variante?.precioEur ?? receta.precioVentaEur
  const tasa = tasaActual?.tasa ?? 0
  const totalEur = precioUnitario * data.cantidad
  const totalBs  = totalEur * tasa
  const costoTotal = receta.costoTotalEur * data.cantidad
  const ganancia   = totalEur - costoTotal
  const numeroPedido = await generateNumeroPedido(workspaceId)

  const pedido = await prisma.pedido.create({
    data: {
      workspaceId, numeroPedido,
      recetaId: data.recetaId,
      varianteId: data.varianteId,
      cantidad: data.cantidad,
      precioUnitarioEur: precioUnitario,
      totalEur, totalBs,
      costoTotalEur: costoTotal,
      gananciaEur: ganancia,
      clienteNombre: data.clienteNombre,
      clienteTelefono: data.clienteTelefono,
      clienteDireccion: data.clienteDireccion,
      fechaEntrega: data.fechaEntrega ? new Date(data.fechaEntrega) : null,
      tasaBcvUsada: tasa,
      notas: data.notas,
      estado: 'PENDIENTE'
    }
  })

  await prisma.auditLog.create({
    data: {
      workspaceId, userId, canal,
      accion: 'crear_pedido', entidad: 'Pedido', entidadId: pedido.id,
      payload: auditPayload({ numeroPedido, totalEur, totalBs })
    }
  })

  return { ok: true, pedido: { id: pedido.id, numeroPedido, totalEur, totalBs, estado: 'PENDIENTE' } }
}

async function ventaRapida(params, context) {
  return crearPedido({ ...params, ventaRapida: true }, context)
}

async function actualizarStock(params, { workspaceId, userId, canal }) {
  const schema = z.object({
    ingredienteId: z.string(),
    nuevaCantidad: z.number().min(0),
    motivo:        z.string().optional()
  })
  const data = schema.parse(params)

  const ingrediente = await prisma.ingrediente.update({
    where: { id: data.ingredienteId, workspaceId },
    data:  { cantidadActual: data.nuevaCantidad }
  })

  await prisma.auditLog.create({
    data: {
      workspaceId, userId, canal,
      accion: 'actualizar_stock', entidad: 'Ingrediente', entidadId: ingrediente.id,
      payload: auditPayload({ nuevaCantidad: data.nuevaCantidad, motivo: data.motivo })
    }
  })

  const alertaStockBajo = ingrediente.cantidadActual <= ingrediente.cantidadMinima
  return { ok: true, ingrediente: { id: ingrediente.id, nombre: ingrediente.nombre, cantidadActual: ingrediente.cantidadActual }, alertaStockBajo }
}

async function agregarIngrediente(params, { workspaceId, userId, canal }) {
  const schema = z.object({
    nombre:         z.string(),
    categoria:      z.string().optional(),
    unidad:         z.string(),
    cantidadActual: z.number().min(0).default(0),
    cantidadMinima: z.number().min(0).default(0),
    precioUsd:      z.number().min(0),
    proveedor:      z.string().optional()
  })
  const data = schema.parse(params)

  const ingrediente = await prisma.ingrediente.create({ data: { workspaceId, ...data } })

  await prisma.auditLog.create({
    data: {
      workspaceId, userId, canal,
      accion: 'agregar_ingrediente', entidad: 'Ingrediente', entidadId: ingrediente.id,
      payload: auditPayload({ nombre: ingrediente.nombre })
    }
  })

  return { ok: true, ingrediente: { id: ingrediente.id, nombre: ingrediente.nombre } }
}

async function actualizarTasaBCV(params, { workspaceId, userId, canal }) {
  const { tasa, moneda = 'EUR' } = z.object({
    tasa:   z.number().positive(),
    moneda: z.enum(['EUR', 'USD']).default('EUR')
  }).parse(params)

  await prisma.$transaction([
    prisma.tasaBCV.updateMany({ where: { workspaceId, esCurrent: true, moneda }, data: { esCurrent: false } }),
    prisma.tasaBCV.create({ data: { workspaceId, moneda, tasa, esCurrent: true, fuente: canal === 'cron' ? 'auto-cron' : 'manual' } })
  ])

  await prisma.auditLog.create({
    data: {
      workspaceId, userId, canal,
      accion: 'actualizar_tasa_bcv', entidad: 'TasaBCV',
      payload: auditPayload({ tasa, moneda })
    }
  })

  return { ok: true, tasa, moneda }
}

// ─── Herramientas de análisis (lectura) ──────────────────────────────────────

async function analizarRentabilidad({ periodo = '30d' }, { workspaceId }) {
  const desde = periodoAFecha(periodo)
  const pedidos = await prisma.pedido.findMany({
    where: { workspaceId, estado: 'ENTREGADO', createdAt: { gte: desde } },
    include: { receta: { select: { nombre: true, categoria: true } } }
  })

  const porReceta = {}
  for (const p of pedidos) {
    const nombre = p.receta?.nombre || 'Sin receta'
    if (!porReceta[nombre]) porReceta[nombre] = { ventas: 0, ingresos: 0, costos: 0, ganancia: 0 }
    porReceta[nombre].ventas   += p.cantidad
    porReceta[nombre].ingresos += p.totalEur
    porReceta[nombre].costos   += p.costoTotalEur
    porReceta[nombre].ganancia += p.gananciaEur
  }

  const ranking = Object.entries(porReceta)
    .map(([nombre, data]) => ({
      nombre, ...data,
      margen: data.ingresos > 0 ? ((data.ganancia / data.ingresos) * 100).toFixed(1) : '0'
    }))
    .sort((a, b) => b.ganancia - a.ganancia)

  return { periodo, totalPedidos: pedidos.length, ranking }
}

async function proyectarDemanda({ diasProyeccion = 7 }, { workspaceId }) {
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const pedidos = await prisma.pedido.findMany({
    where: { workspaceId, estado: { in: ['ENTREGADO', 'EN_PROCESO'] }, createdAt: { gte: hace30dias } },
    include: { receta: { include: { ingredientes: { include: { ingrediente: true } } } } }
  })

  const consumoDiario = {}
  for (const pedido of pedidos) {
    for (const item of pedido.receta?.ingredientes || []) {
      const nombre = item.ingrediente.nombre
      if (!consumoDiario[nombre]) consumoDiario[nombre] = { id: item.ingredienteId, nombre, consumoTotal: 0, unidad: item.unidad }
      consumoDiario[nombre].consumoTotal += item.cantidad * pedido.cantidad
    }
  }

  const proyeccion = await Promise.all(
    Object.values(consumoDiario).map(async (item) => {
      const diario = item.consumoTotal / 30
      const necesario = diario * diasProyeccion
      const actual = await prisma.ingrediente.findUnique({ where: { id: item.id }, select: { cantidadActual: true } })
      return {
        ingrediente: item.nombre, unidad: item.unidad,
        stockActual: actual?.cantidadActual ?? 0,
        necesarioParaPeriodo: parseFloat(necesario.toFixed(2)),
        deficit: Math.max(0, necesario - (actual?.cantidadActual ?? 0))
      }
    })
  )

  return { diasProyeccion, proyeccion: proyeccion.sort((a, b) => b.deficit - a.deficit) }
}

async function resumenNegocio({ periodo = '7d' }, { workspaceId }) {
  const desde = periodoAFecha(periodo)
  const [pedidosEntregados, pedidosPendientes, ingredientesAll] = await Promise.all([
    prisma.pedido.aggregate({
      where: { workspaceId, estado: 'ENTREGADO', createdAt: { gte: desde } },
      _count: true, _sum: { totalEur: true, gananciaEur: true, totalBs: true }
    }),
    prisma.pedido.count({ where: { workspaceId, estado: { in: ['PENDIENTE', 'EN_PROCESO'] } } }),
    // Stock bajo — filtrado en JS (SQLite)
    prisma.ingrediente.findMany({
      where: { workspaceId },
      select: { cantidadActual: true, cantidadMinima: true }
    })
  ])

  const ingredientesBajoStock = ingredientesAll.filter(i => i.cantidadActual <= i.cantidadMinima).length

  return {
    periodo,
    ventas: pedidosEntregados._count,
    ingresosEur: parseFloat((pedidosEntregados._sum.totalEur || 0).toFixed(2)),
    ingresosBs:  parseFloat((pedidosEntregados._sum.totalBs || 0).toFixed(2)),
    gananciaEur: parseFloat((pedidosEntregados._sum.gananciaEur || 0).toFixed(2)),
    pedidosPendientes,
    ingredientesBajoStock
  }
}

async function alertasStock(_, { workspaceId }) {
  const ingredientes = await prisma.ingrediente.findMany({
    where: { workspaceId },
    select: { id: true, nombre: true, cantidadActual: true, cantidadMinima: true, unidad: true }
  })
  const bajos = ingredientes.filter(i => i.cantidadActual <= i.cantidadMinima)
  return { total: bajos.length, ingredientes: bajos }
}

function periodoAFecha(periodo) {
  const diasMap = { '7d': 7, '30d': 30, '90d': 90, 'mes_actual': 30, 'todo': 3650 }
  return new Date(Date.now() - (diasMap[periodo] ?? 30) * 24 * 60 * 60 * 1000)
}
