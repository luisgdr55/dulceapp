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
    <div style={authStyles.page}>
      <div style={authStyles.card}>
        <div style={authStyles.brand}>
          <span style={{ fontSize: 40 }}>🍰</span>
          <h1 style={authStyles.title}>DulceApp</h1>
          <p style={authStyles.sub}>Tu asistente de repostería</p>
        </div>
        <form onSubmit={handleSubmit} style={authStyles.form}>
          <label style={authStyles.label}>Email</label>
          <input style={authStyles.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <label style={authStyles.label}>Contraseña</label>
          <input style={authStyles.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <p style={authStyles.error}>{error}</p>}
          <button style={authStyles.btn} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
        <p style={authStyles.footer}>
          ¿No tienes cuenta? <Link to="/register" style={authStyles.link}>Regístrate</Link>
        </p>
      </div>
    </div>
  )
}

// src/pages/RegisterPage.jsx
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
    <div style={authStyles.page}>
      <div style={authStyles.card}>
        <div style={authStyles.brand}>
          <span style={{ fontSize: 40 }}>🍰</span>
          <h1 style={authStyles.title}>Crear cuenta</h1>
          <p style={authStyles.sub}>Comienza a gestionar tu repostería</p>
        </div>
        <form onSubmit={handleSubmit} style={authStyles.form}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={authStyles.label}>Nombre</label>
              <input style={authStyles.input} value={form.nombre} onChange={set('nombre')} required />
            </div>
            <div>
              <label style={authStyles.label}>Apellido</label>
              <input style={authStyles.input} value={form.apellido} onChange={set('apellido')} />
            </div>
          </div>
          <label style={authStyles.label}>Nombre de tu negocio</label>
          <input style={authStyles.input} value={form.negocio} onChange={set('negocio')} required
            placeholder="Ej: Dulces de María" />
          <label style={authStyles.label}>Ciudad</label>
          <input style={authStyles.input} value={form.ciudad} onChange={set('ciudad')} placeholder="Ej: Caracas" />
          <label style={authStyles.label}>Email</label>
          <input style={authStyles.input} type="email" value={form.email} onChange={set('email')} required />
          <label style={authStyles.label}>Contraseña (mínimo 8 caracteres)</label>
          <input style={authStyles.input} type="password" value={form.password} onChange={set('password')}
            required minLength={8} />
          {error && <p style={authStyles.error}>{error}</p>}
          <button style={authStyles.btn} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p style={authStyles.footer}>
          ¿Ya tienes cuenta? <Link to="/login" style={authStyles.link}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

const authStyles = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F7F4FF',
    padding: '1rem'
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '2rem',
    width: '100%',
    maxWidth: 420,
    border: '1px solid rgba(0,0,0,0.08)'
  },
  brand: { textAlign: 'center', marginBottom: '1.5rem' },
  title: { fontSize: 22, fontWeight: 700, color: '#3D2B7A', marginTop: 8 },
  sub: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 2 },
  input: {
    padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 14, outline: 'none', width: '100%', fontFamily: 'inherit'
  },
  error: { color: '#C1392B', fontSize: 13, background: '#fff5f5', padding: '8px 12px', borderRadius: 8 },
  btn: {
    padding: '12px', borderRadius: 10, border: 'none',
    background: '#7B61C4', color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 4
  },
  footer: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1.5rem' },
  link: { color: '#7B61C4', textDecoration: 'none', fontWeight: 500 }
}

// Stubs para las páginas restantes (se desarrollan en iteración 2)
export { RecetarioPage }   from './RecetarioPage.jsx'
export { RecetaDetallePage } from './RecetaDetallePage.jsx'
export { InventarioPage }  from './InventarioPage.jsx'
export { PedidosPage }     from './PedidosPage.jsx'
export { NuevoPedidoPage } from './NuevoPedidoPage.jsx'
export { HistorialPage }   from './HistorialPage.jsx'
export { ConfigPage }      from './ConfigPage.jsx'
