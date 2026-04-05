// src/routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { signToken, authenticate } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const schema = z.object({
      email:    z.string().email(),
      password: z.string().min(8),
      nombre:   z.string().min(1),
      apellido: z.string().optional().default(''),
      negocio:  z.string().min(1),
      ciudad:   z.string().optional().default('')
    })
    const data = schema.parse(req.body)

    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) return res.status(409).json({ error: 'Este email ya está registrado' })

    const passwordHash = await bcrypt.hash(data.password, 12)
    const slug = data.negocio
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 40) + '-' + Date.now().toString(36)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        nombre: data.nombre,
        apellido: data.apellido,
        memberships: {
          create: {
            role: 'OWNER',
            workspace: {
              create: {
                slug,
                nombre: data.negocio,
                plan: 'FREE',
                businessConfig: {
                  create: {
                    nombre: data.nombre,
                    apellido: data.apellido,
                    negocio: data.negocio,
                    ciudad: data.ciudad,
                    email: data.email,
                    monedaPrincipal: 'EUR'
                  }
                },
                tasasBCV: {
                  createMany: {
                    data: [
                      { moneda: 'EUR', tasa: 46.5, esCurrent: true, fuente: 'manual' },
                      { moneda: 'USD', tasa: 36.5, esCurrent: true, fuente: 'manual' }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      include: {
        memberships: { include: { workspace: { include: { businessConfig: true } } } }
      }
    })

    const workspace = user.memberships[0].workspace
    const token = await signToken({ userId: user.id, email: user.email })

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, nombre: user.nombre },
      workspace: { id: workspace.id, slug: workspace.slug, nombre: workspace.nombre, role: 'OWNER' }
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = z.object({
      email:    z.string().email(),
      password: z.string().min(1)
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: { include: { businessConfig: true } } }
    })

    const token = await signToken({ userId: user.id, email: user.email })

    res.json({
      token,
      user: { id: user.id, email: user.email, nombre: user.nombre, apellido: user.apellido },
      workspaces: memberships.map(m => ({
        id: m.workspace.id,
        slug: m.workspace.slug,
        nombre: m.workspace.nombre,
        plan: m.workspace.plan,
        role: m.role,
        businessConfig: m.workspace.businessConfig
      }))
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, nombre: true, apellido: true, createdAt: true }
  })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json(user)
})

export default router
