# Plan de implementación — Wilist Mobile (iOS + Android)

> **Stack elegido:** Expo (React Native + EAS) sobre el backend Hono existente.
> **Reutilización:** API + tipos + schemas Zod del repo actual. **UI se reescribe nativa** (no Capacitor).
> **Deep links:** habilitados desde V1.
> **Cuentas store:** ya disponibles (Apple Developer + Google Play).
> **Objetivo:** paridad funcional al 100% con la web.

---

## 0. Resumen ejecutivo

La web actual expone ~50 endpoints REST en Hono, 12 rutas, 13 tipos de logros, sistema de roles (owner / challenger / collaborator), monetización con Stripe Connect, mapas con Leaflet, i18n ES/EN y notificaciones in-app. La app móvil debe consumir exactamente los mismos endpoints y reproducir cada feature con UI nativa.

**Trabajo estimado** (a tiempo completo, 1 dev):
- Fase 1 (setup + auth): 2–3 días
- Fase 2 (CRUD listas/items): 4–5 días
- Fase 3 (social: explore, feed, perfiles, follow): 3–4 días
- Fase 4 (colaboración + notificaciones + rating + logros): 3–4 días
- Fase 5 (Stripe + mapas + deep links): 3–4 días
- Fase 6 (polish + i18n + accesibilidad + dark mode): 2–3 días
- Fase 7 (build + TestFlight + Play Internal): 2–3 días

**Total estimado: 19–26 días de trabajo efectivo.**

---

## 1. Decisiones técnicas

| Área | Elección | Motivo |
|---|---|---|
| Framework | **Expo SDK 53** (managed) + React Native 0.76 (new arch) | Build con EAS, sin tocar Xcode/Android Studio salvo casos puntuales |
| Lenguaje | TypeScript estricto | Mismo nivel que la web |
| Router | **Expo Router v4** (file-based) | Equivalente a TanStack Router, soporta deep links nativos out-of-the-box |
| Data fetching | **TanStack Query v5** | Misma API que la web; reutilizamos hooks (adaptados) |
| Cliente HTTP | `fetch` nativo + wrapper | Compatible con el `apiClient` actual; sesión por cookie de Auth.js NO funciona en RN → migramos a **JWT en header `Authorization: Bearer`** |
| Auth | **Expo AuthSession + Google Sign-In nativo** + **Sign in with Apple** | Apple exige SIWA si hay Google; ambos retornan id_token → backend lo valida y emite JWT propio |
| Almacén de sesión | `expo-secure-store` (Keychain / Keystore) | Tokens nunca en AsyncStorage |
| Estado UI | TanStack Query + Zustand (si hace falta) | No usar Redux |
| Estilos | **NativeWind v4** (Tailwind para RN) | Reutilizamos el sistema B/N de la web; clases `bg-canvas`, `text-gray-900`, etc. |
| Iconos | `lucide-react-native` | Mismo set que la web |
| i18n | `i18next` + `react-i18next` + `expo-localization` | Reutilizamos `src/i18n/locales/{es,en}.ts` |
| Mapas | `react-native-maps` (Apple Maps / Google Maps) | No usar Leaflet en RN; Apple Maps gratis, Google Maps requiere API key |
| Drag & drop | `react-native-draggable-flatlist` | Para reorder de items |
| Notificaciones in-app | TanStack Query polling + toast (`sonner-native`) | Igual que la web |
| Push (futuro, no V1) | `expo-notifications` + EAS Push | Stub preparado pero deshabilitado |
| Deep links | Expo Router universal links (Apple App Site Association + Android assetlinks.json) | `wilist.io/lists/{slug}` abre la app si está instalada |
| Stripe checkout | **WebView in-app (`expo-web-browser`)** | Stripe Checkout web; al volver redirige por deep link. RN nativo solo es necesario si pedimos pagos in-app — y la lógica actual usa Connect Express |
| Tests | Vitest + RN Testing Library | Coverage de hooks y servicios; UI manual en sims |
| CI / build | **EAS Build + EAS Submit** | iOS .ipa + Android .aab |
| OTA updates | EAS Update | Hotfixes sin pasar por review |

