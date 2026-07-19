# Diseño: Control de acceso a listas colaborativas privadas

Fecha: 2026-07-19
Estado: aprobado (pendiente de plan de implementación)

## Problema

Una lista con `public: false` + `collaborative: true` (p. ej. `100-cosas-para-conocernos`)
es accesible y **editable por cualquiera, incluso sin iniciar sesión**. Reproducido en
producción sin autenticación:

- `GET /api/lists/100-cosas-para-conocernos` → 200 con todos los datos.
- `GET /api/lists/100-cosas-para-conocernos/items` → 200 con todos los items.

La intención del propietario es: *"esta lista es privada y la comparto solo con los
colaboradores que yo añado"*. La app **ya tiene** un gestor de colaboradores explícitos
(`CollaboratorsManager` + endpoints `/api/lists/:id/collaborators`), pero el control de
acceso lo ignora.

## Causa raíz

El control de acceso usa el booleano `collaborative` como puerta, en lugar de la lista de
colaboradores explícitos:

- `canViewList` (`api/app.ts:385`): devuelve `true` si `list.collaborative`, sin exigir
  `userId`. Un anónimo pasa.
- `canModifyList` (`api/app.ts:408`): devuelve `true` si `list.collaborative`, sin exigir
  `userId`. Un anónimo pasa.
- **Auto-join** (`api/app.ts:909-918`): al hacer `GET /lists/:listId` sobre una lista
  colaborativa, cualquier usuario logueado que no sea owner se inserta como
  `role: "collaborator"`. Esto vacía de sentido el gestor de colaboradores: no hace falta
  invitación, basta abrir el enlace.

Resultado: dos agujeros — (a) anónimos ven/editan; (b) cualquier logueado con el enlace se
auto-convierte en colaborador.

## Decisión de diseño

`collaborative` deja de significar "abierto a cualquiera" y pasa a significar **"solo el
owner y los colaboradores que el owner ha añadido explícitamente"**, de forma idéntica en
listas públicas y privadas.

"Colaborador" = existe una fila en `participations` con `role: "collaborator"` para
`(sourceListId = list.id, userId)`.

### Matriz de acceso resultante

**VER (`canViewList`):**

| | público: false | público: true |
|---|---|---|
| **collaborative: true** | owner o colaborador explícito (o comprador) | cualquiera |
| **collaborative: false** | owner (o comprador) | cualquiera |

**EDITAR (`canModifyList`):**

| | público: false | público: true |
|---|---|---|
| **collaborative: true** | owner o colaborador explícito | owner o colaborador explícito |
| **collaborative: false** | owner | owner |

### Cambios de comportamiento respecto a hoy

1. `collaborative` ya no concede acceso por sí solo. Un anónimo (`userId === null`) nunca
   pasa en listas no públicas.
2. La puerta de acceso pasa a ser la tabla de colaboradores, no el booleano.
3. Se **elimina el auto-join** (`api/app.ts:909-918`). Abrir el enlace ya no convierte a
   nadie en colaborador. Solo el owner añade colaboradores desde Settings
   (`POST /lists/:id/collaborators`, ya existente e inalterado).
4. Listas **públicas + colaborativas**: todos VEN, pero solo owner + colaboradores EDITAN.
   Esto elimina el patrón "wiki pública" (cualquier logueado añade items a una lista
   pública colaborativa). Es un endurecimiento intencional para que `collaborative`
   signifique lo mismo en todos los casos.

### Lo que NO cambia

- **Challengers**: quien acepta un reto público desde `/explore` sigue igual — su progreso
  va a `item_progress`, no edita items. Solo se ven afectados los `collaborator`.
- **Notificaciones y fan-out** de actividad colaborativa (`item_added`, `item_done`,
  `list_completed`) siguen disparándose para listas colaborativas.
- **Compra** (`hasPurchased`) sigue concediendo acceso de lectura.
- **Owner sin cuenta** (`ownerId === null`): las listas anónimas sin dueño mantienen su
  comportamiento actual — `canModifyList` seguirá devolviendo `true` cuando
  `ownerId === null` (no hay owner que restrinja). Estas listas son siempre editables por
  diseño preexistente; este spec no las toca.

