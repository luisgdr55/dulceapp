// src/pages/_styles.js
// Estilos compartidos entre todas las páginas de la app

export const pg = {
  page:    { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title:   { fontSize: 20, fontWeight: 600, color: '#1a1a2e' },
  loading: { color: '#6b7280', padding: '2rem', textAlign: 'center' },
  empty:   { color: '#9ca3af', padding: '2rem', textAlign: 'center' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', cursor: 'pointer' },
  cardImg:   { width: '100%', height: 130, objectFit: 'cover' },
  cardBody:  { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a2e' },
  cardSub:   { fontSize: 11, color: '#9ca3af' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  precio: { fontSize: 15, fontWeight: 700, color: '#7B61C4' },
  margen: { fontSize: 12, fontWeight: 500 },

  tag:      { fontSize: 11, background: '#ede9ff', color: '#7B61C4',   padding: '2px 8px', borderRadius: 20, alignSelf: 'flex-start' },
  tagDanger: { fontSize: 11, background: '#fff0f0', color: '#C1392B',  padding: '2px 8px', borderRadius: 20 },
  tagOk:     { fontSize: 11, background: '#f0faf0', color: '#2D6A4F',  padding: '2px 8px', borderRadius: 20 },

  search: { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none' },

  formCard: { background: '#fff', borderRadius: 12, padding: '1.5rem', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 14 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  row3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  costoResumen: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 14 },

  btnPrimary: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7B61C4', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#374151', fontSize: 14, cursor: 'pointer' },
  btnBack: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#6b7280', fontSize: 13, cursor: 'pointer' },

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

  configItem: { background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontSize: 14, color: '#374151' }
}

// Componente Field reutilizable
export function Field({ label, value, onChange, type = 'text', required, placeholder, multiline }) {
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
