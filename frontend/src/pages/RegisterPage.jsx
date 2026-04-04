// src/pages/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore.js'
import { s } from './LoginPage.jsx'

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellido: '', negocio: '', ciudad: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAppStore(s => s.register)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.brand}>
          <span style={{ fontSize: 40 }}>🍰</span>
          <h1 style={s.title}>Crear cuenta</h1>
          <p style={s.sub}>Comienza a gestionar tu repostería</p>
        </div>
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={s.label}>Nombre</label>
              <input style={s.input} value={form.nombre} onChange={set('nombre')} required />
            </div>
            <div>
              <label style={s.label}>Apellido</label>
              <input style={s.input} value={form.apellido} onChange={set('apellido')} />
            </div>
          </div>
          <label style={s.label}>Nombre de tu negocio</label>
          <input style={s.input} value={form.negocio} onChange={set('negocio')} required placeholder="Ej: Dulces de María" />
          <label style={s.label}>Ciudad</label>
          <input style={s.input} value={form.ciudad} onChange={set('ciudad')} placeholder="Ej: Caracas" />
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={form.email} onChange={set('email')} required />
          <label style={s.label}>Contraseña (mínimo 8 caracteres)</label>
          <input style={s.input} type="password" value={form.password} onChange={set('password')} required minLength={8} />
          {error && <p style={s.error}>{error}</p>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p style={s.footer}>
          ¿Ya tienes cuenta? <Link to="/login" style={s.link}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
