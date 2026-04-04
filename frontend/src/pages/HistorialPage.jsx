// src/pages/HistorialPage.jsx
// Import estático — sin await import() dinámico
import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore.js'
import { dashboardApi } from '../services/api.js'
import { pg } from './_styles.jsx'

export function HistorialPage() {
  const { activeWorkspaceId } = useAppStore()
  const [historial, setHistorial] = useState([])

  useEffect(() => {
    if (!activeWorkspaceId) return
    dashboardApi.historial(activeWorkspaceId, '30d').then(setHistorial).catch(console.error)
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