### Restricciones críticas del backend que afectan al móvil

1. **Auth actual = cookie JWT vía `@hono/auth-js`.** En móvil no podemos depender de cookies de tercera parte ni del flujo OAuth web completo. **→ Trabajo en backend (Fase 1):** añadir endpoint `POST /api/auth/mobile/exchange` que reciba `{ provider: "google" | "apple", idToken }`, valide el token contra el provider, cree/actualice el usuario y devuelva un JWT firmado consumible vía `Authorization: Bearer <token>`. El middleware existente debe aceptar ambos esquemas (cookie y Bearer).

2. **Stripe Connect onboarding** devuelve una URL externa. La abrimos con `expo-web-browser` y volvemos por deep link `wilist://stripe/return`.

3. **Webhook de Stripe** no cambia (lo recibe Vercel desde Stripe).

4. **`api/auth/callback/google`** sigue funcionando para web; la mobile va por el endpoint nuevo.

---

## 2. Estructura del monorepo

`apps/mobile/` está vacío. Lo convertimos en proyecto Expo independiente sin romper el deploy de la web (Vercel apunta a la raíz; añadiremos `apps/mobile/` a `.vercelignore`).

```
wilist-io/
├── api/                          # Hono backend (sin cambios estructurales)
├── src/                          # Frontend web (sin cambios)
├── apps/
│   └── mobile/
│       ├── app.json              # Expo config (bundleId, scheme, deep links)
│       ├── eas.json              # EAS profiles (dev, preview, prod)
│       ├── package.json          # Dependencias mobile aisladas
│       ├── tsconfig.json
│       ├── babel.config.js       # NativeWind preset
│       ├── metro.config.js       # Resolver para shared/
│       ├── tailwind.config.js    # Mismo tema que la web
│       ├── app/                  # Expo Router (rutas)
│       │   ├── _layout.tsx
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx
│       │   │   ├── index.tsx        # Home
│       │   │   ├── explore.tsx
│       │   │   ├── lists.tsx        # My lists
│       │   │   ├── feed.tsx
│       │   │   └── profile.tsx
│       │   ├── lists/
│       │   │   └── [listId].tsx     # Detail + slug
│       │   ├── explore/
│       │   │   └── [listId].tsx
│       │   ├── u/
│       │   │   └── [userId].tsx
│       │   ├── users.tsx
│       │   ├── settings.tsx
│       │   ├── notifications.tsx
│       │   └── auth/
│       │       ├── sign-in.tsx
│       │       └── callback.tsx
│       ├── src/
│       │   ├── api/              # apiClient + JWT mgmt
│       │   ├── hooks/            # Adaptados desde src/hooks/ web
│       │   ├── services/         # Adaptados desde src/services/ web
│       │   ├── components/       # Componentes RN nativos
│       │   ├── lib/
│       │   ├── i18n/             # Re-export de src/i18n web
│       │   └── theme/            # Tokens (bg-canvas, etc.)
│       └── assets/
│           ├── icon.png
│           ├── splash.png
│           └── adaptive-icon.png
├── shared/                       # NUEVO — código común web/mobile
│   ├── types.ts                  # Tipos de dominio (List, Item, User, etc.)
│   ├── zod-schemas.ts            # Schemas de validación reutilizables
│   ├── achievements.ts           # Lógica de logros (puro)
│   └── categories.ts             # 22 categorías
└── .vercelignore                 # Añadir apps/mobile/ y shared/* si no se importa en web
```

**Nota:** `shared/` se importa tanto desde `api/` como desde `apps/mobile/src/`. El web actual ya tiene parte de esto duplicado en `src/lib/`; lo movemos progresivamente, **sin romper la web**.

---

## 3. Fases

Cada fase termina con un build instalable en simulador. **No avanzamos a la siguiente sin completar la actual.**

---

