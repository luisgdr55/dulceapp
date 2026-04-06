// src/pages/RecetaDetallePage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../stores/appStore.js'
import { recetasApi, ingredientesApi, workspacesApi } from '../services/api.js'
import { pg, Field } from './_styles.jsx'

const s = {
  section: { background: '#f7f4ff', borderRadius: 12, border: '1px solid rgba(123,97,196,0.15)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#3D2B7A', marginBottom: 2 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  ingSearch: { padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' },
  ingDropdown: { background: '#fff', border: '1px solid rgba(123,97,196,0.25)', borderRadius: 8, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  ingOption: { padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  ingRow: { display: 'grid', gridTemplateColumns: '1fr 80px 80px auto', gap: 8, alignItems: 'center', padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.07)' },
  ingRowLabel: { fontSize: 13, color: '#1a1a2e', fontWeight: 500 },
  ingInput: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, textAlign: 'center', outline: 'none', width: '100%' },
  ingUnit: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  ingCost: { fontSize: 11, color: '#7B61C4' },
  btnRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#C1392B', fontSize: 16, padding: '2px 6px', borderRadius: 4 },
  costoBox: { background: '#fff', border: '1px solid rgba(123,97,196,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13 },
  costoLine: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#374151' },
  costoTotal: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 700, fontSize: 14, color: '#3D2B7A', borderTop: '1px solid rgba(123,97,196,0.15)', marginTop: 4 },
  toggleRow: { display: 'flex', gap: 8 },
  toggleBtn: (active) => ({ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${active ? '#7B61C4' : 'rgba(0,0,0,0.1)'}`, background: active ? '#ede9ff' : '#fff', color: active ? '#7B61C4' : '#374151', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer' }),
  margenBar: { height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden', marginTop: 4 },
  margenFill: (pct) => ({ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: pct >= 30 ? '#2D6A4F' : pct >= 15 ? '#F0A500' : '#C1392B', borderRadius: 4, transition: 'width 0.3s' }),
  varianteRow: { display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, alignItems: 'center' },
  btnAdd: { background: 'none', border: '1px dashed rgba(123,97,196,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#7B61C4', cursor: 'pointer', width: '100%' }
}

export function RecetaDetallePage() {
  const { activeWorkspaceId } = useAppStore()
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nueva'

  // — Sección A: datos básicos
  const [form, setForm] = useState({
    nombre: '', categoria: '', descripcion: '', porciones: 1,
    tiempoPrep: '', tiempoElaboracion: '', imagenUrl: '', notas: ''
  })

  // — Sección B: ingredientes
  const [ingredientesDisp, setIngredientesDisp] = useState([])
  const [ingSearch, setIngSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [ingSeleccionados, setIngSeleccionados] = useState([])
  // { ingredienteId, nombre, unidad, cantidad, precioUsd, cantidadPorCompra }
  const [costoGasEur, setCostoGasEur] = useState(0)
  const [costoEmpaqueEur, setCostoEmpaqueEur] = useState(0)
  const [tarifaHoraEur, setTarifaHoraEur] = useState(5.0)

  // — Sección C: precio / margen
  const [modoCalc, setModoCalc] = useState('margen') // 'margen' | 'precio'
  const [margenInput, setMargenInput] = useState(30)
  const [precioInput, setPrecioInput] = useState(0)
  const [tasas, setTasas] = useState({ usd: 0, eur: 0 })

  // — Sección D: variantes
  const [variantes, setVariantes] = useState([])

  const [saving, setSaving] = useState(false)

  // Cargar tasas y tarifa por hora
  useEffect(() => {
    if (!activeWorkspaceId) return
    workspacesApi.getTasaBCV(activeWorkspaceId).then(d => {
      setTasas({ usd: d.actualUSD?.tasa || 0, eur: d.actualEUR?.tasa || 0 })
    }).catch(() => {})
    workspacesApi.getConfig(activeWorkspaceId).then(c => {
      if (c?.tarifaHoraEur) setTarifaHoraEur(c.tarifaHoraEur)
    }).catch(() => {})
  }, [activeWorkspaceId])

  // Cargar ingredientes disponibles
  useEffect(() => {
    if (!activeWorkspaceId) return
    ingredientesApi.list(activeWorkspaceId).then(setIngredientesDisp).catch(() => {})
  }, [activeWorkspaceId])

  // Cargar receta existente al editar
  useEffect(() => {
    if (!isNew && activeWorkspaceId && id) {
      recetasApi.get(activeWorkspaceId, id).then(r => {
        setForm({
          nombre: r.nombre || '', categoria: r.categoria || '',
          descripcion: r.descripcion || '', porciones: r.porciones || 1,
          tiempoPrep: r.tiempoPrep || '', tiempoElaboracion: r.tiempoElaboracion || '',
          imagenUrl: r.imagenUrl || '', notas: r.notas || ''
        })
        setCostoGasEur(r.costoGasEur || 0)
        setCostoEmpaqueEur(r.costoEmpaqueEur || 0)
        setPrecioInput(r.precioVentaEur || 0)
        setModoCalc('precio')
        // Cargar ingredientes de la receta
        if (r.ingredientes?.length) {
          setIngSeleccionados(r.ingredientes.map(ri => ({
            ingredienteId: ri.ingredienteId,
            nombre: ri.ingrediente?.nombre || ri.ingredienteId,
            unidad: ri.unidad || ri.ingrediente?.unidad || '',
            cantidad: ri.cantidad,
            precioUsd: ri.ingrediente?.precioUsd || 0,
            cantidadPorCompra: ri.ingrediente?.cantidadPorCompra || 1
          })))
        }
        if (r.variantes?.length) {
          setVariantes(r.variantes.map(v => ({ nombre: v.nombre, precioEur: v.precioEur, descripcion: v.descripcion || '' })))
        }
      }).catch(console.error)
    }
  }, [isNew, activeWorkspaceId, id])

  // — Cálculos en tiempo real
  const usdToEur = (tasas.usd > 0 && tasas.eur > 0) ? tasas.usd / tasas.eur : 1

  const costoIngredientesUsd = ingSeleccionados.reduce((sum, i) => {
    const costoUnit = i.precioUsd / (i.cantidadPorCompra || 1)
    return sum + costoUnit * (parseFloat(i.cantidad) || 0)
  }, 0)

  const costoIngredientesEur = costoIngredientesUsd * usdToEur
  const costoManoDeObraEur = form.tiempoElaboracion
    ? (parseFloat(form.tiempoElaboracion) / 60) * parseFloat(tarifaHoraEur || 0)
    : 0
  const costoTotal = costoIngredientesEur + costoManoDeObraEur + parseFloat(costoGasEur || 0) + parseFloat(costoEmpaqueEur || 0)

  // Precio y margen derivados según modo
  const precioFinal = modoCalc === 'margen'
    ? (margenInput < 100 ? costoTotal / (1 - parseFloat(margenInput || 0) / 100) : 0)
    : parseFloat(precioInput || 0)

  const margenFinal = precioFinal > 0
    ? ((precioFinal - costoTotal) / precioFinal) * 100
    : 0

  // — Ingredientes: filtro buscador
  const ingFiltrados = ingredientesDisp.filter(i =>
    !ingSeleccionados.find(s => s.ingredienteId === i.id) &&
    i.nombre.toLowerCase().includes(ingSearch.toLowerCase())
  )

  const agregarIngrediente = (ing) => {
    setIngSeleccionados(prev => [...prev, {
      ingredienteId: ing.id,
      nombre: ing.nombre,
      unidad: ing.unidad,
      cantidad: 1,
      precioUsd: ing.precioUsd,
      cantidadPorCompra: ing.cantidadPorCompra || 1
    }])
    setIngSearch('')
    setShowDrop(false)
  }

  const quitarIngrediente = (ingredienteId) => {
    setIngSeleccionados(prev => prev.filter(i => i.ingredienteId !== ingredienteId))
  }

  const setCantidad = (ingredienteId, val) => {
    setIngSeleccionados(prev => prev.map(i => i.ingredienteId === ingredienteId ? { ...i, cantidad: val } : i))
  }

  // — Variantes
  const addVariante = () => setVariantes(prev => [...prev, { nombre: '', precioEur: 0, descripcion: '' }])
  const setVariante = (idx, key, val) => setVariantes(prev => prev.map((v, i) => i === idx ? { ...v, [key]: val } : v))
  const removeVariante = (idx) => setVariantes(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!form.nombre) return alert('El nombre es obligatorio')
    setSaving(true)
    try {
      const payload = {
        ...form,
        porciones: parseInt(form.porciones) || 1,
        tiempoPrep: form.tiempoPrep ? parseInt(form.tiempoPrep) : undefined,
        tiempoElaboracion: form.tiempoElaboracion ? parseInt(form.tiempoElaboracion) : undefined,
        costoIngredientesUsd,
        costoManoDeObraEur: parseFloat(costoManoDeObraEur.toFixed(4)),
        costoGasEur: parseFloat(costoGasEur) || 0,
        costoEmpaqueEur: parseFloat(costoEmpaqueEur) || 0,
        precioVentaEur: parseFloat(precioFinal.toFixed(2)),
        ingredientes: ingSeleccionados.map(i => ({
          ingredienteId: i.ingredienteId,
          cantidad: parseFloat(i.cantidad) || 0,
          unidad: i.unidad
        })),
        variantes: variantes.filter(v => v.nombre).map(v => ({
          nombre: v.nombre,
          precioEur: parseFloat(v.precioEur) || 0,
          descripcion: v.descripcion || undefined
        }))
      }
      if (isNew) {
        await recetasApi.create(activeWorkspaceId, payload)
      } else {
        await recetasApi.update(activeWorkspaceId, id, payload)
      }
      navigate('/recetario')
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const set = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <button style={pg.btnBack} onClick={() => navigate('/recetario')}>← Volver</button>
        <h1 style={pg.title}>{isNew ? 'Nueva receta' : 'Editar receta'}</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── SECCIÓN A: Datos básicos ────────────────────────────────── */}
        <div style={s.section}>
          <p style={s.sectionTitle}>A — Datos básicos</p>
          <div style={s.row2}>
            <Field label="Nombre *" value={form.nombre} onChange={set('nombre')} required />
            <Field label="Categoría" value={form.categoria} onChange={set('categoria')} placeholder="Tortas, Galletas..." />
          </div>
          <Field label="Descripción" value={form.descripcion} onChange={set('descripcion')} multiline />
          <div style={s.row3}>
            <Field label="Porciones" type="number" value={form.porciones} onChange={set('porciones')} />
            <Field label="Tiempo de preparación (min)" type="number" value={form.tiempoPrep} onChange={set('tiempoPrep')} />
            <Field label="URL de imagen" value={form.imagenUrl} onChange={set('imagenUrl')} placeholder="https://..." />
          </div>
          <div style={s.row2}>
            <div>
              <Field label="Tiempo de elaboración (min)" type="number" value={form.tiempoElaboracion} onChange={set('tiempoElaboracion')} placeholder="Ej: 45" />
              {form.tiempoElaboracion > 0 && tarifaHoraEur > 0 && (
                <p style={{ fontSize: 11, color: '#7B61C4', marginTop: 4, fontWeight: 500 }}>
                  {form.tiempoElaboracion} min × €{Number(tarifaHoraEur).toFixed(2)}/h = €{costoManoDeObraEur.toFixed(4)} mano de obra
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                Tarifa/hora: <strong style={{ color: '#3D2B7A' }}>€{Number(tarifaHoraEur).toFixed(2)}</strong>
                <br />Configurable en <em>Configuración → Perfil</em>
              </p>
            </div>
          </div>
          <Field label="Notas" value={form.notas} onChange={set('notas')} multiline />
        </div>

        {/* ── SECCIÓN B: Ingredientes ──────────────────────────────────── */}
        <div style={s.section}>
          <p style={s.sectionTitle}>B — Ingredientes y costos</p>

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <input
              style={s.ingSearch}
              placeholder="Buscar ingrediente del inventario..."
              value={ingSearch}
              onChange={e => { setIngSearch(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 180)}
            />
            {showDrop && ingSearch && ingFiltrados.length > 0 && (
              <div style={{ ...s.ingDropdown, position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10 }}>
                {ingFiltrados.slice(0, 8).map(ing => (
                  <div key={ing.id} style={s.ingOption}
                    onMouseDown={() => agregarIngrediente(ing)}>
                    <span>{ing.nombre}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      ${(ing.precioUsd / (ing.cantidadPorCompra || 1)).toFixed(4)}/{ing.unidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de ingredientes seleccionados */}
          {ingSeleccionados.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px auto', gap: 8, padding: '0 10px' }}>
                {['Ingrediente', 'Cantidad', 'Unidad', ''].map(h => (
                  <span key={h} style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{h}</span>
                ))}
              </div>
              {ingSeleccionados.map(ing => {
                const costoUnit = ing.precioUsd / (ing.cantidadPorCompra || 1)
                const costoEstaReceta = costoUnit * (parseFloat(ing.cantidad) || 0)
                return (
                  <div key={ing.ingredienteId} style={{ background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.07)', padding: '8px 10px' }}>
                    <div style={s.ingRow}>
                      <div>
                        <div style={s.ingRowLabel}>{ing.nombre}</div>
                        <div style={s.ingCost}>${costoUnit.toFixed(4)}/{ing.unidad} → costo: ${costoEstaReceta.toFixed(4)}</div>
                      </div>
                      <input
                        style={s.ingInput}
                        type="number"
                        min="0"
                        step="any"
                        value={ing.cantidad}
                        onChange={e => setCantidad(ing.ingredienteId, e.target.value)}
                      />
                      <div style={s.ingUnit}>{ing.unidad}</div>
                      <button style={s.btnRemove} onClick={() => quitarIngrediente(ing.ingredienteId)}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {ingSeleccionados.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
              Busca y agrega ingredientes del inventario
            </p>
          )}

          {/* Costos adicionales */}
          <div style={s.row2}>
            <Field label="Costo gas / energía (€)" type="number" value={costoGasEur}
              onChange={e => setCostoGasEur(e.target.value)} />
            <Field label="Costo empaque (€)" type="number" value={costoEmpaqueEur}
              onChange={e => setCostoEmpaqueEur(e.target.value)} />
          </div>

          {/* Resumen de costo */}
          <div style={s.costoBox}>
            <div style={s.costoLine}>
              <span>Ingredientes</span>
              <span>${costoIngredientesUsd.toFixed(4)} = €{costoIngredientesEur.toFixed(4)}</span>
            </div>
            {costoManoDeObraEur > 0 && (
              <div style={{ ...s.costoLine, color: '#7B61C4' }}>
                <span>
                  Mano de obra
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>
                    ({form.tiempoElaboracion} min × €{Number(tarifaHoraEur).toFixed(2)}/h)
                  </span>
                </span>
                <span>€{costoManoDeObraEur.toFixed(4)}</span>
              </div>
            )}
            <div style={s.costoLine}>
              <span>Gas + Empaque</span>
              <span>€{(parseFloat(costoGasEur || 0) + parseFloat(costoEmpaqueEur || 0)).toFixed(2)}</span>
            </div>
            <div style={s.costoTotal}>
              <span>Costo total</span>
              <span>€{costoTotal.toFixed(2)}</span>
            </div>
            {tasas.usd > 0 && tasas.eur > 0 && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Tasa: 1 USD = {usdToEur.toFixed(4)} EUR
              </div>
            )}
          </div>
        </div>

        {/* ── SECCIÓN C: Precio y margen ──────────────────────────────── */}
        <div style={s.section}>
          <p style={s.sectionTitle}>C — Precio de venta y margen</p>

          <div style={s.toggleRow}>
            <button style={s.toggleBtn(modoCalc === 'margen')} onClick={() => setModoCalc('margen')}>
              Quiero definir el margen %
            </button>
            <button style={s.toggleBtn(modoCalc === 'precio')} onClick={() => setModoCalc('precio')}>
              Quiero definir el precio €
            </button>
          </div>

          {modoCalc === 'margen' ? (
            <div>
              <Field label="Margen deseado (%)" type="number" value={margenInput}
                onChange={e => setMargenInput(e.target.value)} />
              <div style={{ marginTop: 8, fontSize: 14, color: '#3D2B7A', fontWeight: 600 }}>
                Precio sugerido: €{precioFinal > 0 ? precioFinal.toFixed(2) : '—'}
              </div>
            </div>
          ) : (
            <div>
              <Field label="Precio de venta (€)" type="number" value={precioInput}
                onChange={e => setPrecioInput(e.target.value)} />
              <div style={{ marginTop: 4, fontSize: 13, color: margenFinal >= 30 ? '#2D6A4F' : margenFinal >= 15 ? '#F0A500' : '#C1392B', fontWeight: 600 }}>
                Margen calculado: {margenFinal.toFixed(1)}%
              </div>
            </div>
          )}

          {/* Siempre mostrar ambos valores */}
          <div style={{ ...s.costoBox, marginTop: 4 }}>
            <div style={s.costoLine}>
              <span>Costo total</span>
              <span style={{ color: '#3D2B7A', fontWeight: 600 }}>€{costoTotal.toFixed(2)}</span>
            </div>
            <div style={s.costoLine}>
              <span>Precio de venta</span>
              <span style={{ color: '#3D2B7A', fontWeight: 600 }}>€{precioFinal > 0 ? precioFinal.toFixed(2) : '—'}</span>
            </div>
            <div style={{ ...s.costoLine, color: margenFinal >= 30 ? '#2D6A4F' : margenFinal >= 15 ? '#F0A500' : '#C1392B', fontWeight: 600 }}>
              <span>Margen</span>
              <span>{margenFinal.toFixed(1)}%</span>
            </div>
            <div style={s.margenBar}>
              <div style={s.margenFill(margenFinal)} />
            </div>
            {margenFinal < 15 && costoTotal > 0 && (
              <p style={{ fontSize: 12, color: '#C1392B', marginTop: 6 }}>
                ⚠️ Margen bajo — considera subir el precio de venta
              </p>
            )}
          </div>
        </div>

        {/* ── SECCIÓN D: Variantes ────────────────────────────────────── */}
        <div style={s.section}>
          <p style={s.sectionTitle}>D — Variantes (opcional)</p>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Útil si la misma receta se vende en distintos tamaños o presentaciones
          </p>

          {variantes.map((v, idx) => (
            <div key={idx} style={s.varianteRow}>
              <input
                style={s.ingInput}
                placeholder="Nombre variante (ej: Caja de 6)"
                value={v.nombre}
                onChange={e => setVariante(idx, 'nombre', e.target.value)}
              />
              <input
                style={{ ...s.ingInput, textAlign: 'right' }}
                type="number"
                placeholder="Precio €"
                value={v.precioEur}
                onChange={e => setVariante(idx, 'precioEur', e.target.value)}
              />
              <button style={s.btnRemove} onClick={() => removeVariante(idx)}>✕</button>
            </div>
          ))}

          <button style={s.btnAdd} onClick={addVariante}>+ Agregar variante</button>
        </div>

        <button style={pg.btnPrimary} onClick={handleSave} disabled={saving || !form.nombre}>
          {saving ? 'Guardando...' : isNew ? 'Crear receta' : 'Actualizar receta'}
        </button>
      </div>
    </div>
  )
}
