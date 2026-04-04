// prisma/seed.js
// Crea un workspace de ejemplo con recetas e ingredientes base venezolanos
// Ejecutar con: npm run db:seed

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Usuario dueña
  const passwordHash = await bcrypt.hash('dulceapp123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@dulceapp.ve' },
    update: {},
    create: {
      email: 'demo@dulceapp.ve',
      passwordHash,
      nombre: 'María',
      apellido: 'González'
    }
  })

  // Workspace
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
          nombre: 'María',
          apellido: 'González',
          negocio: 'Dulces de María',
          ciudad: 'Caracas',
          email: 'demo@dulceapp.ve',
          telefono: '+58 412 555 0000',
          monedaPrincipal: 'EUR'
        }
      }
    }
  })

  // Tasa BCV inicial
  await prisma.tasaBCV.upsert({
    where: { id: 'seed-tasa' },
    update: { tasa: 46.5 },
    create: {
      id: 'seed-tasa',
      workspaceId: workspace.id,
      tasa: 46.5,
      esCurrent: true,
      fuente: 'manual'
    }
  })

  // Ingredientes base
  const ingredientesData = [
    { nombre: 'Harina de trigo', categoria: 'Harinas', unidad: 'kg', cantidadActual: 10, cantidadMinima: 2, precioEur: 0.85 },
    { nombre: 'Azúcar blanca', categoria: 'Endulzantes', unidad: 'kg', cantidadActual: 8, cantidadMinima: 2, precioEur: 0.70 },
    { nombre: 'Mantequilla', categoria: 'Lácteos', unidad: 'kg', cantidadActual: 3, cantidadMinima: 1, precioEur: 4.50 },
    { nombre: 'Huevos', categoria: 'Huevos', unidad: 'unidad', cantidadActual: 30, cantidadMinima: 12, precioEur: 0.20 },
    { nombre: 'Chocolate amargo 70%', categoria: 'Chocolates', unidad: 'kg', cantidadActual: 1.5, cantidadMinima: 0.5, precioEur: 8.00 },
    { nombre: 'Leche entera', categoria: 'Lácteos', unidad: 'litro', cantidadActual: 5, cantidadMinima: 2, precioEur: 0.90 },
    { nombre: 'Crema de leche', categoria: 'Lácteos', unidad: 'litro', cantidadActual: 2, cantidadMinima: 0.5, precioEur: 2.50 },
    { nombre: 'Levadura seca', categoria: 'Leudantes', unidad: 'g', cantidadActual: 200, cantidadMinima: 50, precioEur: 0.025 },
    { nombre: 'Cacao en polvo', categoria: 'Chocolates', unidad: 'kg', cantidadActual: 0.8, cantidadMinima: 0.3, precioEur: 5.50 },
    { nombre: 'Vainilla líquida', categoria: 'Esencias', unidad: 'ml', cantidadActual: 150, cantidadMinima: 50, precioEur: 0.015 },
    { nombre: 'Sal', categoria: 'Condimentos', unidad: 'kg', cantidadActual: 1, cantidadMinima: 0.2, precioEur: 0.40 },
    { nombre: 'Polvo de hornear', categoria: 'Leudantes', unidad: 'g', cantidadActual: 300, cantidadMinima: 100, precioEur: 0.010 },
    // Accesorios
    { nombre: 'Caja kraft 25cm', categoria: 'Empaques', unidad: 'unidad', cantidadActual: 20, cantidadMinima: 10, precioEur: 0.80, esAccesorio: true },
    { nombre: 'Cinta decorativa dorada', categoria: 'Empaques', unidad: 'metro', cantidadActual: 15, cantidadMinima: 5, precioEur: 0.30, esAccesorio: true },
    { nombre: 'Bolsas celofán', categoria: 'Empaques', unidad: 'unidad', cantidadActual: 50, cantidadMinima: 20, precioEur: 0.15, esAccesorio: true }
  ]

  const ingredientes = {}
  for (const data of ingredientesData) {
    const ing = await prisma.ingrediente.create({
      data: { workspaceId: workspace.id, ...data, esAccesorio: data.esAccesorio ?? false }
    })
    ingredientes[data.nombre] = ing
  }

  // Recetas
  const recetasData = [
    {
      nombre: 'Torta de Chocolate',
      categoria: 'Tortas',
      descripcion: 'Torta húmeda de chocolate belga con ganache',
      porciones: 12,
      tiempoPrep: 90,
      costoIngredientesEur: 6.50,
      costoGasEur: 0.80,
      costoEmpaqueEur: 1.20,
      precioVentaEur: 18.00,
      variantes: [
        { nombre: 'Mediana (12 porciones)', precioEur: 18.00 },
        { nombre: 'Grande (20 porciones)', precioEur: 28.00 },
        { nombre: 'XL para eventos', precioEur: 45.00 }
      ]
    },
    {
      nombre: 'Galletas de Mantequilla',
      categoria: 'Galletas',
      descripcion: 'Galletas tipo shortbread con chispas de chocolate',
      porciones: 24,
      tiempoPrep: 45,
      costoIngredientesEur: 2.20,
      costoGasEur: 0.40,
      costoEmpaqueEur: 0.60,
      precioVentaEur: 7.00,
      variantes: [
        { nombre: 'Docena (12 unidades)', precioEur: 7.00 },
        { nombre: '24 unidades', precioEur: 13.00 }
      ]
    },
    {
      nombre: 'Tres Leches',
      categoria: 'Tortas',
      descripcion: 'Bizcocho esponjoso empapado en tres tipos de leche',
      porciones: 16,
      tiempoPrep: 75,
      costoIngredientesEur: 5.80,
      costoGasEur: 0.70,
      costoEmpaqueEur: 1.00,
      precioVentaEur: 20.00,
      variantes: [
        { nombre: 'Bandeja estándar', precioEur: 20.00 },
        { nombre: 'Bandeja grande', precioEur: 32.00 }
      ]
    },
    {
      nombre: 'Cupcakes Decorados',
      categoria: 'Cupcakes',
      descripcion: 'Cupcakes con buttercream y decoración personalizada',
      porciones: 12,
      tiempoPrep: 60,
      costoIngredientesEur: 3.50,
      costoGasEur: 0.50,
      costoEmpaqueEur: 1.80,
      precioVentaEur: 12.00,
      variantes: [
        { nombre: 'Caja de 6', precioEur: 12.00 },
        { nombre: 'Caja de 12', precioEur: 22.00 }
      ]
    },
    {
      nombre: 'Quesillo Caramelizado',
      categoria: 'Postres',
      descripcion: 'Flan de huevo con caramelo venezolano tradicional',
      porciones: 10,
      tiempoPrep: 120,
      costoIngredientesEur: 3.20,
      costoGasEur: 0.60,
      costoEmpaqueEur: 0.80,
      precioVentaEur: 12.00
    }
  ]

  for (const data of recetasData) {
    const { variantes, ...recetaData } = data
    const costoTotal = recetaData.costoIngredientesEur + recetaData.costoGasEur + recetaData.costoEmpaqueEur
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
  const pedidosEjemplo = [
    { clienteNombre: 'Ana Pérez', clienteTelefono: '+58 412 111 2222', cantidad: 1, diasOffset: 3, estado: 'PENDIENTE' },
    { clienteNombre: 'Carlos Medina', clienteTelefono: '+58 424 333 4444', cantidad: 2, diasOffset: 1, estado: 'EN_PROCESO' },
    { clienteNombre: 'Luisa Torres', clienteTelefono: null, cantidad: 1, diasOffset: -2, estado: 'ENTREGADO' }
  ]

  const tasa = 46.5
  for (let i = 0; i < pedidosEjemplo.length; i++) {
    const ej = pedidosEjemplo[i]
    const receta = recetas[i % recetas.length]
    if (!receta) continue

    const totalEur = receta.precioVentaEur * ej.cantidad
    const fechaEntrega = new Date(Date.now() + ej.diasOffset * 86400000)

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
        fechaEntrega,
        tasaBcvUsada: tasa,
        estado: ej.estado
      }
    })
  }

  console.log('✅ Seed completado')
  console.log('   Usuario demo: demo@dulceapp.ve / dulceapp123')
  console.log(`   Workspace: ${workspace.slug}`)
  console.log(`   Ingredientes: ${ingredientesData.length}`)
  console.log(`   Recetas: ${recetasData.length}`)
  console.log(`   Pedidos de ejemplo: ${pedidosEjemplo.length}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
