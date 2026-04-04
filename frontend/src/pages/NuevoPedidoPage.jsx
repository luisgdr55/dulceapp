// src/pages/NuevoPedidoPage.jsx
import { useNavigate } from 'react-router-dom'
import { pg } from './_styles.jsx'

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
