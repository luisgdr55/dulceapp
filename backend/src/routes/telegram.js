// src/routes/telegram.js
import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireWorkspace } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'

const router = Router()
router.use(authenticate)

// GET /api/telegram/:workspaceId/status
router.get('/:workspaceId/status', requireWorkspace('VIEWER'), async (req, res) => {
  const session = await prisma.telegramSession.findUnique({
    where: { workspaceId: req.workspaceId }
  })
  res.json({
    conectado: !!session?.activa,
    chatId: session?.chatId || null,
    lastActivity: session?.lastActivity || null
  })
})

// POST /api/telegram/:workspaceId/connect
router.post('/:workspaceId/connect', requireWorkspace('OWNER'), async (req, res) => {
  try {
    const { botToken, chatId } = z.object({
      botToken: z.string().min(10),
      chatId:   z.string().min(1)
    }).parse(req.body)

    const session = await prisma.telegramSession.upsert({
      where: { workspaceId: req.workspaceId },
      create: { workspaceId: req.workspaceId, botToken, chatId, activa: true },
      update: { botToken, chatId, activa: true }
    })

    // Arrancar el bot dinámicamente
    const { startBot } = await import('../telegram/bot.js')
    await startBot({ ...session, workspace: { nombre: req.workspaceId } })

    res.json({ ok: true, chatId: session.chatId })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/telegram/:workspaceId/disconnect
router.delete('/:workspaceId/disconnect', requireWorkspace('OWNER'), async (req, res) => {
  const { stopBot } = await import('../telegram/bot.js')
  await stopBot(req.workspaceId)
  await prisma.telegramSession.updateMany({
    where: { workspaceId: req.workspaceId },
    data: { activa: false }
  })
  res.json({ ok: true })
})

export default router
