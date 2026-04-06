// src/ai/aiService.js
// Orquestador LLM — Gemini Flash via OpenRouter con tool calling real

import { prisma } from '../utils/prisma.js'
import { executeAITool } from './tools.js'
import { buildSystemPrompt } from './systemPrompt.js'
import { parseJsonField } from '../utils/jsonField.js'

const OPENROUTER_URL = `${process.env.OPENROUTER_BASE_URL}/chat/completions`
const MODEL = process.env.OPENROUTER_MODEL

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'crear_pedido',
      description: 'Registra un nuevo pedido de un cliente',
      parameters: {
        type: 'object',
        properties: {
          recetaId:         { type: 'string', description: 'ID de la receta' },
          varianteId:       { type: 'string', description: 'ID de variante (opcional)' },
          cantidad:         { type: 'integer', description: 'Número de unidades' },
          clienteNombre:    { type: 'string', description: 'Nombre del cliente' },
          clienteTelefono:  { type: 'string', description: 'Teléfono del cliente' },
          clienteDireccion: { type: 'string', description: 'Dirección de entrega' },
          fechaEntrega:     { type: 'string', description: 'Fecha ISO de entrega' },
          notas:            { type: 'string', description: 'Notas adicionales' }
        },
        required: ['recetaId', 'cantidad']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'venta_rapida',
      description: 'Registra una venta sin datos de cliente (venta en mostrador)',
      parameters: {
        type: 'object',
        properties: {
          recetaId:  { type: 'string' },
          varianteId: { type: 'string' },
          cantidad:  { type: 'integer' },
          notas:     { type: 'string' }
        },
        required: ['recetaId', 'cantidad']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_stock',
      description: 'Modifica la cantidad de un ingrediente en inventario',
      parameters: {
        type: 'object',
        properties: {
          ingredienteId: { type: 'string' },
          nuevaCantidad: { type: 'number' },
          motivo:        { type: 'string', description: 'compra | ajuste | merma' }
        },
        required: ['ingredienteId', 'nuevaCantidad']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'agregar_ingrediente',
      description: 'Agrega un ingrediente nuevo al inventario',
      parameters: {
        type: 'object',
        properties: {
          nombre:         { type: 'string' },
          categoria:      { type: 'string' },
          unidad:         { type: 'string' },
          cantidadActual: { type: 'number' },
          cantidadMinima: { type: 'number' },
          precioUsd:      { type: 'number', description: 'Precio de compra en USD' },
          proveedor:      { type: 'string' }
        },
        required: ['nombre', 'unidad', 'precioUsd']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_tasa_bcv',
      description: 'Actualiza la tasa de cambio BCV (EUR→Bs o USD→Bs)',
      parameters: {
        type: 'object',
        properties: {
          tasa:   { type: 'number', description: 'Nuevo valor de la tasa (Bs por unidad)' },
          moneda: { type: 'string', enum: ['EUR', 'USD'], description: 'Moneda de la tasa: EUR (euros) o USD (dólares)' }
        },
        required: ['tasa', 'moneda']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analizar_rentabilidad',
      description: 'Analiza qué recetas tienen mejor y peor margen de ganancia',
      parameters: {
        type: 'object',
        properties: {
          periodo: { type: 'string', description: '7d | 30d | 90d | todo' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'proyectar_demanda',
      description: 'Proyecta cuánto stock de ingredientes se necesita para los próximos días',
      parameters: {
        type: 'object',
        properties: {
          diasProyeccion: { type: 'integer', description: 'Días a proyectar (default 7)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'resumen_negocio',
      description: 'Genera un resumen de ventas, ingresos y métricas del período',
      parameters: {
        type: 'object',
        properties: {
          periodo: { type: 'string', description: '7d | 30d | mes_actual | todo' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'alertas_stock',
      description: 'Lista los ingredientes por debajo del stock mínimo',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'actualizar_precio_ingrediente',
      description: 'Actualiza el precio USD de uno o varios ingredientes y recalcula automáticamente los costos de todas las recetas afectadas. Crea alertas si el margen de alguna receta baja del 15%.',
      parameters: {
        type: 'object',
        properties: {
          actualizaciones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ingredienteId:          { type: 'string', description: 'ID del ingrediente' },
                nuevoPrecioUsd:         { type: 'number', description: 'Nuevo precio del paquete en USD' },
                nuevaCantidadPorCompra: { type: 'number', description: 'Opcional: nuevo tamaño del paquete si cambió' }
              },
              required: ['ingredienteId', 'nuevoPrecioUsd']
            }
          }
        },
        required: ['actualizaciones']
      }
    }
  }
]

// ─── Función principal ────────────────────────────────────────────────────────
export async function processAIMessage({ workspaceId, userId, canal, userMessage, conversationId }) {
  // 1. Cargar o crear conversación
  let conversation
  if (conversationId) {
    conversation = await prisma.aIConversation.findUnique({ where: { id: conversationId } })
  }
  if (!conversation) {
    conversation = await prisma.aIConversation.create({
      data: { workspaceId, userId, canal, messages: '[]' }
    })
  }

  // 2. Deserializar historial (SQLite: string → array; PostgreSQL: ya es array)
  const history = parseMessages(conversation.messages)
  const newMessages = [...history, { role: 'user', content: userMessage }]

  // 3. System prompt con contexto en tiempo real
  const systemPrompt = await buildSystemPrompt(workspaceId)

  // 4. Llamar a Gemini Flash via OpenRouter
  const response = await callOpenRouter(systemPrompt, newMessages)

  // 5. Procesar respuesta (puede tener tool calls)
  const result = await processResponse({
    response, workspaceId, userId, canal,
    conversationId: conversation.id,
    messages: newMessages
  })

  // 6. Guardar historial (PostgreSQL: array directo; SQLite: stringify)
  const messagesValue = process.env.NODE_ENV === 'production'
    ? result.updatedMessages
    : JSON.stringify(result.updatedMessages)
  await prisma.aIConversation.update({
    where: { id: conversation.id },
    data: { messages: messagesValue, updatedAt: new Date() }
  })

  return {
    conversationId: conversation.id,
    reply: result.reply,
    toolActions: result.toolActions,
    executedActions: result.executedActions
  }
}

// ─── Llamada a OpenRouter ─────────────────────────────────────────────────────
async function callOpenRouter(systemPrompt, messages) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY no configurada. Agrega tu clave en backend/.env')
  }
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'DULCEAPP'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 1500,
      temperature: 0.3
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Procesar respuesta con posibles tool calls ───────────────────────────────
async function processResponse({ response, workspaceId, userId, canal, conversationId, messages }) {
  const choice = response.choices[0]
  const assistantMessage = choice.message
  const toolActions = []
  const executedActions = []

  let updatedMessages = [...messages, assistantMessage]
  let reply = assistantMessage.content || ''

  if (assistantMessage.tool_calls?.length > 0) {
    const toolResults = []

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name
      const params = JSON.parse(toolCall.function.arguments)
      const needsConfirmation = ['crear_pedido', 'venta_rapida', 'actualizar_stock'].includes(toolName)

      if (needsConfirmation) {
        const paramsValue = process.env.NODE_ENV === 'production' ? params : JSON.stringify(params)
        const aiAction = await prisma.aIAction.create({
          data: { conversationId, tool: toolName, params: paramsValue, confirmada: false, ejecutada: false }
        })
        toolActions.push({ id: aiAction.id, tool: toolName, params })
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({ status: 'pendiente_confirmacion', actionId: aiAction.id })
        })
      } else {
        const resultado = await executeAITool({ toolName, params, workspaceId, userId, canal })
        const isProd = process.env.NODE_ENV === 'production'
        const aiAction = await prisma.aIAction.create({
          data: {
            conversationId, tool: toolName,
            params: isProd ? params : JSON.stringify(params),
            resultado: isProd ? resultado : JSON.stringify(resultado),
            confirmada: true, ejecutada: true
          }
        })
        executedActions.push({ id: aiAction.id, tool: toolName, resultado })
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(resultado)
        })
      }
    }

    updatedMessages = [...updatedMessages, ...toolResults]
    const secondResponse = await callOpenRouter(
      await buildSystemPrompt(workspaceId),
      updatedMessages.slice(1)
    )
    reply = secondResponse.choices[0].message.content || reply
    updatedMessages.push(secondResponse.choices[0].message)
  }

  return { reply, toolActions, executedActions, updatedMessages }
}

// ─── Confirmar acción pendiente desde la UI ───────────────────────────────────
export async function confirmAIAction({ actionId, workspaceId, userId }) {
  const action = await prisma.aIAction.findUnique({
    where: { id: actionId },
    include: { conversation: true }
  })
  if (!action || action.ejecutada) throw new Error('Acción no encontrada o ya ejecutada')
  if (action.conversation.workspaceId !== workspaceId) throw new Error('Sin acceso a esta acción')

  const params = parseJsonField(action.params)
  const resultado = await executeAITool({
    toolName: action.tool,
    params,
    workspaceId,
    userId,
    canal: action.conversation.canal
  })

  const resultadoValue = process.env.NODE_ENV === 'production' ? resultado : JSON.stringify(resultado)
  await prisma.aIAction.update({
    where: { id: actionId },
    data: { confirmada: true, ejecutada: true, resultado: resultadoValue }
  })

  return resultado
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMessages(raw) {
  if (Array.isArray(raw)) return raw
  const parsed = parseJsonField(raw)
  return Array.isArray(parsed) ? parsed : []
}
