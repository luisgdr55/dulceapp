// src/pages/IAPage.jsx
// Chat con la IA "Dulce" — reutiliza el mismo AI Service del backend
// Soporta tool calls con tarjetas de confirmación

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore.js'
import { aiApi } from '../services/api.js'

const QUICK_ACTIONS = [
  { label: '📊 Resumen de la semana',     message: 'Dame un resumen de ventas de esta semana' },
  { label: '📦 Alertas de stock',         message: '¿Qué ingredientes están por agotarse?' },
  { label: '🛒 Ver pedidos pendientes',   message: 'Muéstrame los pedidos pendientes de hoy' },
  { label: '📈 ¿Qué vendo más?',          message: 'Analiza qué recetas me generan más ganancia este mes' },
  { label: '💱 Actualizar tasa BCV',      message: 'Quiero actualizar la tasa BCV' },
  { label: '🔮 Proyección de demanda',    message: 'Proyecta cuánto stock necesito para los próximos 7 días' },
]

export function IAPage() {
  const { activeWorkspaceId, conversationId, setConversationId, clearConversation } = useAppStore()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy **Dulce**, tu asistente de repostería 🍰\n\nPuedo ayudarte a registrar pedidos, revisar tu stock, analizar tus ventas y mucho más. ¿En qué te ayudo hoy?',
      id: 'welcome'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingActions, setPendingActions] = useState([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingActions])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return
    const userText = text.trim()
    setInput('')

    const userMsg = { role: 'user', content: userText, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const result = await aiApi.chat(activeWorkspaceId, userText, conversationId)

      // Guardar conversationId para continuidad
      if (result.conversationId && !conversationId) {
        setConversationId(result.conversationId)
      }

      // Agregar respuesta del asistente
      if (result.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.reply,
          id: Date.now() + 1
        }])
      }

      // Agregar acciones pendientes de confirmación
      if (result.toolActions?.length > 0) {
        setPendingActions(prev => [...prev, ...result.toolActions])
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Lo siento, tuve un problema: ${err.message}. Intenta de nuevo.`,
        id: Date.now() + 2,
        isError: true
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [activeWorkspaceId, conversationId, loading, setConversationId])

  const handleConfirm = async (action) => {
    try {
      await aiApi.confirm(activeWorkspaceId, action.id)
      setPendingActions(prev => prev.filter(a => a.id !== action.id))
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ ¡Listo! La acción fue ejecutada correctamente.`,
        id: Date.now()
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ No pude ejecutar la acción: ${err.message}`,
        id: Date.now(),
        isError: true
      }])
    }
  }

  const handleCancel = (actionId) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId))
    setMessages(prev => [...prev, {
      role: 'assistant', content: 'De acuerdo, la acción fue cancelada.', id: Date.now()
    }])
  }

  const handleNewChat = () => {
    clearConversation()
    setPendingActions([])
    setMessages([{
      role: 'assistant',
      content: '¡Nueva conversación iniciada! ¿En qué te ayudo?',
      id: 'new'
    }])
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatar}>🍰</div>
          <div>
            <p style={styles.headerName}>Dulce IA</p>
            <p style={styles.headerStatus}>
              {loading ? '⟳ Pensando...' : '● En línea'}
            </p>
          </div>
        </div>
        <button style={styles.newChatBtn} onClick={handleNewChat}>Nueva chat</button>
      </div>

      {/* Quick actions — solo si es el inicio */}
      {messages.length === 1 && (
        <div style={styles.quickActions}>
          {QUICK_ACTIONS.map(qa => (
            <button
              key={qa.label}
              style={styles.quickBtn}
              onClick={() => sendMessage(qa.message)}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Mensajes */}
      <div style={styles.messages}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              ...styles.bubble,
              ...(msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI),
              ...(msg.isError ? styles.bubbleError : {})
            }}
          >
            <SimpleMarkdown text={msg.content} />
          </div>
        ))}

        {/* Tarjetas de acciones pendientes */}
        {pendingActions.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            onConfirm={() => handleConfirm(action)}
            onCancel={() => handleCancel(action.id)}
          />
        ))}

        {loading && (
          <div style={{ ...styles.bubble, ...styles.bubbleAI }}>
            <span style={styles.typing}>● ● ●</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          style={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(input)
            }
          }}
          placeholder="Escribe aquí... (Enter para enviar)"
          rows={1}
          disabled={loading}
        />
        <button
          style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

// ── Tarjeta de confirmación de acción ────────────────────────────────────────
function ActionCard({ action, onConfirm, onCancel }) {
  const TOOL_LABELS = {
    crear_pedido:       { label: '🛒 Crear pedido', color: '#7B61C4' },
    venta_rapida:       { label: '💨 Venta rápida', color: '#7B61C4' },
    actualizar_stock:   { label: '📦 Actualizar stock', color: '#F0A500' },
    agregar_ingrediente: { label: '➕ Agregar ingrediente', color: '#2D6A4F' },
    actualizar_tasa_bcv: { label: '💱 Actualizar tasa BCV', color: '#185FA5' }
  }
  const meta = TOOL_LABELS[action.tool] || { label: action.tool, color: '#888' }

  return (
    <div style={styles.actionCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ ...styles.actionBadge, background: meta.color }}>{meta.label}</span>
        <span style={styles.actionPendiente}>Pendiente de confirmación</span>
      </div>
      <div style={styles.actionParams}>
        {Object.entries(action.params).map(([k, v]) => v != null && (
          <div key={k} style={styles.paramRow}>
            <span style={styles.paramKey}>{k}</span>
            <span style={styles.paramVal}>{String(v)}</span>
          </div>
        ))}
      </div>
      <div style={styles.actionBtns}>
        <button style={styles.confirmBtn} onClick={onConfirm}>✓ Confirmar</button>
        <button style={styles.cancelBtn} onClick={onCancel}>✕ Cancelar</button>
      </div>
    </div>
  )
}

// ── Renderer de markdown básico ───────────────────────────────────────────────
function SimpleMarkdown({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part
      )}
    </p>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100dvh - 80px)',
    maxWidth: 700,
    margin: '0 auto',
    gap: 0
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 0 1rem',
    borderBottom: '1px solid rgba(0,0,0,0.08)'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#ede9ff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20
  },
  headerName:   { fontWeight: 600, fontSize: 15, color: '#3D2B7A' },
  headerStatus: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  newChatBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    background: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#6b7280'
  },
  quickActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '1rem 0'
  },
  quickBtn: {
    padding: '8px 14px',
    borderRadius: 20,
    border: '1px solid rgba(123,97,196,0.3)',
    background: '#f7f4ff',
    color: '#7B61C4',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '1rem 0'
  },
  bubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: 16,
    fontSize: 14
  },
  bubbleUser: {
    background: '#7B61C4',
    color: '#fff',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4
  },
  bubbleAI: {
    background: '#fff',
    color: '#1a1a2e',
    alignSelf: 'flex-start',
    border: '1px solid rgba(0,0,0,0.08)',
    borderBottomLeftRadius: 4
  },
  bubbleError: { background: '#fff5f5', borderColor: 'rgba(193,57,43,0.2)' },
  typing: { letterSpacing: 3, color: '#7B61C4', animation: 'pulse 1s infinite' },
  actionCard: {
    background: '#fff',
    border: '1px solid rgba(123,97,196,0.25)',
    borderRadius: 12,
    padding: '14px 16px',
    alignSelf: 'flex-start',
    maxWidth: '90%'
  },
  actionBadge: {
    color: '#fff',
    fontSize: 12,
    padding: '3px 10px',
    borderRadius: 20,
    fontWeight: 500
  },
  actionPendiente: { fontSize: 12, color: '#6b7280' },
  actionParams: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 12,
    background: '#f7f4ff',
    borderRadius: 8,
    padding: '8px 12px'
  },
  paramRow: { display: 'flex', gap: 8, fontSize: 13 },
  paramKey: { color: '#6b7280', minWidth: 130 },
  paramVal: { color: '#1a1a2e', fontWeight: 500 },
  actionBtns: { display: 'flex', gap: 8 },
  confirmBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: 8,
    border: 'none',
    background: '#7B61C4',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500
  },
  cancelBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.12)',
    background: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#6b7280'
  },
  inputArea: {
    display: 'flex',
    gap: 8,
    padding: '1rem 0 0',
    borderTop: '1px solid rgba(0,0,0,0.08)'
  },
  textarea: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 14,
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#fff',
    lineHeight: 1.5
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: '50%',
    border: 'none',
    background: '#7B61C4',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
