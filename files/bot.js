// src/telegram/bot.js
// Bot de Telegram usando grammY — reutiliza el mismo AI Service que la PWA
// Cada workspace puede tener su propio bot o usar el bot central compartido

import { Bot, webhookCallback } from 'grammy'
import { prisma } from '../utils/prisma.js'
import { processAIMessage, confirmAIAction } from '../ai/aiService.js'
import { authenticateTelegram } from '../middleware/auth.js'

// Mapa de bots activos por workspace (evita recrear instancias)
const activeBots = new Map()

// ─── Inicializar todos los bots activos al arrancar el servidor ──────────────
export async function initTelegramBots() {
  const sessions = await prisma.telegramSession.findMany({
    where: { activa: true },
    include: { workspace: true }
  })

  for (const session of sessions) {
    await startBot(session)
  }

  console.log(`[Telegram] ${sessions.length} bots inicializados`)
}

// ─── Arrancar un bot individual ──────────────────────────────────────────────
export async function startBot(session) {
  if (activeBots.has(session.workspaceId)) return

  const bot = new Bot(session.botToken)

  // Comandos disponibles
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `¡Hola! Soy *Dulce* 🍰, tu asistente de ${session.workspace.nombre}.\n\n` +
      `Puedes decirme cosas como:\n` +
      `• "Anotar pedido de torta de chocolate para María, entrega el viernes"\n` +
      `• "¿Cómo van las ventas de esta semana?"\n` +
      `• "¿Qué ingredientes están por agotarse?"\n` +
      `• "Actualizar tasa BCV a 45.50"`,
      { parse_mode: 'Markdown' }
    )
  })

  bot.command('resumen', async (ctx) => {
    await handleMessage(ctx, session, 'Dame un resumen de ventas de esta semana')
  })

  bot.command('stock', async (ctx) => {
    await handleMessage(ctx, session, 'Muéstrame las alertas de stock')
  })

  bot.command('pedidos', async (ctx) => {
    await handleMessage(ctx, session, 'Muéstrame los pedidos pendientes')
  })

  // Mensajes de texto libres → IA
  bot.on('message:text', async (ctx) => {
    // Validar que el chatId pertenezca a este workspace
    if (String(ctx.chat.id) !== session.chatId) return

    await handleMessage(ctx, session, ctx.message.text)
  })

  // Callbacks para confirmar/cancelar acciones
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data

    if (data.startsWith('confirm:')) {
      const actionId = data.replace('confirm:', '')
      try {
        // Buscar el workspaceId de la sesión
        const telegramSession = await authenticateTelegram(ctx.chat?.id)
        if (!telegramSession) return ctx.answerCallbackQuery('Sin acceso')

        await confirmAIAction({ actionId, workspaceId: telegramSession.workspaceId, userId: null })
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })
        await ctx.answerCallbackQuery('✅ Acción ejecutada')
        await ctx.reply('¡Listo! La acción fue registrada correctamente.')
      } catch (err) {
        await ctx.answerCallbackQuery('❌ Error al ejecutar')
        await ctx.reply(`No pude ejecutar la acción: ${err.message}`)
      }
    }

    if (data.startsWith('cancel:')) {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })
      await ctx.answerCallbackQuery('Cancelado')
      await ctx.reply('De acuerdo, la acción fue cancelada.')
    }
  })

  bot.catch((err) => {
    console.error(`[Bot ${session.workspace.nombre}] Error:`, err)
  })

  // Usar long polling (Railway mantiene el proceso corriendo)
  bot.start()
  activeBots.set(session.workspaceId, bot)
}

// ─── Manejar un mensaje y enviar respuesta ───────────────────────────────────
async function handleMessage(ctx, session, texto) {
  // Indicador de escritura
  await ctx.replyWithChatAction('typing')

  try {
    const result = await processAIMessage({
      workspaceId: session.workspaceId,
      userId: null,   // Telegram no tiene userId de la app (puede mapearse después)
      canal: 'telegram',
      userMessage: texto
    })

    // Enviar respuesta de texto
    if (result.reply) {
      await ctx.reply(result.reply, { parse_mode: 'Markdown' })
    }

    // Si hay acciones pendientes de confirmación, mostrar botones
    for (const action of result.toolActions || []) {
      const resumen = formatActionSummary(action)
      await ctx.reply(
        `⚠️ *Acción pendiente de confirmación*\n\n${resumen}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirmar', callback_data: `confirm:${action.id}` },
              { text: '❌ Cancelar', callback_data: `cancel:${action.id}` }
            ]]
          }
        }
      )
    }

    // Actualizar última actividad
    await prisma.telegramSession.update({
      where: { workspaceId: session.workspaceId },
      data: { lastActivity: new Date() }
    })

  } catch (err) {
    console.error('[Telegram handleMessage]', err)
    await ctx.reply('Lo siento, tuve un problema procesando tu mensaje. Intenta de nuevo.')
  }
}

// ─── Formatear resumen de una acción para Telegram ──────────────────────────
function formatActionSummary(action) {
  const labels = {
    crear_pedido: '🛒 Crear pedido',
    venta_rapida: '💨 Venta rápida',
    actualizar_stock: '📦 Actualizar stock',
    agregar_ingrediente: '➕ Agregar ingrediente',
    actualizar_tasa_bcv: '💱 Actualizar tasa BCV'
  }

  const label = labels[action.tool] || action.tool
  const params = Object.entries(action.params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join('\n')

  return `*${label}*\n${params}`
}

// ─── Detener un bot ──────────────────────────────────────────────────────────
export async function stopBot(workspaceId) {
  const bot = activeBots.get(workspaceId)
  if (bot) {
    await bot.stop()
    activeBots.delete(workspaceId)
  }
}
