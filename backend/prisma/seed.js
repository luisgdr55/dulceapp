// prisma/seed.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpiar datos existentes del workspace demo para re-seed limpio
  const existingWorkspace = await prisma.workspace.findUnique({ where: { slug: 'dulces-maria-demo' } })
  if (existingWorkspace) {
    const wid = existingWorkspace.id
    await prisma.pedido.deleteMany({ where: { workspaceId: wid } })
    await prisma.receta.deleteMany({ where: { workspaceId: wid } })
    await prisma.ingrediente.deleteMany({ where: { workspaceId: wid } })
    await prisma.tasaBCV.deleteMany({ where: { workspaceId: wid } })
  }

  const passwordHash = await bcrypt.hash('dulceapp123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@dulceapp.ve' },
    update: {},
    create: { email: 'demo@dulceapp.ve', passwordHash, nombre: 'María', apellido: 'González' }
  })

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'dulces-maria-demo' },
    update: {},
    create: {
      slug: 'dulces-maria-demo',
      nombre: 'Dulces de María',
      plan: 'PRO',
      members: { create: { userId: user.id, role: 'OWNER' } },
      businessConfig: {
        create: {
          nombre: 'María', apellido: 'González',
          negocio: 'Dulces de María', ciudad: 'Caracas',
          email: 'demo@dulceapp.ve', telefono: '+58 412 555 0000',
          monedaPrincipal: 'EUR'
        }
      }
    }
  })

  await prisma.tasaBCV.upsert({
    where: { id: 'seed-tasa-eur' },
    update: { tasa: 46.5 },
    create: { id: 'seed-tasa-eur', workspaceId: workspace.id, moneda: 'EUR', tasa: 46.5, esCurrent: true, fuente: 'manual' }
  })
  await prisma.tasaBCV.upsert({
    where: { id: 'seed-tasa-usd' },
    update: { tasa: 36.5 },
    create: { id: 'seed-tasa-usd', workspaceId: workspace.id, moneda: 'USD', tasa: 36.5, esCurrent: true, fuente: 'manual' }
  })

  const ingredientesData = [
    // cantidadPorCompra = cuántas unidades trae el paquete que se compra
    // Ejemplo: harina 1kg a $0.85 → cantidadPorCompra: 1, costo: $0.85/kg
    // Azúcar bolsa 900g a $1.40 → cantidadPorCompra: 0.9kg, costo: $1.556/kg
    { nombre: 'Harina de trigo',      categoria: 'Harinas',      unidad: 'kg',     cantidadActual: 10,  cantidadMinima: 2,   precioUsd: 0.85,  cantidadPorCompra: 1 },
    { nombre: 'Azúcar blanca',        categoria: 'Endulzantes',  unidad: 'kg',     cantidadActual: 8,   cantidadMinima: 2,   precioUsd: 1.40,  cantidadPorCompra: 0.9 },  // bolsa 900g → $1.556/kg
    { nombre: 'Mantequilla',          categoria: 'Lácteos',      unidad: 'kg',     cantidadActual: 3,   cantidadMinima: 1,   precioUsd: 4.50,  cantidadPorCompra: 1 },
    { nombre: 'Huevos',               categoria: 'Huevos',       unidad: 'unidad', cantidadActual: 30,  cantidadMinima: 12,  precioUsd: 2.40,  cantidadPorCompra: 12 }, // cartón 12 → $0.20/u
    { nombre: 'Chocolate amargo 70%', categoria: 'Chocolates',   unidad: 'kg',     cantidadActual: 1.5, cantidadMinima: 0.5, precioUsd: 4.00,  cantidadPorCompra: 0.5 }, // barra 500g → $8/kg
    { nombre: 'Leche entera',         categoria: 'Lácteos',      unidad: 'litro',  cantidadActual: 5,   cantidadMinima: 2,   precioUsd: 0.90,  cantidadPorCompra: 1 },
    { nombre: 'Crema de leche',       categoria: 'Lácteos',      unidad: 'litro',  cantidadActual: 2,   cantidadMinima: 0.5, precioUsd: 1.25,  cantidadPorCompra: 0.5 }, // tetrapak 500ml → $2.50/L
    { nombre: 'Levadura seca',        categoria: 'Leudantes',    unidad: 'g',      cantidadActual: 200, cantidadMinima: 50,  precioUsd: 0.75,  cantidadPorCompra: 30 },  // sobrecito 30g → $0.025/g
    { nombre: 'Cacao en polvo',       categoria: 'Chocolates',   unidad: 'g',      cantidadActual: 800, cantidadMinima: 300, precioUsd: 2.75,  cantidadPorCompra: 500 }, // bolsa 500g → $0.0055/g
    { nombre: 'Vainilla líquida',     categoria: 'Esencias',     unidad: 'ml',     cantidadActual: 150, cantidadMinima: 50,  precioUsd: 1.80,  cantidadPorCompra: 120 }, // frasco 120ml → $0.015/ml
    { nombre: 'Sal',                  categoria: 'Condimentos',  unidad: 'kg',     cantidadActual: 1,   cantidadMinima: 0.2, precioUsd: 0.40,  cantidadPorCompra: 1 },
    { nombre: 'Polvo de hornear',     categoria: 'Leudantes',    unidad: 'g',      cantidadActual: 300, cantidadMinima: 100, precioUsd: 1.10,  cantidadPorCompra: 110 }, // lata 110g → $0.01/g
    { nombre: 'Caja kraft 25cm',      categoria: 'Empaques',     unidad: 'unidad', cantidadActual: 20,  cantidadMinima: 10,  precioUsd: 8.00,  cantidadPorCompra: 10,  esAccesorio: true }, // paquete 10 → $0.80/u
    { nombre: 'Cinta decorativa',     categoria: 'Empaques',     unidad: 'metro',  cantidadActual: 15,  cantidadMinima: 5,   precioUsd: 1.50,  cantidadPorCompra: 5,   esAccesorio: true }, // rollo 5m → $0.30/m
    { nombre: 'Bolsas celofán',       categoria: 'Empaques',     unidad: 'unidad', cantidadActual: 50,  cantidadMinima: 20,  precioUsd: 3.00,  cantidadPorCompra: 20,  esAccesorio: true }  // paquete 20 → $0.15/u
  ]

  for (const data of ingredientesData) {
    await prisma.ingrediente.create({
      data: {
        workspaceId: workspace.id, ...data,
        esAccesorio: data.esAccesorio ?? false,
        cantidadPorCompra: data.cantidadPorCompra ?? 1
      }
    })
  }

  const recetasData = [
    {
      nombre: 'Torta de Chocolate', categoria: 'Tortas',
      descripcion: 'Torta húmeda de chocolate belga con ganache',
      porciones: 12, tiempoPrep: 90,
      costoIngredientesUsd: 6.50, costoGasEur: 0.80, costoEmpaqueEur: 1.20, precioVentaEur: 18.00,
      variantes: [
        { nombre: 'Mediana (12 porciones)', precioEur: 18.00 },
        { nombre: 'Grande (20 porciones)',  precioEur: 28.00 },
        { nombre: 'XL para eventos',        precioEur: 45.00 }
      ]
    },
    {
      nombre: 'Galletas de Mantequilla', categoria: 'Galletas',
      descripcion: 'Galletas tipo shortbread con chispas de chocolate',
      porciones: 24, tiempoPrep: 45,
      costoIngredientesUsd: 2.20, costoGasEur: 0.40, costoEmpaqueEur: 0.60, precioVentaEur: 7.00,
      variantes: [
        { nombre: 'Docena (12 unidades)', precioEur: 7.00 },
        { nombre: '24 unidades',          precioEur: 13.00 }
      ]
    },
    {
      nombre: 'Tres Leches', categoria: 'Tortas',
      descripcion: 'Bizcocho esponjoso empapado en tres tipos de leche',
      porciones: 16, tiempoPrep: 75,
      costoIngredientesUsd: 5.80, costoGasEur: 0.70, costoEmpaqueEur: 1.00, precioVentaEur: 20.00,
      variantes: [
        { nombre: 'Bandeja estándar', precioEur: 20.00 },
        { nombre: 'Bandeja grande',   precioEur: 32.00 }
      ]
    },
    {
      nombre: 'Cupcakes Decorados', categoria: 'Cupcakes',
      descripcion: 'Cupcakes con buttercream y decoración personalizada',
      porciones: 12, tiempoPrep: 60,
      costoIngredientesUsd: 3.50, costoGasEur: 0.50, costoEmpaqueEur: 1.80, precioVentaEur: 12.00,
      variantes: [
        { nombre: 'Caja de 6',  precioEur: 12.00 },
        { nombre: 'Caja de 12', precioEur: 22.00 }
      ]
    },
    {
      nombre: 'Quesillo Caramelizado', categoria: 'Postres',
      descripcion: 'Flan de huevo con caramelo venezolano tradicional',
      porciones: 10, tiempoPrep: 120,
      costoIngredientesUsd: 3.20, costoGasEur: 0.60, costoEmpaqueEur: 0.80, precioVentaEur: 12.00
    }
  ]

  // Tasa de conversión USD→EUR para el seed (36.5 / 46.5 ≈ 0.785)
  const usdToEur = 36.5 / 46.5

  for (const data of recetasData) {
    const { variantes, ...recetaData } = data
    const costoIngredientesEnEur = recetaData.costoIngredientesUsd * usdToEur
    const costoTotal = costoIngredientesEnEur + recetaData.costoGasEur + recetaData.costoEmpaqueEur
    const margenGanancia = ((recetaData.precioVentaEur - costoTotal) / recetaData.precioVentaEur) * 100
    await prisma.receta.create({
      data: {
        workspaceId: workspace.id,
        ...recetaData,
        costoTotalEur: costoTotal,
        margenGanancia,
        variantes: variantes?.length ? { create: variantes } : undefined
      }
    })
  }

  // Pedidos de ejemplo
  const recetas = await prisma.receta.findMany({ where: { workspaceId: workspace.id }, take: 3 })
  const tasa = 46.5
  const pedidosEjemplo = [
    { clienteNombre: 'Ana Pérez',    clienteTelefono: '+58 412 111 2222', cantidad: 1, diasOffset: 3,  estado: 'PENDIENTE'  },
    { clienteNombre: 'Carlos Medina', clienteTelefono: '+58 424 333 4444', cantidad: 2, diasOffset: 1,  estado: 'EN_PROCESO' },
    { clienteNombre: 'Luisa Torres', clienteTelefono: null,                cantidad: 1, diasOffset: -2, estado: 'ENTREGADO'  }
  ]

  for (let i = 0; i < pedidosEjemplo.length; i++) {
    const ej = pedidosEjemplo[i]
    const receta = recetas[i % recetas.length]
    if (!receta) continue
    const totalEur = receta.precioVentaEur * ej.cantidad
    await prisma.pedido.create({
      data: {
        workspaceId: workspace.id,
        numeroPedido: `PED-2025-${String(i + 1).padStart(4, '0')}`,
        recetaId: receta.id,
        cantidad: ej.cantidad,
        precioUnitarioEur: receta.precioVentaEur,
        totalEur,
        totalBs: totalEur * tasa,
        costoTotalEur: receta.costoTotalEur * ej.cantidad,
        gananciaEur: (receta.precioVentaEur - receta.costoTotalEur) * ej.cantidad,
        clienteNombre: ej.clienteNombre,
        clienteTelefono: ej.clienteTelefono,
        fechaEntrega: new Date(Date.now() + ej.diasOffset * 86400000),
        tasaBcvUsada: tasa,
        estado: ej.estado
      }
    })
  }

  console.log('✅ Seed completado')
  console.log('   Usuario demo: demo@dulceapp.ve / dulceapp123')
  console.log(`   Workspace: ${workspace.slug} (id: ${workspace.id})`)
  console.log(`   Ingredientes: ${ingredientesData.length} | Recetas: ${recetasData.length} | Pedidos: ${pedidosEjemplo.length}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
