// src/pages/InventarioPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../stores/appStore.js'
import { ingredientesApi, recetasApi } from '../services/api.js'
import { pg, Field } from './_styles.jsx'

const EMPTY_FORM = {
  nombre: '', categoria: '', unidad: 'g', cantidadActual: 0,
  cantidadMinima: 0, precioUsd: 0, cantidadPorCompra: 1, proveedor: '', notas: '', esAccesorio: false
}

const s = {
  formPanel: { background: '#f7f4ff', borderRadius: 12, border: '1px solid rgba(123,97,196,0.2)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 },
  panelTitle: { fontSize: 15, fontWeight: 600, color: '#3D2B7A' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  stockCell: { display: 'flex', alignItems: 'center', gap: 4 },
  stockBtn: { width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', padding: 0 },
  stockInput: { width: 56, padding: '3px 6px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, fontSize: 13, textAlign: 'center', outline: 'none' },
  btnLink: { background: 'none', border: 'none', cursor: 'pointer', color: '#7B61C4', fontSize: 13, fontWeight: 600, padding: 0, textDecoration: 'underline' },
  check: { width: 16, height: 16, cursor: 'pointer' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
}

export function InventarioPage() {
  const { activeWorkspaceId } = useAppStore()
  const [ingredientes, setIngredientes] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [showBajoStock, setShowBajoStock] = useState(false)
  const [showAccesorios, setShowAccesorios] = useState(false)

  // Panel de formulario (crear o editar)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formMsg, setFormMsg] = useState(null)

  // Stock editado por fila (id → valor temporal)
  const [stockEdits, setStockEdits] = useState({})

  // Precio inline: id → { editing: bool, value: string }
  const [precioEdits, setPrecioEdits] = useState({})
  // ids de ingredientes cuyo precio fue actualizado (para mostrar botón recalcular)
  const [actualizados, setActualizados] = useState(new Set())
  const [recalcMsg, setRecalcMsg] = useState(null)

  const load = useCallback(() => {
    if (!activeWorkspaceId) return
    setLoading(true)
    ingredientesApi.list(activeWorkspaceId, {
      ...(showBajoStock && { bajoStock: true }),
      ...(showAccesorios && { esAccesorio: true }),
      ...(search && { search })
    })
      .then(setIngredientes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeWorkspaceId, showBajoStock, showAccesorios, search])

  useEffect(() => { load() }, [load])

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormMsg(null)
    setShowForm(true)
  }

  const openEdit = (ing) => {
    setForm({
      nombre: ing.nombre || '', categoria: ing.categoria || '', unidad: ing.unidad || 'g',
      cantidadActual: ing.cantidadActual || 0, cantidadMinima: ing.cantidadMinima || 0,
      precioUsd: ing.precioUsd || 0, cantidadPorCompra: ing.cantidadPorCompra || 1,
      proveedor: ing.proveedor || '', notas: ing.notas || '', esAccesorio: ing.esAccesorio || false
    })
    setEditingId(ing.id)
    setFormMsg(null)
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const saveForm = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        cantidadActual: parseFloat(form.cantidadActual) || 0,
        cantidadMinima: parseFloat(form.cantidadMinima) || 0,
        precioUsd: parseFloat(form.precioUsd) || 0,
        cantidadPorCompra: parseFloat(form.cantidadPorCompra) || 1
      }
      if (editingId) {
        await ingredientesApi.update(activeWorkspaceId, editingId, payload)
      } else {
        await ingredientesApi.create(activeWorkspaceId, payload)
      }
      setFormMsg({ ok: true, text: editingId ? 'Ingrediente actualizado' : 'Ingrediente creado' })
      load()
      setTimeout(() => { setFormMsg(null); closeForm() }, 1200)
    } catch (err) {
      setFormMsg({ ok: false, text: err.message })
    }
    setSaving(false)
  }

  // Stock rápido por fila
  const setStockEdit = (id, val) => setStockEdits(p => ({ ...p, [id]: val }))

  const applyStock = async (id, operacion) => {
    const val = parseFloat(stockEdits[id])
    if (isNaN(val) || val < 0) return
    try {
      const updated = await ingredientesApi.stock(activeWorkspaceId, id, val, operacion)
      setIngredientes(prev => prev.map(i => i.id === id ? updated : i))
      setStockEdits(p => { const n = { ...p }; delete n[id]; return n })
    } catch (err) { alert(err.message) }
  }

  // Precio inline editable
  const startEditPrecio = (id, precioActual) => {
    setPrecioEdits(p => ({ ...p, [id]: { editing: true, value: String(precioActual) } }))
  }
  const setPrecioVal = (id, val) => {
    setPrecioEdits(p => ({ ...p, [id]: { ...p[id], value: val } }))
  }
  const commitPrecio = async (id) => {
    const edit = precioEdits[id]
    if (!edit) return
    const nuevoPrecio = parseFloat(edit.value)
    if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      setPrecioEdits(p => { const n = { ...p }; delete n[id]; return n })
      return
    }
    try {
      const updated = await ingredientesApi.patch(activeWorkspaceId, id, { precioUsd: nuevoPrecio })
      setIngredientes(prev => prev.map(i => i.id === id ? updated : i))
      setActualizados(prev => new Set([...prev, id]))
    } catch (err) { alert(err.message) }
    setPrecioEdits(p => { const n = { ...p }; delete n[id]; return n })
  }

  const recalcularRecetas = async () => {
    try {
      const recetas = await recetasApi.list(activeWorkspaceId)
      const afectadas = recetas.filter(r =>
        r.ingredientes?.some(ri => actualizados.has(ri.ingredienteId))
      )
      setRecalcMsg(`${afectadas.length} receta(s) tienen ingredientes con precio actualizado. Sus costos se recalcularán al abrir cada receta.`)
      setActualizados(new Set())
    } catch { setRecalcMsg('No se pudo verificar las recetas afectadas') }
  }

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <h1 style={pg.title}>Inventario</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {actualizados.size > 0 && (
            <button style={{ ...pg.btnSecondary, background: '#fffbeb', color: '#92400e', border: '1px solid #fbbf24' }}
              onClick={recalcularRecetas}>
              ⚠️ Recalcular recetas ({actualizados.size} precio{actualizados.size > 1 ? 's' : ''} cambiado{actualizados.size > 1 ? 's' : ''})
            </button>
          )}
          <button style={pg.btnPrimary} onClick={openCreate}>+ Agregar</button>
        </div>
      </div>
      {recalcMsg && (
        <div style={{ background: '#f0faf5', border: '1px solid #2D6A4F', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#2D6A4F', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{recalcMsg}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2D6A4F', fontWeight: 700 }} onClick={() => setRecalcMsg(null)}>✕</button>
        </div>
      )}

      {/* Filtros */}
      <div style={s.filterRow}>
        <input style={{ ...pg.search, flex: 1, minWidth: 160 }} placeholder="Buscar ingrediente..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <button style={{ ...pg.filterBtn, ...(showBajoStock ? pg.filterBtnActive : {}) }}
          onClick={() => setShowBajoStock(!showBajoStock)}>
          ⚠️ Stock bajo
        </button>
        <button style={{ ...pg.filterBtn, ...(showAccesorios ? pg.filterBtnActive : {}) }}
          onClick={() => setShowAccesorios(!showAccesorios)}>
          📦 Accesorios
        </button>
      </div>

      {/* Formulario de creación / edición */}
      {showForm && (
        <div style={s.formPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={s.panelTitle}>{editingId ? 'Editar ingrediente' : 'Nuevo ingrediente'}</p>
            <button style={pg.btnBack} onClick={closeForm}>✕ Cerrar</button>
          </div>
          <div style={s.row2}>
            <Field label="Nombre *" value={form.nombre} onChange={set('nombre')} required />
            <Field label="Categoría" value={form.categoria} onChange={set('categoria')} placeholder="Lácteos, Harinas..." />
          </div>
          <div style={s.row3}>
            <Field label="Unidad *" value={form.unidad} onChange={set('unidad')} placeholder="g, kg, ml, u" />
            <Field label="Cantidad actual" type="number" value={form.cantidadActual} onChange={set('cantidadActual')} />
            <Field label="Cantidad mínima" type="number" value={form.cantidadMinima} onChange={set('cantidadMinima')} />
          </div>
          <div style={s.row3}>
            <Field label="Precio del paquete (USD)" type="number" value={form.precioUsd} onChange={set('precioUsd')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Field label={`Cantidad por paquete (ej: 900 si es bolsa de 900${form.unidad})`} type="number" value={form.cantidadPorCompra} onChange={set('cantidadPorCompra')} />
              {form.precioUsd > 0 && form.cantidadPorCompra > 0 && (
                <span style={{ fontSize: 11, color: '#7B61C4', fontWeight: 500 }}>
                  Costo unitario: ${(parseFloat(form.precioUsd) / parseFloat(form.cantidadPorCompra)).toFixed(4)}/{form.unidad || 'u'}
                </span>
              )}
            </div>
            <Field label="Proveedor" value={form.proveedor} onChange={set('proveedor')} />
          </div>
          <Field label="Notas" value={form.notas} onChange={set('notas')} multiline />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" style={s.check} checked={form.esAccesorio} onChange={set('esAccesorio')} />
            Es accesorio (empaque, caja, lazo...)
          </label>
          {formMsg && (
            <p style={formMsg.ok ? { fontSize: 13, color: '#2D6A4F', background: '#f0faf5', padding: '8px 12px', borderRadius: 8 }
              : { fontSize: 13, color: '#C1392B', background: '#fff5f5', padding: '8px 12px', borderRadius: 8 }}>
              {formMsg.text}
            </p>
          )}
          <button style={pg.btnPrimary} onClick={saveForm} disabled={saving || !form.nombre || !form.unidad}>
            {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear ingrediente'}
          </button>
        </div>
      )}

      {loading ? <p style={pg.loading}>Cargando...</p> : (
        <div style={pg.tableCard}>
          <table style={pg.table}>
            <thead>
              <tr>
                {['Ingrediente', 'Categoría', 'Stock actual', 'Mínimo', 'Paquete (USD)', 'Costo unitario', 'Estado', 'Ajuste rápido'].map(h => (
                  <th key={h} style={pg.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ingredientes.map(i => {
                const bajo = i.cantidadActual <= i.cantidadMinima
                const editVal = stockEdits[i.id] !== undefined ? stockEdits[i.id] : ''
                return (
                  <tr key={i.id} style={bajo ? { background: '#fff8f8' } : {}}>
                    <td style={pg.td}>
                      <button style={s.btnLink} onClick={() => openEdit(i)}>{i.nombre}</button>
                      {i.esAccesorio && <span style={{ ...pg.tag, marginLeft: 6, fontSize: 10 }}>accesorio</span>}
                    </td>
                    <td style={pg.td}>{i.categoria || '—'}</td>
                    <td style={{ ...pg.td, color: bajo ? '#C1392B' : '#2D6A4F', fontWeight: 600 }}>
                      {i.cantidadActual}{i.unidad}
                    </td>
                    <td style={pg.td}>{i.cantidadMinima}{i.unidad}</td>
                    <td style={pg.td}>
                      {precioEdits[i.id]?.editing ? (
                        <input
                          style={{ ...s.stockInput, width: 72 }}
                          type="number"
                          step="0.01"
                          autoFocus
                          value={precioEdits[i.id].value}
                          onChange={e => setPrecioVal(i.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitPrecio(i.id); if (e.key === 'Escape') setPrecioEdits(p => { const n = { ...p }; delete n[i.id]; return n }) }}
                          onBlur={() => commitPrecio(i.id)}
                        />
                      ) : (
                        <button style={{ ...s.btnLink, fontSize: 13 }} title="Click para editar precio"
                          onClick={() => startEditPrecio(i.id, i.precioUsd)}>
                          ${i.precioUsd?.toFixed(2)} / {i.cantidadPorCompra || 1}{i.unidad}
                        </button>
                      )}
                    </td>
                    <td style={{ ...pg.td, color: '#7B61C4', fontWeight: 500 }}>
                      ${((i.precioUsd || 0) / (i.cantidadPorCompra || 1)).toFixed(4)}/{i.unidad}
                    </td>
                    <td style={pg.td}>
                      {bajo ? <span style={pg.tagDanger}>Bajo stock</span> : <span style={pg.tagOk}>OK</span>}
                    </td>
                    <td style={pg.td}>
                      <div style={s.stockCell}>
                        <button style={s.stockBtn}
                          onClick={() => { setStockEdit(i.id, 1); setTimeout(() => applyStock(i.id, 'decrement'), 0) }}
                          title="Decrementar 1">−</button>
                        <input
                          style={s.stockInput}
                          type="number"
                          value={editVal}
                          placeholder={String(i.cantidadActual)}
                          onChange={e => setStockEdit(i.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') applyStock(i.id, 'set') }}
                          min="0"
                        />
                        <button style={s.stockBtn}
                          onClick={() => { setStockEdit(i.id, 1); setTimeout(() => applyStock(i.id, 'increment'), 0) }}
                          title="Incrementar 1">+</button>
                        {editVal !== '' && (
                          <button style={{ ...pg.btnSecondary, padding: '3px 8px', fontSize: 11 }}
                            onClick={() => applyStock(i.id, 'set')}>✓</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {ingredientes.length === 0 && <p style={pg.empty}>Sin ingredientes. ¡Agrega el primero!</p>}
        </div>
      )}
    </div>
  )
}
