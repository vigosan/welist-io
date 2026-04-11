# Plan de mejora

## Fase 1 — Estabilidad y corrección

### 1.1 Race condition en posición de items
`api/app.ts:91-93` — El `SELECT max(position)` + `INSERT` no son atómicos.
Requests concurrentes generan posiciones duplicadas y rompen el orden.

- Usar una transacción con row lock o mover `position` a un valor calculado al vuelo (`ROW_NUMBER`) directamente en las queries de lectura, eliminando la necesidad de almacenar posición

### 1.2 Tipado estricto en error handlers
`src/routes/lists/$listId/index.tsx:101` — `err: any` en los `onError` de mutations.

- Cambiar todos los `err: any` por `err: unknown`
- Añadir type guards donde se inspeccione la respuesta HTTP
- Tipar el contexto de mutations optimistas (`MutationContext`) en `useItems.ts`

### 1.3 Validación de env vars al arrancar
`src/db/client.ts:5` — `process.env.DATABASE_URL!` sin validación.

- Validar todas las variables de entorno con Zod al inicio
- Fail fast si falta alguna variable requerida

---

## Fase 2 — Performance y experiencia

### 2.1 Polling inteligente
`src/hooks/useItems.ts:12`, `src/hooks/useList.ts:17` — `refetchInterval: 3000` siempre activo.

- Pausar el polling cuando el tab está oculto (`document.hidden`)
- Considerar subir el intervalo a 10–30s y refetch manual al volver al tab
- Explorar WebSockets o SSE como alternativa al polling

### 2.2 Ordenación de items con `useMemo`
`src/routes/lists/$listId/index.tsx:48-62` — Dos estructuras sincronizadas (`items` array + `sortedIds` state).

- Reemplazar el `useState` de `sortedIds` + `useEffect` por un `useMemo` que derive el orden directamente de `items`
- Eliminar la sincronización manual que puede desincronizarse

### 2.3 Memoizar `paletteActions`
`src/routes/lists/$listId/index.tsx:143-162` — Array recreado en cada render, causa re-render del command palette.

- Envolver en `useMemo` con dependencias explícitas

### 2.4 Persistir filtros en URL
`src/routes/lists/$listId/index.tsx:27` — `statusFilter` y `activeTag` se pierden al refrescar.

- Mover ambos filtros a query params de TanStack Router
- Comportamiento esperado: compartir URL con filtros aplicados

---

## Fase 3 — Arquitectura y mantenibilidad

### 3.1 Descomponer el componente dios
`src/routes/lists/$listId/index.tsx` — 450+ líneas, 13 `useState`, 7 mutations.

Extraer en hooks con responsabilidad única:
- `useListHeader()` — edición de nombre y slug
- `useItemsFilter()` — `statusFilter`, `activeTag`, filtrado derivado
- `useCommandPalette()` — estado de apertura y lista de acciones

### 3.2 Paginación en explore
`api/app.ts:137-148` — `limit(50)` hardcodeado sin cursor.

- Añadir paginación cursor-based al endpoint `/api/explore`
- Soporte de infinite scroll o paginación clásica en la UI

### 3.3 Rate limiting en la API
`api/app.ts` — Sin ningún límite de requests.

- Añadir middleware de rate limiting (Hono tiene soporte nativo)
- Aplicar límites distintos por endpoint (lectura vs escritura)

### 3.4 Error Boundaries
Sin error boundaries en ninguna ruta.

- Crear un componente `ErrorBoundary` reutilizable
- Envolver las rutas principales en `__root.tsx`

---

## Fase 4 — Calidad y tests

### 4.1 Tests del componente principal
`src/routes/lists/$listId/index.tsx` — Sin ningún test.

- Cubrir flujo principal: añadir item, marcar como hecho, editar, eliminar
- Cubrir edición de slug con escenario de error `slug_taken`
- Cubrir filtros de status y tag

### 4.2 Tests de hooks
`src/hooks/useItems.ts`, `src/hooks/useList.ts` — Sin tests.

- Testear updates optimistas y rollback en error
- Usar `renderHook` + servidor MSW para aislar la lógica de red

### 4.3 Mejorar mocks de API tests
`api/index.test.ts` — Mocks que no replican la API real de Drizzle.

- Revisar que los mocks chain (`insert().values().returning()`) coincidan con el uso real
- Añadir tests de los casos de error (409 slug duplicado, 404 lista no encontrada)

---

## Fase 5 — Polish

### 5.1 Nombrar magic numbers
Dispersos por el código: `3000`, `72`, `0.45`, `pt-[18vh]`.

- Extraer a constantes con nombre semántico en el módulo donde se usen

### 5.2 Skeleton durante carga de slug
La sección de slug muestra el input real mientras la lista aún carga.

- Mostrar skeleton mientras `listLoading` sea `true`

### 5.3 Accesibilidad básica
Varios puntos sin soporte ARIA:

- `role="dialog"` + `aria-modal` en el command palette
- `aria-label` descriptivo en botones de eliminar (contexto del item)
- Regiones `aria-live` para confirmaciones efímeras (copiado, refresh)

---

## Descartado

- **Autenticación/autorización** — la app es intencionadamente pública y sin cuentas, compartida por URL. No aplica.
- **Sanitización XSS** — React escapa por defecto; no hay `dangerouslySetInnerHTML`.
- **Connection pooling config** — Neon serverless driver gestiona esto; no hace falta configuración explícita.