## Cambios técnicos

### `canViewList` (async, ya lo es)

Sustituir la condición `list.collaborative` (que hoy concede acceso a cualquiera) por la
comprobación de participación. Lógica nueva:

```
canViewList(list, userId):
  if list.public: return true
  if userId !== null && list.ownerId === userId: return true
  if userId === null: return false          // anónimos fuera de listas no públicas
  if await getParticipation(list.id, userId): return true   // colaborador o challenger
  return await hasPurchased(userId, list.id)
```

Nota: `getParticipation` ya devuelve tanto challengers como collaborators. Para VER, ambos
roles bastan (un challenger de una lista que dejó de ser pública sigue pudiendo ver su
reto). La distinción de rol solo importa para EDITAR.

### `canModifyList` (pasa de síncrono a async)

Hoy es síncrono. Debe consultar `participations` para saber si el usuario es colaborador,
por lo que se vuelve `async`. Lógica nueva:

```
canModifyList(list, userId):
  if list.ownerId === null: return true      // lista sin dueño (comportamiento preexistente)
  if list.ownerId === userId: return true
  if !list.collaborative: return false
  if userId === null: return false
  participation = await getParticipation(list.id, userId)
  return participation?.role === "collaborator"
```

Impacto: los 7 call-sites de `canModifyList` (`api/app.ts:1040, 1080, 1113, 1240, 1363,
1397, 1426`) pasan a `await canModifyList(...)`.

Optimización: en los handlers que ya cargan la participación justo antes (toggle en 1165),
evitar la doble consulta pasando la participación ya cargada o reutilizando el resultado.
El toggle (`api/app.ts:1240`) ya distingue `participation?.role === "collaborator"`; su
rama de fallback a `canModifyList` debe quedar coherente con la nueva firma async.

### Eliminar auto-join

Borrar el bloque `api/app.ts:909-918` que inserta `role: "collaborator"` al visitar una
lista colaborativa. Tras esto, `GET /lists/:listId` solo lee la participación existente
(no la crea).

## Migración de datos

Antes de desplegar, medir cuántas participaciones `collaborator` se crearon por auto-join
(gente que solo abrió el enlace) frente a invitaciones reales. No hay forma directa de
distinguirlas en el esquema actual (ambas son filas idénticas). Opciones a decidir en el
plan:

- **A (conservadora):** no borrar nada. Los auto-unidos existentes conservan acceso; solo
  se corta el acceso futuro de anónimos y nuevos visitantes. Cero riesgo de quitar acceso
  a alguien que el owner sí quería.
- **B (limpia):** para listas privadas, revisar con el owner y purgar colaboradores no
  deseados. Requiere criterio manual; no automatizable con seguridad.

Recomendación: **A**. El agujero grave (anónimos + auto-join futuro) se cierra igualmente,
y no arriesgamos quitar acceso a colaboradores legítimos ya existentes.

## Testing

Tests nuevos (Vitest + `app.request()`), siguiendo el patrón de mock de `getAuthUser`:

1. **Anónimo NO ve lista privada colaborativa** → `GET /lists/:id` sin auth → 404.
2. **Anónimo NO edita lista privada colaborativa** → `PATCH .../toggle` sin auth → 403.
3. **Logueado no-colaborador NO ve lista privada colaborativa** → 404 (verifica que se
   eliminó el auto-join: no se crea participación).
4. **Colaborador explícito SÍ ve y edita** → owner añade vía
   `POST /collaborators`, luego ese usuario ve y hace toggle correctamente.
5. **Owner sigue viendo y editando** su lista privada colaborativa.
6. **Lista pública colaborativa: anónimo VE pero NO edita** → GET 200, toggle 403.
7. **Challenger de lista pública** conserva su flujo `item_progress` intacto (regresión).

Los tests deben encodear el *por qué*: una lista marcada como privada no debe filtrarse a
quien el owner no invitó.

## Fuera de alcance

- Rediseño del modelo de invitaciones (invitar por email a no-usuarios, aceptar/rechazar).
  El modelo actual (owner añade a usuarios existentes) se conserva.
- Cambios de UI más allá de, si acaso, textos que induzcan a error.
