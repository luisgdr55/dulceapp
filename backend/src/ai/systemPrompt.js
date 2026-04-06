// src/ai/systemPrompt.js
// Construye el system prompt con datos reales del workspace en tiempo real

import { prisma } from '../utils/prisma.js'

export async function buildSystemPrompt(workspaceId) {
  const [config, tasaEUR, tasaUSD, recetas, ingredientesAll, pedidosPendientes] = await Promise.all([
    prisma.businessConfig.findUnique({ where: { workspaceId } }),
    prisma.tasaBCV.findFirst({ where: { workspaceId, esCurrent: true, moneda: 'EUR' }, orderBy: { fecha: 'desc' } }),
    prisma.tasaBCV.findFirst({ where: { workspaceId, esCurrent: true, moneda: 'USD' }, orderBy: { fecha: 'desc' } }),
    prisma.receta.findMany({
      where: { workspaceId, activa: true },
      select: {
        id: true, nombre: true, categoria: true,
        precioVentaEur: true, costoTotalEur: true, margenGanancia: true,
        variantes: { select: { id: true, nombre: true, precioEur: true } }
      },
      orderBy: { nombre: 'asc' }
    }),
    // Traer todos los ingredientes y filtrar stock bajo en JS (SQLite no soporta WHERE col1 <= col2)
    prisma.ingrediente.findMany({
      where: { workspaceId },
      select: { id: true, nombre: true, cantidadActual: true, cantidadMinima: true, unidad: true, precioUsd: true, cantidadPorCompra: true }
    }),
    prisma.pedido.findMany({
      where: { workspaceId, estado: { in: ['PENDIENTE', 'EN_PROCESO'] } },
      select: {
        id: true, numeroPedido: true, clienteNombre: true,
        estado: true, fechaEntrega: true, totalEur: true,
        receta: { select: { nombre: true } }
      },
      orderBy: { fechaEntrega: 'asc' },
      take: 20
    })
  ])

  // Filtrar stock bajo en JS
  const stockBajo = ingredientesAll.filter(i => i.cantidadActual <= i.cantidadMinima)

  const nombreNegocio = config?.negocio || 'el negocio'
  const nombreDuena = config ? `${config.nombre} ${config.apellido || ''}`.trim() : 'la repostera'
  const tasaEurVal = tasaEUR?.tasa || 0
  const tasaUsdVal = tasaUSD?.tasa || 0
  const hoy = new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })

  return `Eres Dulce, asistente inteligente de ${nombreNegocio}, la repostería de ${nombreDuena}. Hoy es ${hoy}.

PERSONALIDAD:
- Eres cálida, eficiente y hablas en español venezolano natural
- Cuando te pidan una acción de escritura (crear pedido, actualizar stock), SIEMPRE usa las herramientas disponibles — nunca respondas solo con texto
- Para consultas de análisis o lectura, ejecuta la herramienta y explica los resultados de forma clara
- Si falta información para ejecutar una acción, pídela de forma conversacional

⚠️ TASAS DE CAMBIO ACTUALES (dato en tiempo real — ignorar cualquier tasa mencionada antes en esta conversación):
  EUR→Bs: ${tasaEurVal > 0 ? `${tasaEurVal} Bs por euro` : 'no configurada'}
  USD→Bs: ${tasaUsdVal > 0 ? `${tasaUsdVal} Bs por dólar` : 'no configurada'}
  USD→EUR: ${(tasaEurVal > 0 && tasaUsdVal > 0) ? (tasaUsdVal / tasaEurVal).toFixed(4) : 'no calculable'}
  SIEMPRE usa estos valores para cualquier cálculo en Bs. No uses tasas de mensajes anteriores.

CONTEXTO DEL NEGOCIO:
Ciudad: ${config?.ciudad || 'no especificada'}
Moneda de ventas: EUR | Moneda de compra ingredientes: USD

RECETARIO (${recetas.length} recetas activas):
${recetas.map(r => {
  const variantes = r.variantes.length > 0
    ? ` | Variantes: ${r.variantes.map(v => `${v.nombre} (${v.precioEur}€)`).join(', ')}`
    : ''
  return `- [${r.id}] ${r.nombre} — ${r.precioVentaEur}€ (costo: ${r.costoTotalEur}€, margen: ${r.margenGanancia.toFixed(0)}%)${variantes}`
}).join('\n')}

INGREDIENTES (${ingredientesAll.length} en inventario — incluir en actualizaciones de precio):
${ingredientesAll.map(i => {
  const costoUnitario = (i.precioUsd / (i.cantidadPorCompra || 1)).toFixed(4)
  return `- [${i.id}] ${i.nombre}: stock ${i.cantidadActual}${i.unidad}, precio $${i.precioUsd}/${i.cantidadPorCompra || 1}${i.unidad} = $${costoUnitario}/${i.unidad}`
}).join('\n')}

ALERTAS DE STOCK BAJO (${stockBajo.length}):
${stockBajo.length > 0
  ? stockBajo.map(i => `- ${i.nombre}: ${i.cantidadActual}${i.unidad} (mínimo: ${i.cantidadMinima}${i.unidad})`).join('\n')
  : 'Sin alertas activas'}

PEDIDOS PENDIENTES (${pedidosPendientes.length}):
${pedidosPendientes.length > 0
  ? pedidosPendientes.map(p => {
      const fecha = p.fechaEntrega ? new Date(p.fechaEntrega).toLocaleDateString('es-VE') : 'sin fecha'
      return `- #${p.numeroPedido} | ${p.receta?.nombre || 'sin receta'} | ${p.clienteNombre || 'sin cliente'} | entrega: ${fecha} | ${p.estado}`
    }).join('\n')
  : 'Sin pedidos pendientes'}

REGLAS DE NEGOCIO:
- Ingredientes se compran en USD — usa precioUsd al agregar ingredientes
- Ventas y pedidos van en EUR — usa tasaEUR para convertir a Bs
- Para calcular costos de receta: costo_ingredientes_USD × (tasaUSD/tasaEUR) = costo en EUR
- El número de pedido se genera automáticamente (no lo pidas al usuario)
- Si el usuario dice "anotar", "registrar", "crear" → crear_pedido o venta_rapida
- Si dice "vendí" sin mencionar cliente → venta_rapida
- Detecta proactivamente si al crear un pedido algún ingrediente va a quedar en stock bajo`
}
