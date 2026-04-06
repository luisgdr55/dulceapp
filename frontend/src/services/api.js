// src/services/api.js
// Cliente HTTP por dominio — usa el proxy de Vite en dev (/api → localhost:3000)

import { useAppStore } from '../stores/appStore.js'

const BASE = import.meta.env.VITE_API_URL || 'https://dulceapp-production.up.railway.app/api'

async function req(url, options = {}) {
  const token = useAppStore.getState().token
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function qs(params = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, v)
  }
  return p.toString() ? '?' + p.toString() : ''
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get:      (wid, periodo = '7d') => req(`${BASE}/dashboard?workspaceId=${wid}&periodo=${periodo}`),
  historial: (wid, periodo = '30d') => req(`${BASE}/dashboard/historial?workspaceId=${wid}&periodo=${periodo}`),
  notificaciones: (wid) => req(`${BASE}/dashboard/notificaciones?workspaceId=${wid}`),
  leerNotificaciones: (wid, ids) => req(`${BASE}/dashboard/notificaciones/leer?workspaceId=${wid}`, {
    method: 'PATCH', body: JSON.stringify({ ids })
  })
}

// ── Ingredientes ──────────────────────────────────────────────────────────────
export const ingredientesApi = {
  list:   (wid, params = {}) => req(`${BASE}/ingredientes${qs({ workspaceId: wid, ...params })}`),
  get:    (wid, id)          => req(`${BASE}/ingredientes/${id}?workspaceId=${wid}`),
  create: (wid, data)        => req(`${BASE}/ingredientes`, { method: 'POST', body: JSON.stringify({ workspaceId: wid, ...data }) }),
  update: (wid, id, data)    => req(`${BASE}/ingredientes/${id}?workspaceId=${wid}`, { method: 'PUT', body: JSON.stringify(data) }),
  patch:  (wid, id, data)    => req(`${BASE}/ingredientes/${id}?workspaceId=${wid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  stock:  (wid, id, cantidad, operacion = 'set') =>
    req(`${BASE}/ingredientes/${id}/stock?workspaceId=${wid}`, { method: 'PATCH', body: JSON.stringify({ cantidad, operacion }) }),
  delete: (wid, id)          => req(`${BASE}/ingredientes/${id}?workspaceId=${wid}`, { method: 'DELETE' })
}

// ── Recetas ───────────────────────────────────────────────────────────────────
export const recetasApi = {
  list:   (wid, params = {}) => req(`${BASE}/recetas${qs({ workspaceId: wid, ...params })}`),
  get:    (wid, id)          => req(`${BASE}/recetas/${id}?workspaceId=${wid}`),
  create: (wid, data)        => req(`${BASE}/recetas`, { method: 'POST', body: JSON.stringify({ workspaceId: wid, ...data }) }),
  update: (wid, id, data)    => req(`${BASE}/recetas/${id}?workspaceId=${wid}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (wid, id)          => req(`${BASE}/recetas/${id}?workspaceId=${wid}`, { method: 'DELETE' })
}

// ── Pedidos ───────────────────────────────────────────────────────────────────
export const pedidosApi = {
  list:   (wid, params = {}) => req(`${BASE}/pedidos${qs({ workspaceId: wid, ...params })}`),
  get:    (wid, id)          => req(`${BASE}/pedidos/${id}?workspaceId=${wid}`),
  create: (wid, data)        => req(`${BASE}/pedidos`, { method: 'POST', body: JSON.stringify({ workspaceId: wid, ...data }) }),
  estado: (wid, id, estado)  => req(`${BASE}/pedidos/${id}/estado?workspaceId=${wid}`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  delete: (wid, id)          => req(`${BASE}/pedidos/${id}?workspaceId=${wid}`, { method: 'DELETE' })
}

// ── IA ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  chat:    (wid, message, conversationId) =>
    req(`${BASE}/ai/chat`, { method: 'POST', body: JSON.stringify({ workspaceId: wid, message, ...(conversationId ? { conversationId } : {}) }) }),
  confirm: (wid, actionId) =>
    req(`${BASE}/ai/confirm`, { method: 'POST', body: JSON.stringify({ workspaceId: wid, actionId }) })
}

// ── Workspaces ────────────────────────────────────────────────────────────────
export const workspacesApi = {
  list:           ()             => req(`${BASE}/workspaces`),
  getConfig:      (wid)          => req(`${BASE}/workspaces/${wid}/config?workspaceId=${wid}`),
  putConfig:      (wid, data)    => req(`${BASE}/workspaces/${wid}/config?workspaceId=${wid}`, { method: 'PUT', body: JSON.stringify(data) }),
  getTasaBCV:     (wid)          => req(`${BASE}/workspaces/${wid}/tasa-bcv?workspaceId=${wid}`),
  postTasaBCV:    (wid, tasa, moneda = 'EUR') => req(`${BASE}/workspaces/${wid}/tasa-bcv?workspaceId=${wid}`, { method: 'POST', body: JSON.stringify({ tasa, moneda }) }),
  getMiembros:    (wid)          => req(`${BASE}/workspaces/${wid}/miembros?workspaceId=${wid}`),
  postMiembro:    (wid, data)    => req(`${BASE}/workspaces/${wid}/miembros?workspaceId=${wid}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteMiembro:  (wid, userId)  => req(`${BASE}/workspaces/${wid}/miembros/${userId}?workspaceId=${wid}`, { method: 'DELETE' })
}

// ── Telegram ──────────────────────────────────────────────────────────────────
export const telegramApi = {
  status:     (wid)        => req(`${BASE}/telegram/${wid}/status?workspaceId=${wid}`),
  connect:    (wid, data)  => req(`${BASE}/telegram/${wid}/connect?workspaceId=${wid}`, { method: 'POST', body: JSON.stringify(data) }),
  disconnect: (wid)        => req(`${BASE}/telegram/${wid}/disconnect?workspaceId=${wid}`, { method: 'DELETE' })
}
