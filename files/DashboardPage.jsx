// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '../stores/appStore.js'
import { dashboardApi } from '../services/api.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function DashboardPage() {
  const { dashboard, dashboardLoading, fetchDashboard, activeWorkspaceId, activeWorkspace } = useAppStore()
  const [periodo, setPeriodo] = useState('7d')
  const [historial, setHistorial] = useState([])
  const navigate = useNavigate()

  useEffect(() => { fetchDashboard(periodo) }, [periodo])

  useEffect(() => {
    if (!activeWorkspaceId) return
    dashboardApi.historial(activeWorkspaceId, periodo).then(setHistorial).catch(() => {})
  }, [activeWorkspaceId, periodo])

  const d = dashboard

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>
            {greeting()}, {d?.user?.nombre || activeWorkspace?.nombre || '👋'}
          </h1>
          <p style={styles.subtitle}>
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            {d?.tasaBCV ? ` · Tasa BCV: ${d.tasaBCV} Bs/€` : ''}
          </p>
        </div>
        <div style={styles.periodBtns}>
          {['7d', '30d', '90d'].map(p => (
            <button
              key={p}
              style={{ ...styles.periodBtn, ...(periodo === p ? styles.periodBtnActive : {}) }}
              onClick={() => setPeriodo(p)}
            >
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas principales */}
      <div style={styles.metricsGrid}>
        <MetricCard
          label="Ventas hoy"
          value={`€${(d?.hoy?.ingresosEur || 0).toFixed(2)}`}
          sub={`${d?.hoy?.ventas || 0} pedido(s)`}
          color="#7B61C4"
          loading={dashboardLoading}
        />
        <MetricCard
          label={`Ingresos ${periodo}`}
          value={`€${(d?.periodo_stats?.ingresosEur || 0).toFixed(2)}`}
          sub={d?.periodo_stats?.variacionPct != null
            ? `${d.periodo_stats.variacionPct > 0 ? '↑' : '↓'} ${Math.abs(d.periodo_stats.variacionPct)}% vs período anterior`
            : `${d?.periodo_stats?.ventas || 0} ventas`}
          color={d?.periodo_stats?.variacionPct >= 0 ? '#2D6A4F' : '#C1392B'}
          loading={dashboardLoading}
        />
        <MetricCard
          label="Ganancia neta"
          value={`€${(d?.periodo_stats?.gananciaEur || 0).toFixed(2)}`}
          sub="después de costos"
          color="#2D6A4F"
          loading={dashboardLoading}
        />
        <MetricCard
          label="Pendientes"
          value={d?.pedidosPendientes || 0}
          sub={`${d?.pedidosEnProceso || 0} en proceso`}
          color="#F0A500"
          onClick={() => navigate('/pedidos?estado=PENDIENTE')}
          loading={dashboardLoading}
        />
      </div>

      {/* Gráfico de ventas */}
      {historial.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Ventas diarias</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={historial} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61C4" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#7B61C4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`€${v.toFixed(2)}`, 'Ingresos']} />
              <Area type="monotone" dataKey="ingresos" stroke="#7B61C4" strokeWidth={2} fill="url(#colorIngresos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={styles.twoCol}>
        {/* Alertas de stock */}
        {d?.stockBajo?.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              ⚠️ Stock bajo
              <span style={styles.badge}>{d.stockBajo.length}</span>
            </h2>
            {d.stockBajo.map(i => (
              <div key={i.id} style={styles.stockRow}>
                <span style={styles.stockNombre}>{i.nombre}</span>
                <span style={styles.stockCantidad}>
                  {i.cantidadActual}{i.unidad} / {i.cantidadMinima}{i.unidad}
                </span>
              </div>
            ))}
            <button style={styles.linkBtn} onClick={() => navigate('/inventario')}>
              Ver inventario →
            </button>
          </div>
        )}

        {/* Recetas top */}
        {d?.recetasTop?.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>🏆 Más vendidas</h2>
            {d.recetasTop.map((r, i) => (
              <div key={r.recetaId} style={styles.topRow}>
                <span style={styles.topRank}>#{i + 1}</span>
                <span style={styles.topNombre}>{r.nombre}</span>
                <span style={styles.topVentas}>{r.ventas} ventas · €{r.gananciaEur.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximas entregas */}
      {d?.proximasEntregas?.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📅 Próximas entregas</h2>
          {d.proximasEntregas.map(p => (
            <div key={p.id} style={styles.entregaRow} onClick={() => navigate(`/pedidos`)}>
              <div>
                <span style={styles.entregaNombre}>{p.receta?.nombre || 'Sin receta'}</span>
                {p.clienteNombre && <span style={styles.entregaCliente}> · {p.clienteNombre}</span>}
              </div>
              <div style={styles.entregaFecha}>
                {p.fechaEntrega
                  ? format(new Date(p.fechaEntrega), 'EEE d MMM', { locale: es })
                  : 'Sin fecha'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acceso rápido a IA */}
      <div style={styles.iaBanner} onClick={() => navigate('/ia')}>
        <span style={styles.iaIcon}>✦</span>
        <div>
          <p style={styles.iaTitulo}>Habla con Dulce</p>
          <p style={styles.iaSub}>Registra pedidos, consulta tu negocio o pide análisis</p>
        </div>
        <span style={styles.iaArrow}>→</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color, onClick, loading }) {
  return (
    <div style={{ ...styles.metric, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <p style={styles.metricLabel}>{label}</p>
      <p style={{ ...styles.metricValue, color: loading ? '#ccc' : color }}>
        {loading ? '—' : value}
      </p>
      <p style={styles.metricSub}>{sub}</p>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 600, color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  periodBtns: { display: 'flex', gap: 4 },
  periodBtn: {
    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
    background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280'
  },
  periodBtnActive: { background: '#7B61C4', color: '#fff', border: '1px solid #7B61C4' },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12
  },
  metric: {
    background: '#fff',
    borderRadius: 12,
    padding: '16px',
    border: '1px solid rgba(0,0,0,0.06)'
  },
  metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  metricValue: { fontSize: 22, fontWeight: 600, lineHeight: 1 },
  metricSub: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '16px',
    border: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  cardTitle: {
    fontSize: 14, fontWeight: 600, color: '#1a1a2e',
    display: 'flex', alignItems: 'center', gap: 8
  },
  badge: {
    background: '#ffe4e4', color: '#C1392B',
    fontSize: 11, padding: '2px 8px', borderRadius: 20
  },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  stockRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'center' },
  stockNombre: { color: '#1a1a2e' },
  stockCantidad: { color: '#C1392B', fontWeight: 500, fontSize: 12 },
  linkBtn: {
    marginTop: 4, background: 'none', border: 'none',
    color: '#7B61C4', cursor: 'pointer', fontSize: 13, textAlign: 'left', padding: 0
  },
  topRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  topRank: { color: '#7B61C4', fontWeight: 700, minWidth: 24 },
  topNombre: { flex: 1, color: '#1a1a2e' },
  topVentas: { color: '#6b7280', fontSize: 12 },
  entregaRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', fontSize: 13
  },
  entregaNombre: { fontWeight: 500, color: '#1a1a2e' },
  entregaCliente: { color: '#6b7280' },
  entregaFecha: { color: '#7B61C4', fontSize: 12, fontWeight: 500 },
  iaBanner: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'linear-gradient(135deg, #3D2B7A, #7B61C4)',
    borderRadius: 12, padding: '16px 20px', cursor: 'pointer'
  },
  iaIcon: { fontSize: 28, color: '#c4b5fd' },
  iaTitulo: { color: '#fff', fontWeight: 600, fontSize: 15 },
  iaSub: { color: '#c4b5fd', fontSize: 12, marginTop: 2 },
  iaArrow: { marginLeft: 'auto', color: '#c4b5fd', fontSize: 20 }
}
