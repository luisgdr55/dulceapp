// src/routes/ai.js
import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireWorkspace } from '../middleware/auth.js'
import { processAIMessage, confirmAIAction } from '../ai/aiService.js'

const router = Router()
router.use(authenticate)

// POST /api/ai/chat?workspaceId=
router.post('/chat', requireWorkspace('EDITOR'), async (req, res) => {
  try {
    const { message, conversationId } = z.object({
      message: z.string().min(1).max(2000),
      conversationId: z.string().nullable().optional()
    }).parse(req.body)

    const result = await processAIMessage({
      workspaceId: req.workspaceId,
      userId: req.user.id,
      canal: 'web',
      userMessage: message,
      conversationId: conversationId || undefined
    })

    res.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    console.error('[AI chat]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ai/confirm?workspaceId=
router.post('/confirm', requireWorkspace('EDITOR'), async (req, res) => {
  try {
    const { actionId } = z.object({ actionId: z.string() }).parse(req.body)
    const resultado = await confirmAIAction({
      actionId,
      workspaceId: req.workspaceId,
      userId: req.user.id
    })
    res.json({ ok: true, resultado })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ai/conversations?workspaceId=
router.get('/conversations', requireWorkspace('VIEWER'), async (req, res) => {
  const { prisma } = await import('../utils/prisma.js')
  const conversations = await prisma.aIConversation.findMany({
    where: { workspaceId: req.workspaceId, activa: true },
    select: { id: true, canal: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 20
  })
  res.json(conversations)
})

export default router
