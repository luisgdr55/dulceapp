// Generador de número de pedido único por workspace
import { prisma } from './prisma.js'

export async function generateNumeroPedido(workspaceId) {
  const year = new Date().getFullYear()
  const prefix = `PED-${year}-`

  const ultimo = await prisma.pedido.findFirst({
    where: { workspaceId, numeroPedido: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' }
  })

  let siguiente = 1
  if (ultimo) {
    const partes = ultimo.numeroPedido.split('-')
    const num = parseInt(partes[partes.length - 1], 10)
    if (!isNaN(num)) siguiente = num + 1
  }

  return `${prefix}${String(siguiente).padStart(4, '0')}`
}
