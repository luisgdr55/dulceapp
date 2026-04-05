// src/pages/RecetaDetallePage.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../stores/appStore.js'
import { recetasApi, workspacesApi } from '../services/api.js'
import { pg, Field } from './_styles.jsx'

export function RecetaDetallePage() {
  const { activeWorkspaceId } = useAppStore()
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nueva'

  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: '', porciones: 1,
    costoIngredientesUsd: 0, costoGasEur: 0, costoEmpaqueEur: 0,
    precioVentaEur: 0, notas: ''
  })
  const [tasas, setTasas] = useState({ usd: 0, eur: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeWorkspaceId) return
    workspacesApi.getTasaBCV(activeWorkspaceId).then(d => {
      setTasas({ usd: d.actualUSD?.tasa || 0, eur: d.actualEUR?.tasa || 0 })
    }).catch(() => {})
  }, [activeWorkspaceId])

  useEffect(() => {
    if (!isNew && activeWorkspaceId && id) {
      recetasApi.get(activeWorkspaceId, id)
        .then(r => setForm({
          nombre: r.nombre || '',
          descripcion: r.descripcion || '',
          categoria: r.categoria || '',
          porciones: r.porciones || 1,
          costoIngredientesUsd: r.costoIngredientesUsd || 0,
          costoGasEur: r.costoGasEur || 0,
          costoEmpaqueEur: r.costoEmpaqueEur || 0,
          precioVentaEur: r.precioVentaEur || 0,
          notas: r.notas || ''
        }))
        .catch(console.error)
    }
  }, [isNew, activeWorkspaceId, id])

  // Conversión USD → EUR para preview del formulario
  const usdToEur = (tasas.usd > 0 && tasas.eur > 0) ? tasas.usd / tasas.eur : 1
  const costoIngredientesEnEur = Number(form.costoIngredientesUsd) * usdToEur
  const costoTotal = costoIngredientesEnEur + Number(form.costoGasEur) + Number(form.costoEmpaqueEur)
  const margen = form.precioVentaEur > 0
    ? (((form.precioVentaEur - costoTotal) / form.precioVentaEur) * 100).toFixed(1)
    : 0

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew) {
        await recetasApi.create(activeWorkspaceId, form)
      } else {
        await recetasApi.update(activeWorkspaceId, id, form)
      }
      navigate('/recetario')
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={pg.page}>
      <div style={pg.header}>
        <button style={pg.btnBack} onClick={() => navigate('/recetario')}>← Volver</button>
        <h1 style={pg.title}>{isNew ? 'Nueva receta' : 'Editar receta'}</h1>
      </div>
      <div style={pg.formCard}>
        <Field label="Nombre" value={form.nombre} onChange={set('nombre')} required />
        <Field label="Categoría" value={form.categoria} onChange={set('categoria')} placeholder="Tortas, Galletas..." />
        <Field label="Descripción" value={form.descripcion} onChange={set('descripcion')} multiline />
        <div style={pg.row3}>
          <Field label="Costo ingredientes ($)" type="number" value={form.costoIngredientesUsd} onChange={set('costoIngredientesUsd')} />
          <Field label="Costo gas (€)" type="number" value={form.costoGasEur} onChange={set('costoGasEur')} />
          <Field label="Costo empaque (€)" type="number" value={form.costoEmpaqueEur} onChange={set('costoEmpaqueEur')} />
        </div>
        {tasas.usd > 0 && tasas.eur > 0 && (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Tipo de cambio: ${tasas.usd} Bs/USD · €{tasas.eur} Bs/EUR → 1 USD = {usdToEur.toFixed(4)} EUR
          </p>
        )}
        <div style={pg.costoResumen}>
          <span>Costo total: <strong>€{costoTotal.toFixed(2)}</strong>
            {tasas.usd > 0 && tasas.eur > 0 &&
              <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>
                (ingredientes ${Number(form.costoIngredientesUsd).toFixed(2)} → €{costoIngredientesEnEur.toFixed(2)})
              </span>
            }
          </span>
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
