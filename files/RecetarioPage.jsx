// src/pages/RecetarioPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore.js'
import { recetasApi } from '../services/api.js'

export function RecetarioPage() {
  const { activeWorkspaceId } = useAppStore()
  const [recetas, setRecetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    recetasApi.list(activeWorkspaceId, { search }).then(setRecetas).finally(() => setLoading(false))
  }, [activeWorkspaceId, search])

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <h1 style={pg.title}>Recetario</h1>
        <button style={pg.btnPrimary} onClick={() => navigate('/recetario/nueva')}>+ Nueva receta</button>
      </div>
      <input style={pg.search} placeholder="Buscar receta..." value={search}
        onChange={e => setSearch(e.target.value)} />
      {loading ? <p style={pg.loading}>Cargando...</p> : (
        <div style={pg.grid}>
          {recetas.map(r => (
            <div key={r.id} style={pg.card} onClick={() => navigate(`/recetario/${r.id}`)}>
              {r.imagenUrl && <img src={r.imagenUrl} alt={r.nombre} style={pg.cardImg} />}
              <div style={pg.cardBody}>
                <p style={pg.cardTitle}>{r.nombre}</p>
                {r.categoria && <span style={pg.tag}>{r.categoria}</span>}
                <div style={pg.cardFooter}>
                  <span style={pg.precio}>€{r.precioVentaEur?.toFixed(2)}</span>
                  <span style={{ ...pg.margen, color: r.margenGanancia > 30 ? '#2D6A4F' : '#F0A500' }}>
                    {r.margenGanancia?.toFixed(0)}% margen
                  </span>
                </div>
                {r._count?.pedidos > 0 && (
                  <p style={pg.cardSub}>{r._count.pedidos} pedido(s)</p>
                )}
              </div>
            </div>
          ))}
          {recetas.length === 0 && <p style={pg.empty}>No hay recetas. ¡Crea la primera!</p>}
        </div>
      )}
    </div>
  )
}

// ── Detalle / Edición de receta ───────────────────────────────────────────────
export function RecetaDetallePage() {
  const { activeWorkspaceId } = useAppStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: '', porciones: 1,
    costoIngredientesEur: 0, costoGasEur: 0, costoEmpaqueEur: 0, precioVentaEur: 0, notas: ''
  })
  const [saving, setSaving] = useState(false)

  const costoTotal = Number(form.costoIngredientesEur) + Number(form.costoGasEur) + Number(form.costoEmpaqueEur)
  const margen = form.precioVentaEur > 0
    ? (((form.precioVentaEur - costoTotal) / form.precioVentaEur) * 100).toFixed(1)
    : 0

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await recetasApi.create(activeWorkspaceId, form)
      navigate('/recetario')
    } catch (err) {
      alert(err.message)
    } finally { setSaving(false) }
  }

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <button style={pg.btnBack} onClick={() => navigate('/recetario')}>← Volver</button>
        <h1 style={pg.title}>Nueva receta</h1>
      </div>
      <div style={pg.formCard}>
        <Field label="Nombre" value={form.nombre} onChange={set('nombre')} required />
        <Field label="Categoría" value={form.categoria} onChange={set('categoria')} placeholder="Tortas, Galletas..." />
        <Field label="Descripción" value={form.descripcion} onChange={set('descripcion')} multiline />
        <div style={pg.row3}>
          <Field label="Costo ingredientes (€)" type="number" value={form.costoIngredientesEur} onChange={set('costoIngredientesEur')} />
          <Field label="Costo gas (€)" type="number" value={form.costoGasEur} onChange={set('costoGasEur')} />
          <Field label="Costo empaque (€)" type="number" value={form.costoEmpaqueEur} onChange={set('costoEmpaqueEur')} />
        </div>
        <div style={pg.costoResumen}>
          <span>Costo total: <strong>€{costoTotal.toFixed(2)}</strong></span>
          <Field label="Precio de venta (€)" type="number" value={form.precioVentaEur} onChange={set('precioVentaEur')} />
          <span style={{ color: margen >= 30 ? '#2D6A4F' : '#F0A500', fontWeight: 600 }}>
            Margen: {margen}%
          </span>
        </div>
        <Field label="Notas" value={form.notas} onChange={set('notas')} multiline />
        <button style={pg.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar receta'}
        </button>
      </div>
    </div>
  )
}

