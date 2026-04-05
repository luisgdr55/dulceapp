// src/pages/ConfigPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../stores/appStore.js'
import { workspacesApi, dashboardApi, telegramApi } from '../services/api.js'
import { pg, Field } from './_styles.jsx'

const s = {
  section: { background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#3D2B7A', marginBottom: 4 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  msgOk:  { fontSize: 13, color: '#2D6A4F', background: '#f0faf5', padding: '8px 12px', borderRadius: 8 },
  msgErr: { fontSize: 13, color: '#C1392B', background: '#fff5f5', padding: '8px 12px', borderRadius: 8 },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  chipOk:  { background: '#f0faf5', color: '#2D6A4F' },
  chipErr: { background: '#fff0f0', color: '#C1392B' },
  memberRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' },
  roleBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#ede9ff', color: '#7B61C4', fontWeight: 500 },
  notifRow: { display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'flex-start' },
  notifDot: { width: 8, height: 8, borderRadius: '50%', background: '#7B61C4', marginTop: 5, flexShrink: 0 },
  notifDotRead: { width: 8, height: 8, borderRadius: '50%', background: '#e5e7eb', marginTop: 5, flexShrink: 0 },
  histRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 13 },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#fff' },
  btnDanger: { padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(193,57,43,0.3)', background: '#fff', color: '#C1392B', fontSize: 14, cursor: 'pointer' },
  btnSm: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#6b7280' },
  btnSmDanger: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(193,57,43,0.2)', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#C1392B' },
  instrStep: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' },
  instrNum: { width: 22, height: 22, borderRadius: '50%', background: '#ede9ff', color: '#7B61C4', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
}

// ── Perfil del negocio ────────────────────────────────────────────────────────
function PerfilSection({ wid }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', negocio: '', ciudad: '', email: '', telefono: '', monedaPrincipal: 'EUR' })
  const [msg, setMsg] = useState(null)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    if (!wid) return
    workspacesApi.getConfig(wid).then(c => { if (c) setForm({ nombre: c.nombre || '', apellido: c.apellido || '', negocio: c.negocio || '', ciudad: c.ciudad || '', email: c.email || '', telefono: c.telefono || '', monedaPrincipal: c.monedaPrincipal || 'EUR' }) }).catch(() => {})
  }, [wid])

  const save = async () => {
    try {
      await workspacesApi.putConfig(wid, form)
      setMsg({ ok: true, text: 'Perfil guardado correctamente' })
    } catch (err) { setMsg({ ok: false, text: err.message }) }
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>Perfil del negocio</p>
      <div style={s.row2}>
        <Field label="Nombre" value={form.nombre} onChange={set('nombre')} />
        <Field label="Apellido" value={form.apellido} onChange={set('apellido')} />
      </div>
      <Field label="Nombre del negocio" value={form.negocio} onChange={set('negocio')} required />
      <div style={s.row2}>
        <Field label="Ciudad" value={form.ciudad} onChange={set('ciudad')} />
        <Field label="Teléfono" value={form.telefono} onChange={set('telefono')} />
      </div>
      <Field label="Email" type="email" value={form.email} onChange={set('email')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={pg.label}>Moneda principal</label>
        <select style={s.select} value={form.monedaPrincipal} onChange={set('monedaPrincipal')}>
          <option value="EUR">EUR — Euro</option>
          <option value="USD">USD — Dólar</option>
        </select>
      </div>
      {msg && <p style={msg.ok ? s.msgOk : s.msgErr}>{msg.text}</p>}
      <button style={pg.btnPrimary} onClick={save}>Guardar perfil</button>
    </div>
  )
}