### Fase 1 — Setup, auth y skeleton

**Objetivo:** abrir la app, iniciar sesión con Google/Apple, ver pantalla vacía con el usuario.

#### Backend
- [ ] Crear `POST /api/auth/mobile/exchange` (recibe `{ provider, idToken }`, valida, retorna `{ token, user }`).
- [ ] Adaptar middleware de auth en `api/app.ts` para aceptar `Authorization: Bearer <jwt>` además de cookies.
- [ ] Test del nuevo endpoint en `api/auth.mobile.test.ts`.

#### Mobile setup
- [ ] `cd apps/mobile && npx create-expo-app@latest . --template blank-typescript`
- [ ] Instalar: `expo-router`, `expo-secure-store`, `expo-auth-session`, `expo-apple-authentication`, `expo-web-browser`, `expo-linking`, `@react-native-google-signin/google-signin`, `@tanstack/react-query`, `nativewind`, `tailwindcss@^4`, `lucide-react-native`, `react-native-safe-area-context`, `react-native-screens`, `expo-localization`, `i18next`, `react-i18next`, `zod`.
- [ ] Configurar `app.json`:
  - `scheme: "wilist"`
  - `ios.bundleIdentifier: "io.wilist.app"`
  - `android.package: "io.wilist.app"`
  - `ios.associatedDomains: ["applinks:wilist.io"]`
  - `android.intentFilters` para `https://wilist.io/lists/*`, `/u/*`, `/explore/*`
- [ ] Configurar NativeWind + `tailwind.config.js` con tokens del web (`bg-canvas`, etc.).
- [ ] `eas.json` con perfiles `development`, `preview`, `production`.
- [ ] Configurar EAS: `eas login`, `eas init`.

#### Auth
- [ ] Pantalla `app/auth/sign-in.tsx` con dos botones: "Continuar con Google", "Continuar con Apple".
- [ ] Implementar `signInWithGoogle()` → obtiene `idToken` con `@react-native-google-signin/google-signin` → llama `POST /api/auth/mobile/exchange`.
- [ ] Implementar `signInWithApple()` → idem con `expo-apple-authentication`.
- [ ] Guardar JWT en `expo-secure-store` (key: `wilist.session`).
- [ ] Wrapper `apiClient` que añade `Authorization: Bearer <jwt>` desde secure-store.
- [ ] Hook `useSession()` (lee JWT, decodifica, retorna user).
- [ ] Hook `useSignOut()` (borra token, invalida queries).
- [ ] Hosting de Apple App Site Association en `wilist.io/.well-known/apple-app-site-association` y `assetlinks.json` (configurar en `vercel.json` o `public/`).

#### Criterios de éxito
- Build dev se abre en simulador iOS y emulador Android.
- Sign-in con Google y Apple funciona end-to-end.
- JWT se persiste y sobrevive al cierre de la app.
- `GET /api/me` con Bearer responde correctamente.

---

### Fase 2 — Core CRUD: listas e items

**Objetivo:** un usuario puede crear, ver, editar y eliminar sus listas e items. Replicar la experiencia de `MyListsPage` y `ListDetailPage`.

#### Servicios y hooks (portar desde web)
- [ ] `services/lists.service.ts` — create, get, update, list (my-lists), delete, clone.
- [ ] `services/items.service.ts` — list, add, toggle, update, delete, bulkAdd, bulkDelete, reorder.
- [ ] Hooks correspondientes con TanStack Query + optimistic updates **idénticos al patrón web**:
  - `useList`, `useCreateList`, `useUpdateName/Description/Category/Slug`, `useTogglePublic/Collaborative`, `useCloneList`, `useDeleteList`, `useMyLists` (infinite).
  - `useItems`, `useAddItem`, `useToggleItem` (optimistic crítico), `useUpdateItem`, `useDeleteItem`, `useBulkAddItems`, `useBulkDeleteItems`, `useReorderItems`.

