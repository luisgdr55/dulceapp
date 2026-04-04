// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore.js'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAppStore(s => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.brand}>
          <span style={{ fontSize: 40 }}>🍰</span>
          <h1 style={s.title}>DulceApp</h1>
          <p style={s.sub}>Tu asistente de repostería</p>
        </div>
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <label style={s.label}>Contraseña</label>
          <input style={s.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <p style={s.error}>{error}</p>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
        <p style={s.footer}>
          ¿No tienes cuenta? <Link to="/register" style={s.link}>Regístrate</Link>
        </p>
      </div>
    </div>
  )
}

export const s = {
  page: { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F4FF', padding: '1rem' },
  card: { background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 420, border: '1px solid rgba(0,0,0,0.08)' },
  brand: { textAlign: 'center', marginBottom: '1.5rem' },
  title: { fontSize: 22, fontWeight: 700, color: '#3D2B7A', marginTop: 8 },
  sub:   { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form:  { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 2 },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'inherit' },
  error: { color: '#C1392B', fontSize: 13, background: '#fff5f5', padding: '8px 12px', borderRadius: 8 },
  btn:   { padding: '12px', borderRadius: 10, border: 'none', background: '#7B61C4', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  footer: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1.5rem' },
  link:   { color: '#7B61C4', textDecoration: 'none', fontWeight: 500 }
}