// ── Tasa BCV ──────────────────────────────────────────────────────────────────
function TasaBCVSection({ wid }) {
  const [tasas, setTasas] = useState({ actualEUR: null, actualUSD: null, historialEUR: [], historialUSD: [] })
  const [tasaEur, setTasaEur] = useState('')
  const [tasaUsd, setTasaUsd] = useState('')
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => {
    if (!wid) return
    workspacesApi.getTasaBCV(wid).then(d => setTasas({
      actualEUR: d.actualEUR || null,
      actualUSD: d.actualUSD || null,
      historialEUR: d.historialEUR || [],
      historialUSD: d.historialUSD || []
    })).catch(() => {})
  }, [wid])

  useEffect(() => { load() }, [load])

  const save = async (moneda, valor) => {
    try {
      await workspacesApi.postTasaBCV(wid, parseFloat(valor), moneda)
      moneda === 'EUR' ? setTasaEur('') : setTasaUsd('')
      setMsg({ ok: true, text: `Tasa ${moneda} actualizada` })
      load()
    } catch (err) { setMsg({ ok: false, text: err.message }) }
    setTimeout(() => setMsg(null), 3000)
  }

  const TasaRow = ({ label, actual, valor, setValor, moneda, placeholder }) => (
    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{label}</p>
      {actual && (
        <div style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
          Tasa actual: <strong style={{ color: '#7B61C4', fontSize: 18 }}>{actual.tasa.toFixed(2)} Bs</strong>
          <span style={{ marginLeft: 10, fontSize: 12, color: '#9ca3af' }}>
            {new Date(actual.fecha).toLocaleDateString('es-VE')}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Field label="Nueva tasa" type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder={placeholder} />
        </div>
        <button style={{ ...pg.btnPrimary, height: 42 }} onClick={() => save(moneda, valor)} disabled={!valor}>Actualizar</button>
      </div>
    </div>
  )

  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>Tasas BCV</p>
      <TasaRow
        label="EUR → Bs (ventas y pedidos)"
        actual={tasas.actualEUR}
        valor={tasaEur} setValor={setTasaEur}
        moneda="EUR" placeholder="Ej: 46.50"
      />
      <TasaRow
        label="USD → Bs (compra de ingredientes)"
        actual={tasas.actualUSD}
        valor={tasaUsd} setValor={setTasaUsd}
        moneda="USD" placeholder="Ej: 36.50"
      />
      {msg && <p style={msg.ok ? s.msgOk : s.msgErr}>{msg.text}</p>}
      {(tasas.historialEUR.length > 0 || tasas.historialUSD.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
          {[{ label: 'Historial EUR', hist: tasas.historialEUR }, { label: 'Historial USD', hist: tasas.historialUSD }].map(({ label, hist }) => (
            hist.length > 0 && (
              <div key={label}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</p>
                {hist.slice(0, 8).map(t => (
                  <div key={t.id} style={s.histRow}>
                    <span>{new Date(t.fecha).toLocaleDateString('es-VE')}</span>
                    <span style={{ fontWeight: 600, color: t.esCurrent ? '#7B61C4' : '#374151' }}>
                      {t.tasa.toFixed(2)} {t.esCurrent && <span style={{ fontSize: 10 }}>✓</span>}
                    </span>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ── Miembros ──────────────────────────────────────────────────────────────────
function MiembrosSection({ wid, currentUserId }) {
  const [miembros, setMiembros] = useState([])
  const [form, setForm] = useState({ email: '', role: 'EDITOR' })
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => {
    if (!wid) return
    workspacesApi.getMiembros(wid).then(setMiembros).catch(() => {})
  }, [wid])

  useEffect(() => { load() }, [load])

  const invite = async () => {
    try {
      await workspacesApi.postMiembro(wid, form)
      setForm({ email: '', role: 'EDITOR' })
      setMsg({ ok: true, text: `${form.email} invitado como ${form.role}` })
      load()
    } catch (err) { setMsg({ ok: false, text: err.message }) }
    setTimeout(() => setMsg(null), 3000)
  }

  const remove = async (userId, email) => {
    if (!confirm(`¿Remover a ${email} del workspace?`)) return
    try {
      await workspacesApi.deleteMiembro(wid, userId)
      load()
    } catch (err) { setMsg({ ok: false, text: err.message }) }
  }

  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>Miembros del workspace</p>
      {miembros.map(m => (
        <div key={m.id} style={s.memberRow}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e' }}>{m.user?.nombre} {m.user?.apellido}</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>{m.user?.email}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={s.roleBadge}>{m.role}</span>
            {m.user?.id !== currentUserId && (
              <button style={s.btnSmDanger} onClick={() => remove(m.user.id, m.user.email)}>Remover</button>
            )}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Invitar miembro</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="usuario@ejemplo.com" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={pg.label}>Rol</label>
            <select style={{ ...s.select, height: 42 }} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Visor</option>
            </select>
          </div>
          <button style={{ ...pg.btnPrimary, height: 42 }} onClick={invite} disabled={!form.email}>Invitar</button>
        </div>
      </div>
      {msg && <p style={msg.ok ? s.msgOk : s.msgErr}>{msg.text}</p>}
    </div>
  )
}

// ── Telegram ──────────────────────────────────────────────────────────────────
function TelegramSection({ wid }) {
  const [status, setStatus] = useState(null)
  const [form, setForm] = useState({ botToken: '', chatId: '' })
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!wid) return
    telegramApi.status(wid).then(setStatus).catch(() => {})
  }, [wid])

  useEffect(() => { load() }, [load])

  const connect = async () => {
    setSaving(true)
    try {
      await telegramApi.connect(wid, form)
      setMsg({ ok: true, text: 'Bot conectado correctamente' })
      setForm({ botToken: '', chatId: '' })
      load()
    } catch (err) { setMsg({ ok: false, text: err.message }) }
    setSaving(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const disconnect = async () => {
    if (!confirm('¿Desconectar el bot de Telegram?')) return
    try {
      await telegramApi.disconnect(wid)
      setMsg({ ok: true, text: 'Bot desconectado' })
      load()
    } catch (err) { setMsg({ ok: false, text: err.message }) }
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div style={s.section}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={s.sectionTitle}>Conectar Telegram</p>
        <span style={{ ...s.chip, ...(status?.conectado ? s.chipOk : s.chipErr) }}>
          {status?.conectado ? '● Conectado' : '○ Desconectado'}
        </span>
      </div>

      {status?.conectado ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 14, color: '#374151' }}>Chat ID: <strong>{status.chatId}</strong></p>
          {status.lastActivity && (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              Última actividad: {new Date(status.lastActivity).toLocaleString('es-VE')}
            </p>
          )}
          <button style={s.btnDanger} onClick={disconnect}>Desconectar bot</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Sigue estos pasos para conectar tu bot:</p>
          {[
            { n: 1, text: 'Abre Telegram y busca @BotFather' },
            { n: 2, text: 'Envíale /newbot y sigue las instrucciones para crear un bot' },
            { n: 3, text: 'Copia el token que te dará BotFather (formato: 123456:ABC...)' },
            { n: 4, text: 'Busca @userinfobot en Telegram, escríbele cualquier mensaje y copia tu Chat ID' },
            { n: 5, text: 'Pega ambos valores aquí abajo y presiona Conectar' }
          ].map(({ n, text }) => (
            <div key={n} style={s.instrStep}>
              <div style={s.instrNum}>{n}</div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
          <Field label="Bot Token" value={form.botToken} onChange={e => setForm(p => ({ ...p, botToken: e.target.value }))} placeholder="123456789:ABCdef..." />
          <Field label="Chat ID" value={form.chatId} onChange={e => setForm(p => ({ ...p, chatId: e.target.value }))} placeholder="Tu ID numérico" />
          <button style={pg.btnPrimary} onClick={connect} disabled={saving || !form.botToken || !form.chatId}>
            {saving ? 'Conectando...' : 'Conectar bot'}
          </button>
        </div>
      )}
      {msg && <p style={msg.ok ? s.msgOk : s.msgErr}>{msg.text}</p>}
    </div>
  )
}

// ── Notificaciones ────────────────────────────────────────────────────────────
function NotificacionesSection({ wid }) {
  const [notifs, setNotifs] = useState([])
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => {
    if (!wid) return
    dashboardApi.notificaciones(wid).then(d => setNotifs(d || [])).catch(() => {})
  }, [wid])

  useEffect(() => { load() }, [load])

  const marcarTodas = async () => {
    try {
      await dashboardApi.leerNotificaciones(wid, [])
      load()
      setMsg({ ok: true, text: 'Notificaciones marcadas como leídas' })
    } catch (err) { setMsg({ ok: false, text: err.message }) }
    setTimeout(() => setMsg(null), 2000)
  }

  const sinLeer = notifs.filter(n => !n.leida).length
  const TIPO_ICON = { stock_bajo: '📦', nuevo_pedido: '🛒', pago: '💰', alerta: '⚠️', info: 'ℹ️' }

  return (
    <div style={s.section}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={s.sectionTitle}>Notificaciones</p>
          {sinLeer > 0 && (
            <span style={{ background: '#7B61C4', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
              {sinLeer}
            </span>
          )}
        </div>
        {sinLeer > 0 && <button style={s.btnSm} onClick={marcarTodas}>Marcar todas como leídas</button>}
      </div>
      {msg && <p style={msg.ok ? s.msgOk : s.msgErr}>{msg.text}</p>}
      {notifs.length === 0 ? (
        <p style={pg.empty}>Sin notificaciones</p>
      ) : (
        notifs.slice(0, 20).map(n => (
          <div key={n.id} style={s.notifRow}>
            <div style={n.leida ? s.notifDotRead : s.notifDot} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{TIPO_ICON[n.tipo] || 'ℹ️'}</span>
                <p style={{ fontSize: 13, fontWeight: n.leida ? 400 : 600, color: '#1a1a2e' }}>{n.titulo}</p>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{n.mensaje}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {new Date(n.createdAt).toLocaleString('es-VE')}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export function ConfigPage() {
  const { activeWorkspaceId, user, logout } = useAppStore()

  return (
    <div style={pg.page}>
      <h1 style={pg.title}>Configuración</h1>
      <PerfilSection wid={activeWorkspaceId} />
      <TasaBCVSection wid={activeWorkspaceId} />
      <MiembrosSection wid={activeWorkspaceId} currentUserId={user?.id} />
      <TelegramSection wid={activeWorkspaceId} />
      <NotificacionesSection wid={activeWorkspaceId} />

      {/* Cerrar sesión */}
      <div style={{ ...s.section, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Sesión activa</p>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>{user?.email}</p>
        </div>
        <button style={s.btnDanger} onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  )
}