#### Pantallas
- [ ] `app/(tabs)/index.tsx` — Home con input "crear lista" y CTA destacado.
- [ ] `app/(tabs)/lists.tsx` — My lists con FlatList paginado (cursor), buscador, filtros (público/privado, sort).
- [ ] `app/lists/[listId].tsx` — Detalle de lista:
  - Header con nombre, descripción, categoría, badges (público/colaborativo).
  - Tabs: Items, Settings (si owner).
  - Lista de items con `DraggableFlatList` (drag handle a la derecha, checkbox a la izquierda).
  - FAB para añadir item.
  - Modal de bulk paste (multi-línea, preview, confirm).
  - Pull to refresh.
- [ ] Modal de settings (slug, description, category combobox, switches público/colaborativo).
- [ ] Confirm dialog para delete (lista e items).

#### Detalles
- [ ] Filtro de items (all / pending / done) como segmented control.
- [ ] Bottom sheet para acciones de item (edit, delete, geolocalizar).
- [ ] Long-press en item → menú nativo.
- [ ] Skeleton de loading consistente con web.

#### Criterios de éxito
- Crear lista → aparece en my-lists sin refrescar.
- Toggle item es instantáneo (optimistic), revierte si falla.
- Reorder por drag persiste tras refresh.
- Bulk paste de 50 items funciona.
- Eliminar lista pide confirmación y vuelve a my-lists.

---

### Fase 3 — Social: explore, feed, perfiles, follow

**Objetivo:** descubrimiento de listas y usuarios. Aceptar desafíos públicos.

#### Servicios
- [ ] Adaptar `lists.service.ts` con: `explore`, `exploreDetail`, `exploreItems`, `feed`, `acceptChallenge`, `participation`, `activeParticipants`.
- [ ] `usersService` con: `get`, `directory`, `search`, `followStatus`, `follow`, `unfollow`.
- [ ] Hooks: `useExplore` (infinite + filtros), `useFeed`, `useUserProfile`, `useUserDirectory`, `useUserSearch`, `useFollowStatus`, `useToggleFollow`, `useAcceptChallenge`.

#### Pantallas
- [ ] `app/(tabs)/explore.tsx`:
  - Buscador full-width al top (como en web).
  - Chips horizontales scrollables con las 22 categorías.
  - Toggle de sort (trending / recent).
  - Grid o lista de cards con: nombre, owner avatar, contador items/participantes, rating, preview de 3 items, botón "aceptar desafío".
- [ ] `app/explore/[listId].tsx` — vista detalle de lista pública: header, owner, participantes, items preview, botón "aceptar" o "ver mi progreso".
- [ ] `app/(tabs)/feed.tsx` — Feed de listas públicas de usuarios seguidos (vacío si no sigues a nadie → CTA a `/users`).
- [ ] `app/users.tsx` — Directorio paginado con search, cards de usuario (avatar, nombre, stats: listas, desafíos, logros, followers).
- [ ] `app/u/[userId].tsx` — Perfil público:
  - Avatar grande, nombre, botón follow/unfollow, contadores.
  - Tabs: Listas públicas, Logros (con progreso), Stats.
- [ ] `app/(tabs)/profile.tsx` — Mi perfil (atajo a `/u/{miId}` + acceso rápido a settings, logout).

#### Detalles
- [ ] El botón "aceptar desafío" navega a `/lists/[listId]` post-aceptación.
- [ ] Si la lista es `collaborative`, auto-join se dispara en el GET (igual que web — no requiere UI extra).
- [ ] Mostrar diferencia visual entre rol "challenger" (progreso personal) y "collaborator" (estado compartido).

#### Criterios de éxito
- Explore carga 6 listas y pagina al final del scroll.
- Aceptar desafío → aparece en my-lists.
- Follow/unfollow es instantáneo y se refleja en perfil.

---

### Fase 4 — Colaboración, notificaciones, rating, logros, racha

**Objetivo:** ciclo social completo. Notificaciones, valoraciones, métricas personales.

