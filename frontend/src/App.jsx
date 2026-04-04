// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './stores/appStore.js'
import { AppLayout } from './components/AppLayout.jsx'

// Páginas de auth
import { LoginPage }    from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'

// Páginas de la app
import { DashboardPage }    from './pages/DashboardPage.jsx'
import { IAPage }           from './pages/IAPage.jsx'
import { RecetarioPage }    from './pages/RecetarioPage.jsx'
import { RecetaDetallePage } from './pages/RecetaDetallePage.jsx'
import { InventarioPage }   from './pages/InventarioPage.jsx'
import { PedidosPage }      from './pages/PedidosPage.jsx'
import { NuevoPedidoPage }  from './pages/NuevoPedidoPage.jsx'
import { HistorialPage }    from './pages/HistorialPage.jsx'
import { ConfigPage }       from './pages/ConfigPage.jsx'

function RequireAuth({ children }) {
  const token = useAppStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas con layout */}
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"      element={<DashboardPage />} />
          <Route path="ia"             element={<IAPage />} />
          <Route path="recetario"      element={<RecetarioPage />} />
          <Route path="recetario/nueva" element={<RecetaDetallePage />} />
          <Route path="recetario/:id"  element={<RecetaDetallePage />} />
          <Route path="inventario"     element={<InventarioPage />} />
          <Route path="pedidos"        element={<PedidosPage />} />
          <Route path="pedidos/nuevo"  element={<NuevoPedidoPage />} />
          <Route path="historial"      element={<HistorialPage />} />
          <Route path="config"         element={<ConfigPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
