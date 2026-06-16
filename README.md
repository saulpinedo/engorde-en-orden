# Engorde en Orden — Frontend

Sistema de gestión avícola (engorde de pollos) — Angular 21 SPA con Firebase.

## Stack

- **Angular 21.1** (standalone components, signals, `@angular/build:application`)
- **Firebase**: Auth (email/password) + Firestore (NoSQL) + SDK modular nativo
- **FullCalendar 6.1.20** (timeline de lote)
- **PrimeNG 21** + **Chart.js 4** + **date-fns 4**
- **Despliegue**: Cloudflare Pages (estático)

## Setup local

```bash
npm install
```

### Configurar Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar **Authentication → Email/Password**
3. Crear base de datos **Firestore** (modo producción, región `nam5` o cercana)
4. Copiar el web config del proyecto (Project settings → General → Your apps → Config)
5. Editar `src/environments/environment.ts` y `src/environments/environment.prod.ts`,
   reemplazar el placeholder `firebase: { ... }` con los valores reales.
6. Crear el primer usuario en Firebase Auth (Authentication → Users → Add user).
7. Publicar las reglas de seguridad de `firestore.rules` desde la consola
   de Firebase (Firestore → Rules).

```bash
ng serve     # dev en http://localhost:4200
ng build     # build de producción → dist/engorde-en-orden-frontend/browser/
```

## Modelo de datos (Firestore)

22 colecciones top-level (sin sub-colecciones para mantener queries simples
y debug fácil en la consola de Firebase).

| Colección | Notas |
|---|---|
| `granjas`, `galpones`, `lotes` | Jerarquía física + operativa. `lotes` denormaliza `galponNombre` y `granjaNombre` |
| `vacunas`, `antibioticosCatalogo`, `vitaminasCatalogo`, `desinfectantesCatalogo`, `insumos` | Catálogos |
| `clientes` | Con búsqueda prefijo |
| `fasesAlimento` | F0–F3 |
| `mortalidades`, `consumoDiario`, `pesajes`, `hitos` | Registros diarios por lote |
| `vacunasAplicadas`, `antibioticosAplicados`, `vitaminasAplicadas`, `desinfectantesAplicados` | Aplicaciones por lote |
| `ventas` | Denormaliza `clienteNombre` y `loteNombre` |
| `detallePesadas`, `pagos` | Hijos de venta; `ventas.totalKg`/`totalBs`/`estado` se recalculan con `runTransaction` |
| `formulas`, `ingredientes`, `formulaDetalles` | Recetas |

Convención: **camelCase en Firestore y en el frontend**.

## Triggers reemplazados (PL/pgSQL → transacciones cliente)

Los 2 triggers de la base Postgres original se reemplazan con
`runTransaction` de Firestore en `lot.service.ts`:

- `actualizar_estado_venta` → `createPago` y `deletePago` recalculan
  `ventas/{id}.estado` (PENDIENTE/PARCIAL/CANCELADO).
- `actualizar_totales_venta` → `addPesada`, `updatePesada`, `removePesada`
  recalculan `ventas/{id}.totalKg` y `totalBs`.

Bug conocido del RPC `get_cantidad_actual` (que no se ejecutaba con
`await` en la versión Supabase) se reemplaza por una transacción que
suma mortalidades y actualiza `lotes/{id}.cantidadActual` en
`createMortalidad` y `deleteMortalidad`.

## Reglas de seguridad

`firestore.rules`:

```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

Sistema compartido: cualquier usuario autenticado puede CRUD libre.
No hay multi-tenant.

## Despliegue en Cloudflare Pages

### Opción rápida (sin GitHub Actions)

1. En Cloudflare Pages → **Create a project** → **Connect to Git** → seleccionar repo
2. **Build command**: `npm run build`
3. **Build output directory**: `dist/engorde-en-orden-frontend/browser`
4. **Root directory**: `/` (raíz del repo)
5. **Environment variables**: `NODE_VERSION=20`
6. **Save and Deploy**

Cloudflare hace auto-deploy en cada push a la rama principal.

### Con GitHub Actions (opcional)

Crear `.github/workflows/deploy.yml` con `cloudflare/pages-action@v1`,
configurar secrets `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.

## Verificación end-to-end

1. **Auth**: `ng serve` → `/dashboard` redirige a `/auth/login` → login OK → dashboard.
2. **CRUD**: Crear/editar/eliminar en cada feature; los datos persisten en Firestore.
3. **Sincronización multi-usuario**: Abrir dos pestañas/dispositivos
   con la misma sesión; ambas reflejan cambios en tiempo (casi) real
   al refrescar.
4. **Bug del RPC corregido**: Crear lote con `cantidadInicial=100`,
   registrar mortalidades 5+3+2 → `cantidadActual=90`.
5. **Triggers de venta**: Crear venta con `precioKg=10`, agregar 2
   `detallePesadas` de 50kg → `totalKg=100`, `totalBs=1000`. Agregar
   pago de 400 → `estado=PARCIAL`. Pago de 600 → `estado=CANCELADO`.
6. **Deploy**: Push → Cloudflare Pages construye → `*.pages.dev`
   funciona → login contra Firebase en producción → CRUD contra
   Firestore en producción.

## Estructura

```
src/
├── environments/                  # environment.ts y environment.prod.ts (Firebase config)
├── app/
│   ├── app.config.ts              # provideAppInitializer espera a Firebase Auth
│   ├── app.routes.ts              # 18 rutas con authGuard
│   ├── core/
│   │   ├── guards/auth.guard.ts
│   │   └── services/
│   │       ├── firebase.service.ts        # initializeApp + getAuth + getFirestore
│   │       ├── firestore.service.ts       # wrapper CRUD + runTransaction + observe
│   │       ├── auth.service.ts            # Firebase Auth (mantiene API anterior)
│   │       ├── lot.service.ts             # CRUD de las 22 entidades + transacciones
│   │       ├── notification.service.ts
│   │       ├── refresh.service.ts
│   │       └── layout.service.ts
│   ├── layouts/main-layout/       # sidebar + topbar
│   └── features/                  # 18 feature components standalone
└── styles.scss
```

## Historial de migración

- 2026-06-15: Migración de Supabase → Firebase. Reemplazo de `supabase-js`
  por `firebase` v11. Modelos en camelCase. Triggers de venta migrados
  a `runTransaction`. Auth reescrito con `onAuthStateChange` + `signInWithEmailAndPassword`.
  Deploy movido de Vercel a Cloudflare Pages.