#### Servicios
- [ ] `notificationsService` (list, markAsRead, markAllAsRead).
- [ ] `collaboratorsService` (list, add, remove).
- [ ] `ratingService` (rate, unrate).
- [ ] `streakService` (get).
- [ ] `achievementsService` (get).
- [ ] `activityService` (get).
- [ ] Hooks correspondientes.

#### Pantallas
- [ ] `app/notifications.tsx` — Lista de notificaciones (FlatList) con:
  - Badge no leídas en el tab bar (icono campana).
  - Pull to refresh.
  - Tap → navega a `actionUrl`.
  - "Marcar todas como leídas" en header.
  - Cinco tipos visuales: challenge_accepted, challenge_completed, new_follower, list_purchased, added_as_collaborator.
- [ ] En `app/lists/[listId].tsx` añadir:
  - Sección "Colaboradores" (avatar group, tap → manager).
  - Modal de gestión de colaboradores (search usuarios, add, remove).
  - Sección "Actividad" (timeline para owner).
  - Star rating component (1–5) visible para todos, editable para no-owner.
- [ ] En perfil: badges de logros desbloqueados + progreso hacia próximos.
- [ ] En home/perfil: indicador de racha (`useStreak`).

#### Detalles
- [ ] Polling de notificaciones cada 30s en foreground (TanStack Query `refetchInterval`).
- [ ] Confetti al completar un desafío (paquete `react-native-confetti-cannon`).
- [ ] Vibración háptica (`expo-haptics`) en toggle de items.

#### Criterios de éxito
- Al recibir notif (otra cuenta acepta tu lista), aparece en < 30s.
- Star rating actualiza el agregado al instante.
- Logros se desbloquean tras cumplir condición (verificar con `first_list_created`).

---

### Fase 5 — Stripe, mapas, deep links, búsqueda global

**Objetivo:** monetización funcional y descubrimiento profundo.

#### Stripe
- [ ] Settings → "Conectar cuenta Stripe" → llama `POST /api/stripe/connect` → abre URL con `expo-web-browser` → al cerrar, refresca `GET /api/stripe/account-status`.
- [ ] En `ListSettingsPanel` (owner): campo "Precio" + botones set/remove (requiere Stripe conectado).
- [ ] En `app/explore/[listId].tsx`: si la lista tiene precio y el user no la ha comprado → CTA "Comprar por $X" → `POST /api/lists/:listId/checkout` → abre Stripe Checkout en WebView → return URL deep link `wilist://stripe/return?listId=...`.
- [ ] Hook `usePurchaseStatus(listId)` para condicionar el CTA.

#### Mapas
- [ ] Migrar `ListMap` web (Leaflet) → `react-native-maps` (Apple Maps iOS, Google Maps Android).
- [ ] Configurar API key de Google Maps en `app.json` (`android.config.googleMaps.apiKey`).
- [ ] En `ItemRow`: botón "geolocalizar" → modal con buscador de lugares (`geocoding.service.ts`) → tap selecciona coords.
- [ ] En lista detail: tab "Mapa" con markers de items con coords.

#### Deep links
- [ ] Validar que `wilist.io/lists/{slug}` abre la app si está instalada (Universal Links iOS + App Links Android).
- [ ] Configurar handler en `app/_layout.tsx` para procesar deep links pendientes al arrancar.
- [ ] Crear página fallback web que muestre "Abrir en la app" si la app está instalada (smart banner).

#### Búsqueda global
- [ ] Command palette nativo (modal full-screen accesible desde nav bar o gesture):
  - Buscador unificado: listas mías, usuarios, listas públicas.
  - Atajos: "Crear lista", "Ir a settings", "Logout".

#### Criterios de éxito
- Compra completa de una lista de prueba ($1) en Stripe test mode.
- Mapa renderiza con > 5 markers sin lag.
- Click en `wilist.io/lists/abc` desde Safari/Chrome abre la app.

---

### Fase 6 — Polish: i18n, dark mode, accesibilidad, errores

**Objetivo:** calidad de producción.

