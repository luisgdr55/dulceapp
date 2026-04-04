// src/pages/RecetarioPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore.js'
import { recetasApi } from '../services/api.js'
import { pg } from './_styles.jsx'

export function RecetarioPage() {
  const { activeWorkspaceId } = useAppStore()
  const [recetas, setRecetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!activeWorkspaceId) return
    setLoading(true)
    recetasApi.list(activeWorkspaceId, { search })
      .then(setRecetas)
      .catch(console.error)
      .finally(() => setLoading(false))
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
                {r._count?.pedidos > 0 && <p style={pg.cardSub}>{r._count.pedidos} pedido(s)</p>}
              </div>
            </div>
          ))}
          {!loading && recetas.length === 0 && <p style={pg.empty}>No hay recetas. ¡Crea la primera!</p>}
        </div>
      )}
    </div>
  )
}
