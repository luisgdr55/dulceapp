// src/index.js — Servidor principal DULCEAPP
import 'node:process'
import express from 'express'
import cors from 'cors'

// Rutas
import authRouter       from './routes/auth.js'
import workspacesRouter from './routes/workspaces.js'
import ingredientesRouter from './routes/ingredientes.js'
import recetasRouter    from './routes/recetas.js'
import pedidosRouter    from './routes/pedidos.js'
import dashboardRouter  from './routes/dashboard.js'
import aiRouter         from './routes/ai.js'
import telegramRouter   from './routes/telegram.js'

const app = express()
const PORT = process.env.PORT || 3000

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:4173'
  ],
  credentials: true
}))
app.use(express.json({ limit: '2mb' }))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), env: process.env.NODE_ENV })
})

// ─── Rutas de la API ──────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter)
app.use('/api/workspaces',  workspacesRouter)
app.use('/api/ingredientes', ingredientesRouter)
app.use('/api/recetas',     recetasRouter)
app.use('/api/pedidos',     pedidosRouter)
app.use('/api/dashboard',   dashboardRouter)
app.use('/api/ai',          aiRouter)
app.use('/api/telegram',    telegramRouter)

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` })
})

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err)
  res.status(500).json({ error: err.message || 'Error interno del servidor' })
})

// ─── Arrancar servidor ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🍰 DULCEAPP backend corriendo en http://localhost:${PORT}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   DB: ${process.env.DATABASE_URL?.includes('file:') ? 'SQLite (local)' : 'PostgreSQL'}`)

  // Inicializar bots de Telegram si hay sesiones activas
  if (process.env.NODE_ENV !== 'test') {
    import('./telegram/bot.js').then(({ initTelegramBots }) => {
      initTelegramBots().catch(err => {
        console.warn('[Telegram] No se pudieron inicializar los bots:', err.message)
      })
    }).catch(() => {
      console.warn('[Telegram] Módulo de bots no disponible')
    })
  }
})

export default app