- [ ] i18n: copiar `src/i18n/locales/{es,en}.ts` o referenciarlos desde `shared/`. `expo-localization` detecta idioma del SO + override manual en settings.
- [ ] Dark mode automático (`useColorScheme`) + override en settings. Validar que todas las pantallas tienen variantes `dark:` apropiadas.
- [ ] Accesibilidad: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` en interactivos. Tests con VoiceOver y TalkBack.
- [ ] Estados vacíos: ilustración + CTA en my-lists vacía, feed vacío, notifications vacías.
- [ ] Manejo de errores: error boundary global, retry en network errors, mensajes claros (sin stack traces).
- [ ] Splash screen + icono adaptativo Android (`adaptive-icon.png`).
- [ ] Loading states: skeleton consistente, sin spinners genéricos.
- [ ] Telemetría opcional (`@sentry/react-native`) — opcional, decisión separada.

---

### Fase 7 — Build y publicación

#### iOS — TestFlight
- [ ] `eas build --platform ios --profile production` → genera `.ipa`.
- [ ] `eas submit --platform ios` → sube a App Store Connect.
- [ ] Configurar metadata: nombre, descripción ES/EN, screenshots (6.7", 6.5", 5.5"), keywords, política privacidad.
- [ ] Submit a TestFlight, añadir a beta testers.
- [ ] Después: submit a App Store review.

#### Android — Internal Testing
- [ ] `eas build --platform android --profile production` → genera `.aab`.
- [ ] `eas submit --platform android` → sube a Play Console.
- [ ] Crear track "Internal testing" con testers.
- [ ] Configurar Data Safety form, content rating, store listing ES/EN.
- [ ] Después: promote a Closed / Open / Production.

#### OTA
- [ ] Configurar EAS Update para hotfixes JS-only sin rebuild.

---

## 4. Cambios necesarios en el repo web (resumen)

| Cambio | Fase | Archivo |
|---|---|---|
| Endpoint `POST /api/auth/mobile/exchange` | 1 | `api/auth.mobile.ts` (nuevo) |
| Middleware acepta `Authorization: Bearer` | 1 | `api/app.ts` |
| Carpeta `shared/` con tipos comunes | 1 | `shared/*.ts` (nuevo) |
| `apple-app-site-association` + `assetlinks.json` | 1 | `public/.well-known/` |
| `apps/mobile/` añadido a `.vercelignore` | 1 | `.vercelignore` |
| Smart banner "Abrir en app" | 5 | `index.html` o componente |

**Garantía:** ningún cambio rompe la web. Todos los endpoints existentes mantienen comportamiento; el nuevo es additivo.

---

## 5. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Apple rechaza por usar Stripe checkout para bienes digitales | **Alta** | Las listas son "user-generated content" — clasificar como tal en App Store Connect. Si rechazan, alternativa: ocultar checkout en iOS (compliance grey area conocida) o integrar IAP nativo (cambio mayor). |
| Google Sign-In nativo requiere SHA-1 del keystore distinto en dev/prod | Media | Documentar ambos en Google Cloud Console desde Fase 1. |
| Deep links no funcionan en iOS por AASA mal hosteado | Media | Validar con `curl https://wilist.io/.well-known/apple-app-site-association` (Content-Type debe ser `application/json`, sin `.json` en URL). |
| NativeWind v4 + Tailwind v4 son recientes; bugs posibles | Media | Pin de versiones, fallback a NativeWind v2 si bloquea. |
| Reorder con drag-drop laggy con > 100 items | Baja | Virtualización con `FlashList` si hace falta. |
| Optimistic updates divergen del backend en redes lentas | Media | Tests específicos. Ya funciona en web, replicar patrón. |
| El JWT propio sin refresh token expira y desloguea | Media | TTL largo (30 días) + sliding window: cada request renueva si quedan < 7 días. |

---

## 6. Checklist de paridad funcional

Cuando todas estas casillas estén marcadas, V1 está completo:

### Auth
- [ ] Sign in con Google
- [ ] Sign in con Apple
- [ ] Sign out
- [ ] Sesión persistente entre cierres de app

### Listas
- [ ] Crear lista
- [ ] Ver mis listas (paginado, búsqueda, filtros)
- [ ] Ver detalle de lista (UUID y slug)
- [ ] Editar nombre, descripción, categoría, slug
- [ ] Toggle público / privado
- [ ] Toggle colaborativa
- [ ] Eliminar lista (owner) / abandonar (participant)
- [ ] Clonar lista

### Items
- [ ] Añadir item simple
- [ ] Bulk add (paste multi-línea, preview)
- [ ] Toggle done (con optimistic + revert)
- [ ] Editar texto
- [ ] Geolocalizar item (search + coords)
- [ ] Eliminar item / bulk delete
- [ ] Reordenar por drag

### Participación
- [ ] Aceptar desafío público
- [ ] Auto-join en listas colaborativas
- [ ] Ver progreso personal vs compartido según rol
- [ ] Completar desafío → notif al owner + confetti

### Explore & Feed
- [ ] Explore con búsqueda, sort (trending/recent), categorías
- [ ] Detalle de lista pública
- [ ] Feed personalizado de seguidos

### Social
- [ ] Directorio de usuarios
- [ ] Perfil público de usuario
- [ ] Follow / unfollow
- [ ] Logros con progreso
- [ ] Racha diaria

### Colaboración
- [ ] Invitar colaboradores (search)
- [ ] Remover colaboradores
- [ ] Activity log (owner)
- [ ] Participantes activos visible

### Rating
- [ ] Valorar lista (1–5)
- [ ] Eliminar voto
- [ ] Ver agregado (avg + count)

### Notificaciones in-app
- [ ] Lista de notifs
- [ ] Marcar leída / todas leídas
- [ ] Badge en tab bar
- [ ] Polling cada 30s

### Monetización
- [ ] Conectar Stripe Connect (vendedor)
- [ ] Fijar / quitar precio (owner)
- [ ] Comprar lista (buyer) vía WebView
- [ ] Acceso desbloqueado tras compra

### Mapas
- [ ] Ver items con coords en mapa nativo
- [ ] Geocoding search

### Settings
- [ ] Toggle perfil público
- [ ] Toggle email opt-in
- [ ] Estado Stripe
- [ ] Cambiar idioma (ES / EN)
- [ ] Toggle dark mode

### Deep links
- [ ] `wilist.io/lists/{id|slug}` → app
- [ ] `wilist.io/u/{userId}` → app
- [ ] `wilist.io/explore/{id|slug}` → app
- [ ] `wilist://stripe/return` para retorno de checkout

### i18n
- [ ] ES + EN completos
- [ ] Detección automática + override manual

### Build & publicación
- [ ] Build iOS production firmado
- [ ] Build Android production firmado
- [ ] TestFlight con 1+ tester
- [ ] Play Internal con 1+ tester

---

## 7. Lo que NO entra en V1

Cosas que el web tampoco tiene o que añaden alcance sin valor crítico:

- ❌ Push notifications (web no tiene VAPID configurado; pendiente decisión).
- ❌ Modo offline / sync diferido.
- ❌ Editor de listas colaborativo en tiempo real (sin WebSockets en backend).
- ❌ Subida de imágenes / portadas custom.
- ❌ Compartir lista vía sistema nativo (Share Sheet) — fácil en V1.1.
- ❌ Widgets iOS/Android.
- ❌ Apple Watch / Wear OS.

---

## 8. Próximos pasos inmediatos

1. **Validar este plan** y ajustar fases / scope.
2. Crear el endpoint backend `POST /api/auth/mobile/exchange` y el middleware Bearer (~½ día).
3. Inicializar `apps/mobile/` con Expo + dependencias (~½ día).
4. Sign-in funcional con Google y Apple (~1 día).
5. **Demo en simulador con auth completa.** A partir de ahí, iteramos por fases.