// ── Inventario ────────────────────────────────────────────────────────────────
export function InventarioPage() {
  const { activeWorkspaceId } = useAppStore()
  const [ingredientes, setIngredientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBajoStock, setShowBajoStock] = useState(false)
  const { ingredientesApi } = await import('../services/api.js').catch(() => ({ ingredientesApi: null }))

  useEffect(() => {
    import('../services/api.js').then(({ ingredientesApi }) => {
      ingredientesApi.list(activeWorkspaceId, showBajoStock ? { bajoStock: true } : {})
        .then(setIngredientes).finally(() => setLoading(false))
    })
  }, [activeWorkspaceId, showBajoStock])

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <h1 style={pg.title}>Inventario</h1>
        <button style={pg.btnSecondary} onClick={() => setShowBajoStock(!showBajoStock)}>
          {showBajoStock ? 'Ver todo' : '⚠️ Stock bajo'}
        </button>
      </div>
      {loading ? <p style={pg.loading}>Cargando...</p> : (
        <div style={pg.tableCard}>
          <table style={pg.table}>
            <thead>
              <tr>
                {['Ingrediente', 'Categoría', 'Stock', 'Mínimo', 'Precio/u', 'Estado'].map(h => (
                  <th key={h} style={pg.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ingredientes.map(i => {
                const bajo = i.cantidadActual <= i.cantidadMinima
                return (
                  <tr key={i.id} style={bajo ? { background: '#fff8f8' } : {}}>
                    <td style={pg.td}><strong>{i.nombre}</strong></td>
                    <td style={pg.td}>{i.categoria || '—'}</td>
                    <td style={{ ...pg.td, color: bajo ? '#C1392B' : '#2D6A4F', fontWeight: 600 }}>
                      {i.cantidadActual}{i.unidad}
                    </td>
                    <td style={pg.td}>{i.cantidadMinima}{i.unidad}</td>
                    <td style={pg.td}>€{i.precioEur?.toFixed(3)}</td>
                    <td style={pg.td}>
                      {bajo
                        ? <span style={pg.tagDanger}>Bajo stock</span>
                        : <span style={pg.tagOk}>OK</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {ingredientes.length === 0 && <p style={pg.empty}>Sin ingredientes registrados</p>}
        </div>
      )}
    </div>
  )
}

// ── Pedidos ───────────────────────────────────────────────────────────────────
export function PedidosPage() {
  const { activeWorkspaceId } = useAppStore()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    import('../services/api.js').then(({ pedidosApi }) => {
      pedidosApi.list(activeWorkspaceId, estadoFiltro ? { estado: estadoFiltro } : {})
        .then(d => setPedidos(d.data)).finally(() => setLoading(false))
    })
  }, [activeWorkspaceId, estadoFiltro])

  const ESTADOS = ['', 'PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'CANCELADO']
  const ESTADO_COLOR = { PENDIENTE: '#F0A500', EN_PROCESO: '#7B61C4', ENTREGADO: '#2D6A4F', CANCELADO: '#C1392B' }

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <h1 style={pg.title}>Pedidos</h1>
        <button style={pg.btnPrimary} onClick={() => navigate('/pedidos/nuevo')}>+ Nuevo pedido</button>
      </div>
      <div style={pg.filterRow}>
        {ESTADOS.map(e => (
          <button key={e} style={{ ...pg.filterBtn, ...(estadoFiltro === e ? pg.filterBtnActive : {}) }}
            onClick={() => setEstadoFiltro(e)}>
            {e || 'Todos'}
          </button>
        ))}
      </div>
      {loading ? <p style={pg.loading}>Cargando...</p> : (
        <div style={pg.list}>
          {pedidos.map(p => (
            <div key={p.id} style={pg.pedidoCard}>
              <div style={pg.pedidoTop}>
                <span style={pg.pedidoNum}>#{p.numeroPedido}</span>
                <span style={{ ...pg.estadoBadge, background: ESTADO_COLOR[p.estado] + '20', color: ESTADO_COLOR[p.estado] }}>
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
            </div>
          ))}
          {pedidos.length === 0 && <p style={pg.empty}>No hay pedidos con este filtro</p>}
        </div>
      )}
    </div>
  )
}

export function NuevoPedidoPage() {
  const navigate = useNavigate()
  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <button style={pg.btnBack} onClick={() => navigate('/pedidos')}>← Volver</button>
        <h1 style={pg.title}>Nuevo pedido</h1>
      </div>
      <div style={{ ...pg.formCard, textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: 40 }}>✦</p>
        <p style={{ fontSize: 16, color: '#3D2B7A', fontWeight: 600, marginTop: 8 }}>
          Usa Dulce IA para crear pedidos
        </p>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8, marginBottom: 20 }}>
          Solo dile: <em>"Anotar pedido de torta de chocolate para María, entrega el viernes"</em>
        </p>
        <button style={pg.btnPrimary} onClick={() => navigate('/ia')}>
          Abrir Dulce IA →
        </button>
      </div>
    </div>
  )
}

export function HistorialPage() {
  const { activeWorkspaceId } = useAppStore()
  const [historial, setHistorial] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    import('../services/api.js').then(({ dashboardApi }) => {
      dashboardApi.historial(activeWorkspaceId, '30d').then(setHistorial)
    })
  }, [activeWorkspaceId])

  return (
    <div style={pg.page}>
      <h1 style={pg.title}>Historial de ventas</h1>
      <div style={pg.tableCard}>
        <table style={pg.table}>
          <thead><tr>
            <th style={pg.th}>Fecha</th>
            <th style={pg.th}>Ventas</th>
            <th style={pg.th}>Ingresos (€)</th>
            <th style={pg.th}>Ganancia (€)</th>
          </tr></thead>
          <tbody>
            {historial.map(d => (
              <tr key={d.fecha}>
                <td style={pg.td}>{d.fecha}</td>
                <td style={pg.td}>{d.ventas}</td>
                <td style={pg.td}>€{d.ingresos.toFixed(2)}</td>
                <td style={{ ...pg.td, color: '#2D6A4F', fontWeight: 500 }}>€{d.ganancia.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {historial.length === 0 && <p style={pg.empty}>Sin historial de ventas</p>}
      </div>
    </div>
  )
}

export function ConfigPage() {
  const navigate = useNavigate()
  return (
    <div style={pg.page}>
      <h1 style={pg.title}>Configuración</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: '👤 Perfil del negocio', to: null },
          { label: '💱 Tasa BCV', to: null },
          { label: '👥 Miembros del workspace', to: null },
          { label: '🤖 Conectar Telegram', to: null },
          { label: '🔔 Notificaciones', to: null },
          { label: '💾 Backup', to: null }
        ].map(item => (
          <div key={item.label} style={pg.configItem}>
            <span>{item.label}</span>
            <span>→</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Componente Field reutilizable ─────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', required, placeholder, multiline }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={pg.label}>{label}{required && ' *'}</label>
      {multiline
        ? <textarea style={{ ...pg.input, minHeight: 80, resize: 'vertical' }}
            value={value} onChange={onChange} placeholder={placeholder} />
        : <input style={pg.input} type={type} value={value} onChange={onChange}
            required={required} placeholder={placeholder} />}
    </div>
  )
}

// ── Estilos compartidos ───────────────────────────────────────────────────────
const pg = {
  page: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 20, fontWeight: 600, color: '#1a1a2e' },
  loading: { color: '#6b7280', padding: '2rem', textAlign: 'center' },
  empty: { color: '#9ca3af', padding: '2rem', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
  card: {
    background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)',
    overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s'
  },
  cardImg: { width: '100%', height: 130, objectFit: 'cover' },
  cardBody: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a2e' },
  cardSub: { fontSize: 11, color: '#9ca3af' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  precio: { fontSize: 15, fontWeight: 700, color: '#7B61C4' },
  margen: { fontSize: 12, fontWeight: 500 },
  tag: { fontSize: 11, background: '#ede9ff', color: '#7B61C4', padding: '2px 8px', borderRadius: 20, alignSelf: 'flex-start' },
  tagDanger: { fontSize: 11, background: '#fff0f0', color: '#C1392B', padding: '2px 8px', borderRadius: 20 },
  tagOk: { fontSize: 11, background: '#f0faf0', color: '#2D6A4F', padding: '2px 8px', borderRadius: 20 },
  search: { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none' },
  formCard: {
    background: '#fff', borderRadius: 12, padding: '1.5rem',
    border: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 14
  },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: {
    padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 14, outline: 'none', fontFamily: 'inherit'
  },
  row3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  costoResumen: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 14 },
  btnPrimary: {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: '#7B61C4', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer'
  },
  btnSecondary: {
    padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)',
    background: '#fff', color: '#374151', fontSize: 14, cursor: 'pointer'
  },
  btnBack: {
    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
    background: '#fff', color: '#6b7280', fontSize: 13, cursor: 'pointer'
  },
  tableCard: { background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.06)' },
  td: { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid rgba(0,0,0,0.04)', color: '#374151' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280' },
  filterBtnActive: { background: '#7B61C4', color: '#fff', border: '1px solid #7B61C4' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  pedidoCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 6 },
  pedidoTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pedidoNum: { fontSize: 12, color: '#9ca3af', fontWeight: 600 },
  estadoBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  pedidoReceta: { fontSize: 15, fontWeight: 600, color: '#1a1a2e' },
  pedidoCliente: { fontSize: 13, color: '#6b7280' },
  pedidoFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  pedidoTotal: { fontSize: 16, fontWeight: 700, color: '#7B61C4' },
  pedidoFecha: { fontSize: 12, color: '#6b7280' },
  configItem: {
    background: '#fff', borderRadius: 10, padding: '14px 16px',
    border: '1px solid rgba(0,0,0,0.07)', display: 'flex',
    justifyContent: 'space-between', cursor: 'pointer', fontSize: 14, color: '#374151'
  }
}
