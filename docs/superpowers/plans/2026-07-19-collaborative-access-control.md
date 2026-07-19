# Collaborative List Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restringir el acceso a listas privadas colaborativas al owner y a los colaboradores que el owner añade explícitamente, cerrando el acceso de anónimos y eliminando el auto-join.

**Architecture:** El control de acceso deja de usar el booleano `collaborative` como puerta y pasa a consultar la tabla `participations` (rol `collaborator`). `canViewList` ya es async; `canModifyList` pasa de síncrona a async. Se elimina el bloque de auto-join en `GET /lists/:listId`.

**Tech Stack:** Hono, Drizzle ORM (Neon/Postgres), Vitest con `app.request()` y mock de `getAuthUser`.

## Global Constraints

- Tests usan `app.request()` con `db` mockeado vía `vi.mock('../src/db/client')`, montado antes de importar `app`.
- Para endpoints autenticados, mockear `getAuthUser` de `@hono/auth-js` antes del import de `app` (ver patrón en CLAUDE.md).
- Imports ESM en `api/` requieren extensión `.js` explícita.
- Sin comentarios en el código. Estilo self-documenting.
- Paleta y estilo no aplican (cambios solo de backend).
- Un test único: `npx vitest run api/index.test.ts` (o el fichero de test correspondiente).

---

### Task 1: `canModifyList` async basada en colaboradores explícitos

**Files:**
- Modify: `api/app.ts:408-413` (`canModifyList`)
- Modify: `api/app.ts:1040-1041, 1080-1081, 1113-1114, 1240, 1363, 1397-1398, 1426-1427` (call-sites → `await`)
- Test: `api/index.test.ts` (añadir casos)

**Interfaces:**
- Produces: `async function canModifyList(list: { id: string; ownerId: string | null; collaborative: boolean }, userId: string | null): Promise<boolean>`. Nota: la firma gana el campo `id` en el parámetro `list` (necesario para `getParticipation`). Todos los objetos pasados (`resolveList`) ya incluyen `id`.
- Consumes: `getParticipation(sourceListId: string, userId: string)` existente (`api/app.ts:474`), que devuelve `{ id, completedAt, role } | undefined`.

- [ ] **Step 1: Write the failing test**

Añadir en `api/index.test.ts` (usar el patrón de mock existente del fichero):

```ts
it("blocks anonymous edits on a private collaborative list", async () => {
  mockGetAuthUser.mockRejectedValue(new Error("no session"));
  mockDb.query.lists.findFirst.mockResolvedValue({
    id: "11111111-1111-1111-1111-111111111111",
    ownerId: "owner-1",
    collaborative: true,
    public: false,
  });
  mockDb.query.items.findFirst.mockResolvedValue({
    id: "22222222-2222-2222-2222-222222222222",
    done: false,
  });
  mockDb.query.participations.findFirst.mockResolvedValue(undefined);
  const res = await app.request(
    "/api/lists/11111111-1111-1111-1111-111111111111/items/22222222-2222-2222-2222-222222222222/toggle",
    { method: "PATCH" }
  );
  expect(res.status).toBe(403);
});
```

