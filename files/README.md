# 🍰 DULCEAPP — PWA Multi-tenant de Gestión de Repostería

Sistema completo para gestión de negocios de repostería venezolana.  
Arquitectura multi-tenant: múltiples reposteras, datos 100% aislados.

---

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + Vite + PWA (instalable en móvil y desktop) |
| **Backend** | Node.js + Express + Prisma ORM |
| **Base de datos** | PostgreSQL (Railway addon) |
| **IA** | Gemini Flash 2.0 vía OpenRouter (tool calling real) |
| **Bot** | Telegram (grammY) — canal alternativo del mismo AI Service |
| **Hosting** | Railway (backend + frontend + DB en un solo proyecto) |
| **Auth** | JWT (jose) + bcrypt |

---

## Funcionalidades

### Gestión del negocio
- Recetario con foto, categorías, variantes de tamaño
- Calculadora de costos en tiempo real (ingredientes + gas + empaque)
- Sugerencia de precio por margen configurable
- Inventario con alertas de stock bajo automáticas
- Pedidos con estados (Pendiente → En proceso → Entregado)
- Venta rápida sin datos de cliente
- Conversión EUR ↔ Bs con tasa BCV actualizable (manual o auto-cron)
- Dashboard con métricas, gráfico de ventas y próximas entregas
- Historial y estadísticas por período

### Asistente IA "Dulce"
- Chat en lenguaje natural (español venezolano)
- Tool calling real con Gemini Flash — sin parsing frágil de JSON
- Acciones con confirmación: crear pedido, actualizar stock, venta rápida
- Acciones automáticas (lectura): análisis de rentabilidad, proyección de demanda, resumen semanal, alertas de stock
- Contexto dinámico: recetario, inventario y pedidos del workspace en tiempo real
- Mismo AI Service disponible en PWA y bot de Telegram

### Telegram
- Bot propio por workspace (cada repostera crea su @bot en BotFather)
- Comandos: /start, /resumen, /stock, /pedidos
- Mensajes libres → misma IA que la PWA
- Confirmación de acciones con botones inline
- Registro de última actividad

### Multi-tenancy
- Registro libre → workspace propio creado automáticamente
- Datos completamente aislados por `workspaceId` en cada query
- Roles: OWNER / EDITOR / VIEWER por workspace
- Invitar colaboradoras por email
- Planes: FREE / PRO / BUSINESS (listo para monetizar)

---

## Estructura

```
dulceapp/
├── DEPLOY.md              ← Guía de despliegue en Railway
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma  ← Esquema multi-tenant completo
│   │   └── seed.js        ← Datos de ejemplo venezolanos
│   ├── src/
│   │   ├── ai/
│   │   │   ├── aiService.js    ← Orquestador LLM + tool calling
│   │   │   ├── systemPrompt.js ← Prompt dinámico con contexto real
│   │   │   └── tools.js        ← 9 herramientas implementadas
│   │   ├── middleware/
│   │   │   └── auth.js         ← JWT + autorización por workspace
│   │   ├── routes/
│   │   │   ├── auth.js         ← Registro y login
│   │   │   ├── workspaces.js   ← Config, miembros, tasa BCV
│   │   │   ├── recetas.js      ← CRUD recetario
│   │   │   ├── ingredientes.js ← CRUD inventario
│   │   │   ├── pedidos.js      ← CRUD pedidos + cambio de estado
│   │   │   ├── dashboard.js    ← Métricas agregadas + historial
│   │   │   ├── ai.js           ← Chat + confirmación de acciones
│   │   │   └── telegram.js     ← Conectar/desconectar bot
│   │   ├── telegram/
│   │   │   └── bot.js          ← Bot grammY multi-workspace
│   │   ├── utils/
│   │   │   ├── prisma.js       ← Singleton Prisma
│   │   │   └── pedidoUtils.js  ← Generador de número de pedido
│   │   └── index.js            ← Servidor + init bots + cron BCV
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── App.jsx              ← Router + rutas protegidas
    │   ├── components/
    │   │   └── AppLayout.jsx    ← Nav mobile + sidebar desktop
    │   ├── pages/
    │   │   ├── LoginPage.jsx    ← Auth
    │   │   ├── DashboardPage.jsx← Métricas + gráfico + accesos rápidos
    │   │   ├── IAPage.jsx       ← Chat Dulce IA + confirmación de acciones
    │   │   ├── RecetarioPage.jsx← Lista + CRUD recetas
    │   │   ├── InventarioPage.jsx
    │   │   ├── PedidosPage.jsx
    │   │   └── ConfigPage.jsx
    │   ├── services/
    │   │   └── api.js           ← Cliente HTTP + helpers por dominio
    │   └── stores/
    │       └── appStore.js      ← Zustand (auth + workspace + cache)
    ├── index.html
    ├── vite.config.js           ← PWA manifest + workbox cache
    ├── nginx.conf               ← Proxy API + SPA fallback
    ├── Dockerfile
    └── package.json
```

---

## Despliegue

Ver [DEPLOY.md](./DEPLOY.md) para instrucciones paso a paso en Railway.

## Credenciales demo (después del seed)

```
Email:    demo@dulceapp.ve
Password: dulceapp123
```
