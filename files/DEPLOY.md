# DULCEAPP — Guía de despliegue en Railway

## Prerequisitos
- Cuenta en [railway.app](https://railway.app) con suscripción activa
- Git instalado localmente
- Node.js 20+ para desarrollo local

---

## Estructura del proyecto

```
dulceapp/
├── backend/    ← API REST + AI Service + Bot Telegram
└── frontend/   ← PWA React (Vite)
```

Cada carpeta se despliega como un servicio independiente en Railway.

---

## Paso 1 — Crear el proyecto en Railway

1. Ir a [railway.app/new](https://railway.app/new)
2. Click en **"Empty Project"**
3. Nombrar el proyecto: `dulceapp`

---

## Paso 2 — Base de datos PostgreSQL

1. En el proyecto Railway → **"+ Add Service"** → **"Database"** → **"PostgreSQL"**
2. Railway crea la DB y genera `DATABASE_URL` automáticamente
3. Anotar la `DATABASE_URL` — se usará en el backend

---

## Paso 3 — Desplegar el backend

### 3a. Desde GitHub (recomendado)

1. Subir el proyecto a GitHub
2. En Railway → **"+ Add Service"** → **"GitHub Repo"**
3. Seleccionar el repo → en **"Root Directory"** poner `backend`
4. Railway detecta el `Dockerfile` automáticamente

### 3b. Variables de entorno del backend

En el servicio backend → **"Variables"** tab → agregar:

```env
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}    ← referencia automática Railway
JWT_SECRET=<genera con: openssl rand -base64 64>
JWT_EXPIRES_IN=7d

OPENROUTER_API_KEY=sk-or-v1-...             ← tu key existente de OpenRouter
OPENROUTER_MODEL=google/gemini-2.0-flash-001
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

TELEGRAM_ENCRYPTION_KEY=<openssl rand -hex 32>

NODE_ENV=production
FRONTEND_URL=https://dulceapp-frontend.up.railway.app  ← URL del frontend (agregar después)

BCV_CRON_ENABLED=true
BCV_CRON_SCHEDULE=0 8 * * 1-5

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```

### 3c. Primer despliegue y migración

Railway ejecuta automáticamente:
```sh
npx prisma migrate deploy && node src/index.js
```

Verificar en logs que aparezca:
```
[DB] Conectado a PostgreSQL
[Server] DULCEAPP backend corriendo en puerto 3000
```

### 3d. Ejecutar seed (solo la primera vez)

Desde Railway → backend → **"Shell"** tab:
```sh
node prisma/seed.js
```

Esto crea el usuario demo: `demo@dulceapp.ve` / `dulceapp123`

---

## Paso 4 — Desplegar el frontend

1. En Railway → **"+ Add Service"** → **"GitHub Repo"**
2. Mismo repo, **"Root Directory"**: `frontend`
3. Variables de entorno del frontend:

```env
BACKEND_URL=https://dulceapp-backend.up.railway.app   ← URL del backend
```

4. Railway build el Dockerfile (nginx + assets estáticos)
5. Una vez desplegado, copiar la URL del frontend y actualizarla en `FRONTEND_URL` del backend

---

## Paso 5 — Configurar Telegram para un workspace

Una vez la app está corriendo:

1. En Telegram, hablar con **@BotFather**:
   ```
   /newbot
   Nombre: Dulces de María Bot
   Username: dulcesmaria_bot
   ```
   BotFather devuelve el `TOKEN`

2. Obtener tu `chatId`: hablar con **@userinfobot** → te dice tu ID

3. En la PWA → **Configuración → Conectar Telegram**:
   - Pegar el `botToken`
   - Pegar tu `chatId`
   - Click en **Conectar**

4. El bot arranca inmediatamente. Probar en Telegram:
   ```
   /start
   ¿Cómo van las ventas esta semana?
   Anotar venta de torta de chocolate, 1 unidad
   ```

---

## Paso 6 — Instalar como PWA

### En Android (Chrome)
1. Abrir la URL del frontend en Chrome
2. Menú (⋮) → **"Añadir a pantalla de inicio"**
3. La app se instala como aplicación nativa

### En iOS (Safari)
1. Abrir la URL en Safari
2. Botón compartir → **"Añadir a pantalla de inicio"**

### En desktop (Chrome/Edge)
1. Ícono de instalación en la barra de direcciones
2. Click → **"Instalar DulceApp"**

---

## Arquitectura de servicios en Railway

```
Railway Project: dulceapp
├── PostgreSQL          ← DB addon (gestionada por Railway)
├── backend             ← Node.js API + AI + Telegram bots
│   └── PORT: 3000 (internal) → URL pública Railway
└── frontend            ← nginx + React PWA build
    └── PORT: 80 (internal) → URL pública Railway
```

Costo estimado en Railway:
- Plan Hobby ($5/mes): suficiente para pruebas y uso propio
- Plan Pro ($20/mes): recomendado para producción con múltiples workspaces

---

## Variables de entorno — resumen rápido

| Variable | Dónde | Descripción |
|---|---|---|
| `DATABASE_URL` | Backend | Auto-generada por Railway PostgreSQL |
| `JWT_SECRET` | Backend | Clave aleatoria de 64 bytes |
| `OPENROUTER_API_KEY` | Backend | Tu key existente (sk-or-v1-...) |
| `TELEGRAM_ENCRYPTION_KEY` | Backend | Clave hex-32 para cifrar tokens de bots |
| `FRONTEND_URL` | Backend | URL pública del frontend (para CORS) |
| `BACKEND_URL` | Frontend | URL pública del backend (para proxy nginx) |

---

## Comandos útiles de desarrollo local

```sh
# Backend
cd backend
cp .env.example .env          # editar con tus valores
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev                   # arranca en localhost:3000

# Frontend
cd frontend
npm install
npm run dev                   # arranca en localhost:5173 (proxy → :3000)
```

---

## Agregar una nueva repostera (multi-tenancy)

1. La nueva usuaria va a la URL del frontend y se registra
2. Al registrarse crea automáticamente su propio **workspace** aislado
3. Sus datos nunca se mezclan con los de otras reposteras
4. Si quieres invitarla a tu workspace en lugar de que tenga el suyo:
   - Configuración → Miembros → Invitar por email

---

## Próximos pasos sugeridos (iteración 2)

- [ ] Implementar ConfigPage completa (tasa BCV, perfil, miembros, Telegram)
- [ ] Implementar InventarioPage con edición inline de stock
- [ ] Implementar PedidosPage con cambio de estado drag-and-drop
- [ ] Implementar RecetaDetallePage con selector de ingredientes
- [ ] Agregar carga de imagen de recetas (Railway Volume o Cloudflare R2)
- [ ] Añadir notificaciones push web (Web Push API)
- [ ] Panel de administración para ver todos los workspaces (superadmin)
- [ ] Exportar historial a PDF/Excel