(Ajustar los nombres de los mocks — `mockDb`, `mockGetAuthUser` — a los que ya use el fichero de test. Si el fichero usa otro nombre para el mock de `db`, alinearse con él.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/index.test.ts -t "blocks anonymous edits"`
Expected: FAIL (hoy `canModifyList` devuelve `true` por `collaborative`, el toggle procede y no da 403).

- [ ] **Step 3: Reescribir `canModifyList` como async**

Reemplazar `api/app.ts:408-413`:

```ts
async function canModifyList(
  list: { id: string; ownerId: string | null; collaborative: boolean },
  userId: string | null
): Promise<boolean> {
  if (list.ownerId === null) return true;
  if (list.ownerId === userId) return true;
  if (!list.collaborative || userId === null) return false;
  const participation = await getParticipation(list.id, userId);
  return participation?.role === "collaborator";
}
```

- [ ] **Step 4: Actualizar los call-sites a `await`**

En cada uno de estos, añadir `await` (los objetos `list` provienen de `resolveList`, que incluye `id`):

- `api/app.ts:1040` → `if (!(await canModifyList(list, userId)))`
- `api/app.ts:1080` → `if (!(await canModifyList(list, userId)))`
- `api/app.ts:1113` → `if (!(await canModifyList(list, userId)))`
- `api/app.ts:1363` → `if (!(await canModifyList(list, userId))) return c.json({ error: "Forbidden" }, 403);`
- `api/app.ts:1397` → `if (!(await canModifyList(list, userId)))`
- `api/app.ts:1426` → `if (!(await canModifyList(list, userId)))`

Para el toggle (`api/app.ts:1240`), reemplazar:

```ts
  if (participation?.role !== "collaborator" && !canModifyList(list, userId)) {
    return c.json({ error: "Forbidden" }, 403);
  }
```

por:

```ts
  if (
    participation?.role !== "collaborator" &&
    !(await canModifyList(list, userId))
  ) {
    return c.json({ error: "Forbidden" }, 403);
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run api/index.test.ts -t "blocks anonymous edits"`
Expected: PASS

- [ ] **Step 6: Añadir test de colaborador que SÍ edita**

```ts
it("allows an explicit collaborator to edit a private collaborative list", async () => {
  mockGetAuthUser.mockResolvedValue({ session: { user: { id: "collab-1" } } });
  mockDb.query.lists.findFirst.mockResolvedValue({
    id: "11111111-1111-1111-1111-111111111111",
    ownerId: "owner-1",
    collaborative: true,
    public: false,
  });
  mockDb.query.items.findFirst.mockResolvedValue({
    id: "22222222-2222-2222-2222-222222222222",
    done: false,
  });
  mockDb.query.participations.findFirst.mockResolvedValue({
    id: "p1",
    completedAt: null,
    role: "collaborator",
  });
  const res = await app.request(
    "/api/lists/11111111-1111-1111-1111-111111111111/items/22222222-2222-2222-2222-222222222222/toggle",
    { method: "PATCH" }
  );
  expect(res.status).toBe(200);
});
```

Run: `npx vitest run api/index.test.ts -t "explicit collaborator to edit"`
Expected: PASS

- [ ] **Step 7: Run full API test file**

Run: `npx vitest run api/index.test.ts`
Expected: PASS (todos). Revisar regresiones en tests que ejercitan `canModifyList` con el mock de `participations` no configurado — añadir `mockDb.query.participations.findFirst.mockResolvedValue(...)` donde haga falta.

- [ ] **Step 8: Type-check**

Run: `npm run type-check`
Expected: sin errores (los call-sites ahora esperan `Promise<boolean>`).

- [ ] **Step 9: Commit**

```bash
git add api/app.ts api/index.test.ts
git commit -m "Restrict list edits to owner and explicit collaborators"
```

---

### Task 2: `canViewList` bloquea anónimos y no-colaboradores en listas privadas

**Files:**
- Modify: `api/app.ts:385-406` (`canViewList`)
- Test: `api/index.test.ts`

**Interfaces:**
- Produces: `canViewList` con misma firma async; nueva semántica: `collaborative` solo ya NO concede acceso.
- Consumes: `getParticipation`, `hasPurchased` (existentes).

- [ ] **Step 1: Write the failing test**

```ts
it("hides a private collaborative list from a logged-in non-collaborator", async () => {
  mockGetAuthUser.mockResolvedValue({ session: { user: { id: "stranger" } } });
  mockDb.query.lists.findFirst.mockResolvedValue({
    id: "11111111-1111-1111-1111-111111111111",
    ownerId: "owner-1",
    collaborative: true,
    public: false,
    name: "secret",
    slug: "secret",
  });
  mockDb.query.participations.findFirst.mockResolvedValue(undefined);
  mockDb.query.listPurchases.findFirst.mockResolvedValue(undefined);
  const res = await app.request(
    "/api/lists/11111111-1111-1111-1111-111111111111"
  );
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/index.test.ts -t "hides a private collaborative list"`
Expected: FAIL (hoy `collaborative` concede vista → 200).

- [ ] **Step 3: Reescribir `canViewList`**

Reemplazar `api/app.ts:385-406`:

```ts
async function canViewList(
  list: {
    id?: string;
    ownerId: string | null;
    public: boolean;
    collaborative: boolean;
  },
  userId: string | null
): Promise<boolean> {
  if (list.public) return true;
  if (userId !== null && list.ownerId === userId) return true;
  if (userId === null || !list.id) return false;
  const participation = await getParticipation(list.id, userId);
  if (participation) return true;
  return hasPurchased(userId, list.id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/index.test.ts -t "hides a private collaborative list"`
Expected: PASS

- [ ] **Step 5: Añadir test de anónimo bloqueado en vista**

```ts
it("returns 404 to anonymous on a private collaborative list", async () => {
  mockGetAuthUser.mockRejectedValue(new Error("no session"));
  mockDb.query.lists.findFirst.mockResolvedValue({
    id: "11111111-1111-1111-1111-111111111111",
    ownerId: "owner-1",
    collaborative: true,
    public: false,
    name: "secret",
    slug: "secret",
  });
  const res = await app.request(
    "/api/lists/11111111-1111-1111-1111-111111111111"
  );
  expect(res.status).toBe(404);
});
```

Run: `npx vitest run api/index.test.ts -t "returns 404 to anonymous"`
Expected: PASS

- [ ] **Step 6: Run full API test file**

Run: `npx vitest run api/index.test.ts`
Expected: PASS. Ajustar mocks de tests existentes de vista colaborativa que asumían acceso abierto.

- [ ] **Step 7: Commit**

```bash
git add api/app.ts api/index.test.ts
git commit -m "Restrict private collaborative list views to owner and collaborators"
```

---

### Task 3: Eliminar el auto-join en `GET /lists/:listId`

**Files:**
- Modify: `api/app.ts:909-918` (bloque de upsert de participación)
- Test: `api/index.test.ts`

**Interfaces:**
- Produces: `GET /lists/:listId` deja de crear participaciones. Solo lee la existente.

- [ ] **Step 1: Write the failing test**

```ts
it("does not auto-join a visitor as collaborator", async () => {
  mockGetAuthUser.mockResolvedValue({ session: { user: { id: "collab-1" } } });
  mockDb.query.lists.findFirst.mockResolvedValue({
    id: "11111111-1111-1111-1111-111111111111",
    ownerId: "owner-1",
    collaborative: true,
    public: false,
    name: "secret",
    slug: "secret",
  });
  mockDb.query.participations.findFirst.mockResolvedValue({
    id: "p1",
    completedAt: null,
    role: "collaborator",
  });
  const insertSpy = mockDb.insert;
  await app.request("/api/lists/11111111-1111-1111-1111-111111111111");
  expect(insertSpy).not.toHaveBeenCalledWith(participations);
});
```

(Ajustar `insertSpy`/`participations` al modo en que el fichero de test observe `db.insert`. Si el mock no lo permite directamente, verificar en su lugar que `onConflictDoNothing` no se invoca; alinearse con el estilo del fichero.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/index.test.ts -t "does not auto-join"`
Expected: FAIL (hoy inserta participación con `role: collaborator`).

- [ ] **Step 3: Eliminar el bloque de auto-join**

Borrar `api/app.ts:909-918`:

```ts
  if (userId && list.collaborative && list.ownerId !== userId) {
    await db
      .insert(participations)
      .values({
        sourceListId: list.id,
        userId,
        role: "collaborator",
      })
      .onConflictDoNothing();
  }
```

El resto del handler (lectura de `participation` en la línea siguiente y respuesta) permanece intacto.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/index.test.ts -t "does not auto-join"`
Expected: PASS

- [ ] **Step 5: Run full API test file + type-check**

Run: `npx vitest run api/index.test.ts && npm run type-check`
Expected: PASS, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add api/app.ts api/index.test.ts
git commit -m "Remove auto-join of visitors as collaborators"
```

---

### Task 4: Test de regresión — pública colaborativa: ver todos, editar solo colaboradores

**Files:**
- Test: `api/index.test.ts`

**Interfaces:**
- Consumes: `canViewList`, `canModifyList` (Tasks 1-2).

- [ ] **Step 1: Test de vista pública abierta**

```ts
it("lets anyone view a public collaborative list but not edit it", async () => {
  mockGetAuthUser.mockRejectedValue(new Error("no session"));
  mockDb.query.lists.findFirst.mockResolvedValue({
    id: "33333333-3333-3333-3333-333333333333",
    ownerId: "owner-1",
    collaborative: true,
    public: true,
    name: "open",
    slug: "open",
  });
  mockDb.query.items.findFirst.mockResolvedValue({
    id: "44444444-4444-4444-4444-444444444444",
    done: false,
  });
  mockDb.query.participations.findFirst.mockResolvedValue(undefined);

  const view = await app.request(
    "/api/lists/33333333-3333-3333-3333-333333333333"
  );
  expect(view.status).toBe(200);

  const edit = await app.request(
    "/api/lists/33333333-3333-3333-3333-333333333333/items/44444444-4444-4444-4444-444444444444/toggle",
    { method: "PATCH" }
  );
  expect(edit.status).toBe(403);
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run api/index.test.ts -t "public collaborative list but not edit"`
Expected: PASS (con Tasks 1-2 aplicadas).

- [ ] **Step 3: Run full suite**

Run: `npx vitest run`
Expected: PASS (toda la suite, no solo el fichero API — verificar que ningún test de frontend/hook rompe).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: sin warnings.

- [ ] **Step 5: Commit**

```bash
git add api/index.test.ts
git commit -m "Test public collaborative lists are view-open but edit-restricted"
```

---

## Self-Review

**Spec coverage:**
- Anónimos no ven/editan privadas colaborativas → Task 1 (edit), Task 2 (view). ✓
- Puerta = tabla de colaboradores, no booleano → Tasks 1-2. ✓
- Eliminar auto-join → Task 3. ✓
- Públicas colaborativas: ver todos, editar solo colaboradores → Task 4 (regresión), soportado por Tasks 1-2. ✓
- Challengers intactos, notificaciones intactas → no se tocan esos caminos; `canViewList` sigue admitiendo cualquier participación para VER; el toggle de challenger (rama `role === "challenger"`, `api/app.ts:1167`) es anterior al cambio de `canModifyList` y no se modifica. ✓
- Migración opción A (no borrar) → decisión operacional, sin tarea de código. Documentada en spec; se aplica no incluyendo purga. ✓
- Owner sin cuenta (`ownerId === null`) sigue editable → preservado en Task 1 (`if (list.ownerId === null) return true`). ✓

**Placeholder scan:** los ajustes de nombres de mock ("alinearse con el fichero") son necesarios porque el nombre exacto del mock de `db` depende del fichero de test existente; el implementador debe leer `api/index.test.ts` primero. No hay TODOs de lógica pendiente.

**Type consistency:** `canModifyList` y `canViewList` ambas `Promise<boolean>`; `canModifyList` gana `id` en el parámetro `list`, compatible con `resolveList` (que devuelve `id`). Call-sites actualizados a `await`. ✓
