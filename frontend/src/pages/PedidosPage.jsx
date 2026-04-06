// src/pages/PedidosPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../stores/appStore.js'
import { pedidosApi, recetasApi } from '../services/api.js'
import { pg, Field } from './_styles.jsx'

const ESTADOS = ['', 'PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'CANCELADO']
const ESTADO_COLOR = { PENDIENTE: '#F0A500', EN_PROCESO: '#7B61C4', ENTREGADO: '#2D6A4F', CANCELADO: '#C1392B' }

const s = {
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
  modalCard: { background: '#fff', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitle: { fontSize: 17, fontWeight: 600, color: '#3D2B7A' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' },
  detailKey: { color: '#6b7280' },
  detailVal: { fontWeight: 500, color: '#1a1a2e' },
  actionBtns: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  btnIniciar: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#ede9ff', color: '#7B61C4', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  btnEntregar: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#f0faf5', color: '#2D6A4F', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  btnCancelar: { padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(193,57,43,0.2)', background: '#fff', color: '#C1392B', fontSize: 13, cursor: 'pointer' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: '#fff' },
  precioCalc: { background: '#f7f4ff', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#3D2B7A', fontWeight: 500 }
}

// ── Modal de detalle de pedido ────────────────────────────────────────────────
function DetallePedido({ pedido, onClose, onEstado }) {
  if (!pedido) return null
  const EC = ESTADO_COLOR
  const canAction = !['ENTREGADO', 'CANCELADO'].includes(pedido.estado)

  return (
    <div style={s.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modalCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={s.modalTitle}>Pedido {pedido.numeroPedido}</p>
          <button style={pg.btnBack} onClick={onClose}>✕</button>
        </div>
        <span style={{ ...pg.estadoBadge, background: (EC[pedido.estado] || '#888') + '20', color: EC[pedido.estado] || '#888', alignSelf: 'flex-start' }}>
          {pedido.estado}
        </span>
        <div>
          {[
            ['Receta',         pedido.receta?.nombre || '—'],
            ['Variante',       pedido.variante?.nombre || '—'],
            ['Cantidad',       pedido.cantidad],
            ['Cliente',        pedido.clienteNombre || '—'],
            ['Teléfono',       pedido.clienteTelefono || '—'],
            ['Dirección',      pedido.clienteDireccion || '—'],
            ['Total EUR',      `€${pedido.totalEur?.toFixed(2)}`],
            ['Total Bs',       pedido.totalBs > 0 ? `Bs ${pedido.totalBs?.toFixed(2)}` : '—'],
            ['Tasa BCV usada', pedido.tasaBcvUsada > 0 ? pedido.tasaBcvUsada?.toFixed(2) : '—'],
            ['Fecha entrega',  pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString('es-VE') : '—'],
            ['Creado',         new Date(pedido.createdAt).toLocaleString('es-VE')],
          ].filter(([, v]) => v && v !== '—').map(([k, v]) => (
            <div key={k} style={s.detailRow}>
              <span style={s.detailKey}>{k}</span>
              <span style={s.detailVal}>{v}</span>
            </div>
          ))}
          {pedido.notas && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#374151' }}>
              📝 {pedido.notas}
            </div>
          )}
        </div>
        {canAction && (
          <div style={s.actionBtns}>
            {pedido.estado === 'PENDIENTE' && (
              <button style={s.btnIniciar} onClick={() => onEstado(pedido.id, 'EN_PROCESO')}>▶ Iniciar</button>
            )}
            {pedido.estado === 'EN_PROCESO' && (
              <button style={s.btnEntregar} onClick={() => onEstado(pedido.id, 'ENTREGADO')}>✓ Entregar</button>
            )}
            {['PENDIENTE', 'EN_PROCESO'].includes(pedido.estado) && (
              <button style={s.btnCancelar} onClick={() => onEstado(pedido.id, 'CANCELADO')}>✕ Cancelar</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal de nuevo pedido ────────────────────────────────────────────────────
function NuevoPedidoModal({ wid, recetas, onClose, onCreado }) {
  const [form, setForm] = useState({
    recetaId: '', varianteId: '', cantidad: 1,
    clienteNombre: '', clienteTelefono: '', fechaEntrega: '', notas: ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = k => e => {
    const val = e.target.value
    // Al cambiar receta, limpiar variante seleccionada
    if (k === 'recetaId') return setForm(p => ({ ...p, recetaId: val, varianteId: '' }))
    setForm(p => ({ ...p, [k]: val }))
  }

  const recetaSel = recetas.find(r => r.id === form.recetaId)
  const varianteSel = recetaSel?.variantes?.find(v => v.id === form.varianteId)
  const precio = varianteSel?.precioEur ?? recetaSel?.precioVentaEur ?? 0
  const total = precio * (parseInt(form.cantidad) || 0)

  const save = async () => {
    if (!form.recetaId) { setErr('Selecciona una receta'); return }
    setSaving(true)
    try {
      await pedidosApi.create(wid, {
        recetaId: form.recetaId,
        varianteId: form.varianteId || undefined,
        cantidad: parseInt(form.cantidad) || 1,
        clienteNombre: form.clienteNombre || undefined,
        clienteTelefono: form.clienteTelefono || undefined,
        fechaEntrega: form.fechaEntrega || undefined,
        notas: form.notas || undefined
      })
      onCreado()
      onClose()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div style={s.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modalCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={s.modalTitle}>Nuevo pedido</p>
          <button style={pg.btnBack} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={pg.label}>Receta *</label>
          <select style={s.select} value={form.recetaId} onChange={set('recetaId')}>
            <option value="">— Selecciona receta —</option>
            {recetas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>

        {recetaSel?.variantes?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={pg.label}>Variante</label>
            <select style={s.select} value={form.varianteId} onChange={set('varianteId')}>
              <option value="">— Sin variante (precio base) —</option>
              {recetaSel.variantes.map(v => (
                <option key={v.id} value={v.id}>{v.nombre} — €{v.precioEur?.toFixed(2)}</option>
              ))}
            </select>
          </div>
        )}

        <Field label="Cantidad *" type="number" value={form.cantidad} onChange={set('cantidad')} />

        {recetaSel && (
          <div style={s.precioCalc}>
            Precio unitario: €{precio.toFixed(2)} × {form.cantidad || 0} = <strong>€{total.toFixed(2)}</strong>
          </div>
        )}

        <div style={s.row2}>
          <Field label="Nombre del cliente" value={form.clienteNombre} onChange={set('clienteNombre')} />
          <Field label="Teléfono" value={form.clienteTelefono} onChange={set('clienteTelefono')} />
        </div>
        <Field label="Fecha de entrega" type="date" value={form.fechaEntrega} onChange={set('fechaEntrega')} />
        <Field label="Notas" value={form.notas} onChange={set('notas')} multiline />

        {err && <p style={{ fontSize: 13, color: '#C1392B', background: '#fff5f5', padding: '8px 12px', borderRadius: 8 }}>{err}</p>}

        <button style={pg.btnPrimary} onClick={save} disabled={saving || !form.recetaId}>
          {saving ? 'Creando...' : 'Crear pedido'}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export function PedidosPage() {
  const { activeWorkspaceId } = useAppStore()
  const [pedidos, setPedidos] = useState([])
  const [recetas, setRecetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [selectedPedido, setSelectedPedido] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    if (!activeWorkspaceId) return
    setLoading(true)
    pedidosApi.list(activeWorkspaceId, estadoFiltro ? { estado: estadoFiltro } : {})
      .then(d => setPedidos(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeWorkspaceId, estadoFiltro])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!activeWorkspaceId) return
    recetasApi.list(activeWorkspaceId).then(r => setRecetas(r || [])).catch(() => {})
  }, [activeWorkspaceId])

  const cambiarEstado = async (id, estado) => {
    try {
      const updated = await pedidosApi.estado(activeWorkspaceId, id, estado)
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: updated.estado } : p))
      if (selectedPedido?.id === id) setSelectedPedido(prev => ({ ...prev, estado: updated.estado }))
    } catch (err) { alert(err.message) }
  }

  const verDetalle = async (p) => {
    try {
      const detalle = await pedidosApi.get(activeWorkspaceId, p.id)
      setSelectedPedido(detalle)
    } catch { setSelectedPedido(p) }
  }

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <h1 style={pg.title}>Pedidos</h1>
        <button style={pg.btnPrimary} onClick={() => setShowCreate(true)}>+ Nuevo pedido</button>
      </div>

      <div style={pg.filterRow}>
        {ESTADOS.map(e => (
          <button key={e || 'todos'} style={{ ...pg.filterBtn, ...(estadoFiltro === e ? pg.filterBtnActive : {}) }}
            onClick={() => setEstadoFiltro(e)}>
            {e || 'Todos'}
          </button>
        ))}
      </div>

      {loading ? <p style={pg.loading}>Cargando...</p> : (
        <div style={pg.list}>
          {pedidos.map(p => {
            const EC = ESTADO_COLOR
            const canAction = !['ENTREGADO', 'CANCELADO'].includes(p.estado)
            return (
              <div key={p.id} style={{ ...pg.pedidoCard, cursor: 'pointer' }} onClick={() => verDetalle(p)}>
                <div style={pg.pedidoTop}>
                  <span style={pg.pedidoNum}>#{p.numeroPedido}</span>
                  <span style={{ ...pg.estadoBadge, background: (EC[p.estado] || '#888') + '20', color: EC[p.estado] || '#888' }}>
                    {p.estado}
                  </span>
                </div>
                <p style={pg.pedidoReceta}>{p.receta?.nombre || 'Sin receta'}</p>
                {p.clienteNombre && <p style={pg.pedidoCliente}>{p.clienteNombre}</p>}
                <div style={pg.pedidoFooter}>
                  <span style={pg.pedidoTotal}>€{p.totalEur?.toFixed(2)}</span>
                  {p.fechaEntrega && (
                    <span style={pg.pedidoFecha}>
                      Entrega: {new Date(p.fechaEntrega).toLocaleDateString('es-VE')}
                    </span>
                  )}
                </div>
                {canAction && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }} onClick={e => e.stopPropagation()}>
                    {p.estado === 'PENDIENTE' && (
                      <button style={s.btnIniciar} onClick={() => cambiarEstado(p.id, 'EN_PROCESO')}>▶ Iniciar</button>
                    )}
                    {p.estado === 'EN_PROCESO' && (
                      <button style={s.btnEntregar} onClick={() => cambiarEstado(p.id, 'ENTREGADO')}>✓ Entregar</button>
                    )}
                    <button style={s.btnCancelar} onClick={() => cambiarEstado(p.id, 'CANCELADO')}>✕ Cancelar</button>
                  </div>
                )}
              </div>
            )
          })}
          {pedidos.length === 0 && <p style={pg.empty}>No hay pedidos con este filtro</p>}
        </div>
      )}

      {selectedPedido && (
        <DetallePedido
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
          onEstado={(id, estado) => { cambiarEstado(id, estado); setSelectedPedido(null) }}
        />
      )}

      {showCreate && (
        <NuevoPedidoModal
          wid={activeWorkspaceId}
          recetas={recetas}
          onClose={() => setShowCreate(false)}
          onCreado={load}
        />
      )}
    </div>
  )
}
