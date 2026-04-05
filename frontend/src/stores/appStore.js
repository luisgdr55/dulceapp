// src/stores/appStore.js
// Estado global con Zustand — auth + workspace activo + cache dashboard

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API = import.meta.env.VITE_API_URL || 'https://dulceapp-production.up.railway.app/api'

async function apiFetch(url, options = {}) {
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

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      token: null,
      user: null,
      workspaces: [],
      activeWorkspaceId: null,
      activeWorkspace: null,

      login: async (email, password) => {
        const data = await apiFetch(`${API}/auth/login`, {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        set({
          token: data.token,
          user: data.user,
          workspaces: data.workspaces,
          activeWorkspaceId: data.workspaces[0]?.id || null,
          activeWorkspace: data.workspaces[0] || null
        })
        return data
      },

      register: async (form) => {
        const data = await apiFetch(`${API}/auth/register`, {
          method: 'POST',
          body: JSON.stringify(form)
        })
        // Después del registro, hacer login para obtener workspaces completos
        return get().login(form.email, form.password)
      },

      logout: () => {
        set({
          token: null, user: null, workspaces: [],
          activeWorkspaceId: null, activeWorkspace: null,
          dashboard: null, conversationId: null
        })
      },

      setActiveWorkspace: (workspaceId) => {
        const ws = get().workspaces.find(w => w.id === workspaceId)
        set({ activeWorkspaceId: workspaceId, activeWorkspace: ws || null })
      },

      // ── Dashboard cache ───────────────────────────────────────────────────
      dashboard: null,
      dashboardLoading: false,

      fetchDashboard: async (periodo = '7d') => {
        const wid = get().activeWorkspaceId
        if (!wid) return
        set({ dashboardLoading: true })
        try {
          const data = await apiFetch(`${API}/dashboard?workspaceId=${wid}&periodo=${periodo}`)
          set({ dashboard: data })
        } finally {
          set({ dashboardLoading: false })
        }
      },

      // ── IA / Conversación ─────────────────────────────────────────────────
      conversationId: null,
      setConversationId: (id) => set({ conversationId: id }),
      clearConversation: () => set({ conversationId: null })
    }),
    {
      name: 'dulceapp-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
        activeWorkspace: state.activeWorkspace,
        conversationId: state.conversationId
      })
    }
  )
)
