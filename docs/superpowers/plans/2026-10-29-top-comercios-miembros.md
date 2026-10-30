# Top de comercios en el Inicio del socio — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un bloque «Top de comercios» en `/miembros` con dos pestañas («Mejor calificados», «Más ventas») de 5 filas cada una.

**Architecture:** Dos funciones SQL `security definer` devuelven solo `comercio_id` + el dato (ya ordenado y limitado a 5). Una capa pura (`top-comercios.ts`) cruza esas filas con el catálogo que el Inicio ya carga (`directorio.comercios`: nombre, logo, categorías) y decide textos y vacíos. Un componente de cliente pinta las pestañas; entra por el hueco `aviso` de `DirectorioComercios`, así que no se toca el directorio.

**Tech Stack:** Next.js 16 (Server Components), Supabase (RPC), Vitest, CSS Modules con tokens (`var(--…)`).

**Spec:** `docs/superpowers/specs/2026-10-29-top-comercios-miembros-design.md`

## Global Constraints

- Solo 5 comercios por pestaña (`TOPE_TOP = 5`).
- «Mejor calificados»: promedio de `resenas.estrellas`, **mínimo 3 reseñas** (`MINIMO_RESENAS = 3`). Desempate: más reseñas, luego nombre.
- «Más ventas»: número de filas de `ventas` de los **últimos 30 días corridos** (`DIAS_VENTAS = 30`), hora de Colombia; sin dinero; 0 ventas no entra. Desempate: nombre.
- Solo comercios `activo and deleted_at is null`.
- Nada de `style={{}}` para maquetar, ni colores/espaciados literales: tokens de `src/styles/tokens.css`. Sin trazo en reposo; sin sombra en filas; `:hover` solo bajo `@media (hover: hover)`; objetivo táctil ≥ 44 px; el dato lleva texto (estrella + número), nunca solo color.
- La migración se aplica a mano: el código debe tolerar que la función no exista (el bloque no se pinta; el Inicio no se rompe).
- Pruebas automáticas solo de funciones puras (`src/lib/**`). Lo demás, a mano.
- Trabajar en el worktree `C:\dev\orum-worktrees\top-comercios` (rama `feat/top-comercios-miembros`).

## Review Focus

- Un comercio devuelto por SQL que no está en el catálogo (oculto/inactivo): se descarta sin romper; la lista queda más corta.
- Comercio con exactamente 3 reseñas entra; con 2 no (se comprueba en el SQL de verificación).
- Promedio `4.9` se escribe `4,9`; `4` se escribe `4,0`; miles de ventas con punto (`1.280`); `1 venta` en singular.
- Empates en promedio y en ventas: el orden es estable y determinista.
- La función RPC falla o no existe: `leerTopComercios` devuelve `null`, no lanza.
- Una pestaña vacía muestra su mensaje; las dos vacías o `null`: el bloque no se pinta.

---

### Task 0: Preparar el worktree

**Files:** ninguno.

- [ ] **Step 1: Instalar dependencias** — en `C:\dev\orum-worktrees\top-comercios` ejecutar `pnpm install` (si `pnpm` no está en el PATH: `corepack pnpm install`). Esperado: termina sin error y existe `node_modules/.bin/vitest.cmd`.
- [ ] **Step 2: Línea base** — `.\node_modules\.bin\vitest.cmd run --reporter=dot`. Esperado: todo en verde antes de tocar nada.

---

### Task 1: Lógica pura del top

**Files:**
- Create: `src/lib/comercios/top-comercios.ts`
- Test: `src/lib/comercios/top-comercios.test.ts`
- Commit también: `docs/superpowers/specs/2026-10-29-top-comercios-miembros-design.md`, este plan.

**Interfaces:**
- Produces (todo exportado desde `top-comercios.ts`):
  ```ts
  export const TOPE_TOP = 5
  export const MINIMO_RESENAS = 3
  export const DIAS_VENTAS = 30
  export type FilaCalificado = { comercio_id: number; promedio: number; total: number }
  export type FilaVentas = { comercio_id: number; ventas: number }
  export type ComercioDelTop = Pick<ComercioVitrina, 'id' | 'nombre' | 'logoUrl' | 'categorias' | 'ciudades'>
  export type ItemTop = {
    posicion: number          // desde 1
    comercioId: number
    nombre: string
    logoUrl: string | null
    detalle: string           // detalleComercio(categorias, ciudades)
    dato: string              // «★ 4,9» o «128 ventas»
    datoAccesible: string     // «4,9 de 5 estrellas, 12 reseñas» / «128 ventas en el último mes»
  }
  export type TopComercios = { calificados: ItemTop[]; ventas: ItemTop[] }
  export function armarTopCalificados(filas: readonly FilaCalificado[], comercios: ReadonlyMap<number, ComercioDelTop>): ItemTop[]
  export function armarTopVentas(filas: readonly FilaVentas[], comercios: ReadonlyMap<number, ComercioDelTop>): ItemTop[]
  export function hayTop(top: TopComercios | null): top is TopComercios
  export const MENSAJE_VACIO_CALIFICADOS: string
  export const MENSAJE_VACIO_VENTAS: string
  ```
  `ComercioVitrina` y `detalleComercio` vienen de `@/lib/publico/datos-publicos` y `@/lib/publico/directorio`.

- [ ] **Step 1: Escribir las pruebas** (`top-comercios.test.ts`, estilo de `ventas.test.ts`), con un `Map` de 3–7 comercios de ejemplo. Cada una con sus aserciones:
  - `armarTopCalificados` ordena por `promedio` desc, luego `total` desc, luego `nombre` (es-CO) asc, y numera `posicion` desde 1.
  - Descarta una fila cuyo `comercio_id` no está en el mapa (la lista queda más corta).
  - Corta a `TOPE_TOP` aunque lleguen 7 filas.
  - `dato` es `'★ 4,9'` para `4.9` y `'★ 4,0'` para `4`; `datoAccesible` es `'4,9 de 5 estrellas, 12 reseñas'` y con `total: 3` dice `'3 reseñas'`.
  - Descarta filas con `total < MINIMO_RESENAS` (defensa si el SQL cambia): `{total: 2}` no sale.
  - `armarTopVentas` ordena por `ventas` desc y luego nombre; `dato` es `'128 ventas'`, `'1 venta'` para 1, `'1.280 ventas'` para 1280; `datoAccesible` termina en `' en el último mes'`; descarta `ventas <= 0`.
  - `detalle` es el de `detalleComercio` (p. ej. `'Gastronomía (Pizzerías) · Bogotá'`).
  - `hayTop(null)` es `false`; `hayTop({calificados: [], ventas: []})` es `false`; con un ítem en cualquiera de las dos es `true`.
- [ ] **Step 2: Ejecutar y ver fallar** — `.\node_modules\.bin\vitest.cmd run src/lib/comercios/top-comercios.test.ts`. Esperado: FAIL (módulo no existe).
- [ ] **Step 3: Implementar** `top-comercios.ts` con las firmas de arriba. Formateo con `Intl.NumberFormat('es-CO', …)` (un decimal fijo para el promedio; miles con punto para ventas). Mensajes: `MENSAJE_VACIO_CALIFICADOS = 'Aún no hay comercios con 3 reseñas o más.'`, `MENSAJE_VACIO_VENTAS = 'Aún no hay ventas registradas en el último mes.'`.
- [ ] **Step 4: Ejecutar y ver pasar** — mismo comando. Esperado: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/comercios/top-comercios.ts src/lib/comercios/top-comercios.test.ts docs/superpowers
  git commit -m "feat(top-comercios): lógica pura del top de calificados y de ventas"
  ```

---

### Task 2: Funciones SQL, comprobación y tipos

**Files:**
- Create: `supabase/migrations/20261029140000_top_comercios.sql`
- Create: `supabase/verificacion/top_comercios_verificacion.sql`
- Modify: `src/lib/supabase/database.types.ts` (junto a `comercios_mas_usados`, ~línea 800)

**Interfaces:**
- Produces (SQL):
  - `public.top_comercios_calificados(p_limite integer default 5) returns table (comercio_id bigint, promedio numeric, total integer)` — `group by` sobre `resenas` unido a `comercios c` (`c.activo and c.deleted_at is null`), `having count(*) >= 3`, `order by avg desc, count desc, c.nombre`, `limit greatest(1, least(coalesce(p_limite, 5), 20))`. `promedio` = `round(avg(estrellas), 1)`.
  - `public.top_comercios_ventas(p_limite integer default 5) returns table (comercio_id bigint, ventas bigint)` — `ventas v join sucursales s on s.id = v.sucursal_id join comercios c on c.id = s.comercio_id`, `v.fecha_hora >= now() - interval '30 days'`, comercio activo, `group by s.comercio_id`, `order by count(*) desc, c.nombre`, mismo `limit`.
  - Ambas: `language sql stable security definer set search_path = public`; `revoke all … from public, anon; grant execute … to authenticated`. Seguir el estilo de `comercios_mas_usados` en `20260914090000_favoritos_y_mas_usados.sql` (comentario de cabecera que explica por qué es función: el socio no puede leer `ventas` ni `resenas` ajenas, y solo sale agregado).
- Produces (tipos): en `Functions` de `database.types.ts`:
  `top_comercios_calificados: { Args: { p_limite?: number }; Returns: { comercio_id: number; promedio: number; total: number }[] }` y `top_comercios_ventas: { Args: { p_limite?: number }; Returns: { comercio_id: number; ventas: number }[] }`.

- [ ] **Step 1: Escribir la migración** con las dos funciones. Cabecera: «se aplica a mano, una vez; el código aguanta sin ella».
- [ ] **Step 2: Escribir la comprobación** `top_comercios_verificacion.sql` (patrón de `resenas_verificacion.sql`: transacción con `rollback`, datos de prueba): un comercio con 3 reseñas entra; uno con 2 no; empate de promedio se resuelve por total; una venta de hace 31 días no cuenta y una de hace 29 sí; un comercio inactivo no sale; ninguna función devuelve más de 5 con `p_limite` omitido.
- [ ] **Step 3: Añadir los tipos** a `database.types.ts`.
- [ ] **Step 4: Verificar tipos** — `.\node_modules\.bin\tsc.cmd --noEmit`. Esperado: sin errores.
- [ ] **Step 5: Revisar el SQL a ojo** — no hay base local; las funciones y la comprobación **no se ejecutan en este paso**. Anotar en el mensaje final que están sin aplicar ni probadas contra la base.
- [ ] **Step 6: Commit**
  ```bash
  git add supabase src/lib/supabase/database.types.ts
  git commit -m "feat(top-comercios): funciones SQL del top de calificados y de ventas"
  ```

---

### Task 3: Lector tolerante

**Files:**
- Create: `src/lib/comercios/top-comercios-datos.ts`

**Interfaces:**
- Consumes: `armarTopCalificados`, `armarTopVentas`, `TopComercios`, `ComercioDelTop` (Task 1); tipos de Task 2.
- Produces: `export async function leerTopComercios(cliente: SupabaseClient<Database>, comercios: readonly ComercioDelTop[]): Promise<TopComercios | null>`

- [ ] **Step 1: Implementar** `leerTopComercios` (patrón de `horario-datos.ts`): construye el `Map` por `id`; llama en paralelo a `cliente.rpc('top_comercios_calificados')` y `cliente.rpc('top_comercios_ventas')`; si **alguna** devuelve `error` o `data` nulo, esa lista es `[]` (la otra se conserva); si **ambas** fallan devuelve `null`; nunca lanza (`try/catch` alrededor). Cabecera de comentario: por qué tolera la ausencia de la función.
- [ ] **Step 2: Verificar** — `.\node_modules\.bin\tsc.cmd --noEmit` y `.\node_modules\.bin\eslint.cmd src/lib/comercios`. Esperado: limpio.
- [ ] **Step 3: Commit** — `git add src/lib/comercios/top-comercios-datos.ts` · `feat(top-comercios): lectura tolerante del top`.

---

### Task 4: Componente

**Files:**
- Create: `src/components/comercios/top-comercios.tsx`
- Create: `src/components/comercios/top-comercios.module.css`

**Interfaces:**
- Consumes: `TopComercios`, `ItemTop`, `hayTop`, `MENSAJE_VACIO_*` (Task 1); `SegmentedControl` (`@/components/ui/segmented`); `ComercioLogo`; `Link`.
- Produces: `export function TopComerciosSocio({ top }: { top: TopComercios })` (`'use client'`).

- [ ] **Step 1: Implementar el componente.**
  - `<section aria-labelledby>` con `h2` «Top de comercios»; debajo `SegmentedControl` (`ariaLabel="Ver top por"`, opciones `calificados` → «Mejor calificados» con icono de estrella, `ventas` → «Más ventas»; `useState('calificados')`).
  - Lista `<ol>` de las filas de la pestaña elegida. Cada fila es un `<Link href={`/miembros/comercios/${comercioId}`}>` con: número, `ComercioLogo` (variante `tarjeta`), nombre y `detalle` (recortado a una línea), y a la derecha `dato`. El `datoAccesible` va como texto solo-lector (`aria-label` del enlace o clase visualmente oculta existente en el proyecto).
  - Pestaña sin ítems: un `<p>` con el `MENSAJE_VACIO_*` correspondiente.
  - Cambio de pestaña: fundido corto de la lista (`opacity`, `--dur-fast`, `--ease-out`) con `key` por pestaña; sin movimiento con `prefers-reduced-motion`.
- [ ] **Step 2: CSS** según las restricciones globales: la sección es una tarjeta con `--shadow-card` y `border: 1px solid var(--border-superficie)`; filas **sin** sombra, separadas por `--border-subtle`; fila con `min-height: var(--tap-min)`; número en `--gold-700`; al apuntar/pulsar: solo opacidad (lista corta, pero es fila de lista); hover dentro de `@media (hover: hover)`; foco `:focus-visible` con el anillo del sistema; ancho adaptado con `@container contenido` (comprobar que el ancestro lo declara) y probado de 320 a 414 px sin desbordes (`min-width: 0`, `text-overflow: ellipsis`).
- [ ] **Step 3: Verificar** — `tsc --noEmit` y `eslint .` limpios (`.\node_modules\.bin\eslint.cmd .`).
- [ ] **Step 4: Commit** — `git add src/components/comercios/top-comercios.*` · `feat(top-comercios): componente del top con pestañas`.

---

### Task 5: Montarlo en el Inicio y comprobar

**Files:**
- Modify: `src/app/miembros/(portal)/page.tsx`

**Interfaces:**
- Consumes: `leerTopComercios` (Task 3), `TopComerciosSocio` (Task 4), `hayTop` (Task 1).

- [ ] **Step 1: Cargar el top en paralelo** — añadir `leerTopComercios(supabase, directorio.comercios)` al `Promise.all`; como depende de `directorio`, encadenarlo así: `obtenerDirectorioPublico().then(async (d) => [d, await leerTopComercios(supabase, d.comercios)] as const)`, o una segunda espera tras el `Promise.all` si queda más legible (que no retrase las otras consultas).
- [ ] **Step 2: Pasarlo por el hueco `aviso`** — `aviso={<><AvisoNovedad … />{hayTop(top) && <TopComerciosSocio top={top} />}</>}`. No tocar `DirectorioComercios` ni `DirectorioInteractivo`. Actualizar el comentario de cabecera de la página: el Inicio vuelve a tener un top (encargo 29/10/2026), con el porqué.
- [ ] **Step 3: Verificación completa** — `.\node_modules\.bin\tsc.cmd --noEmit; .\node_modules\.bin\eslint.cmd .; .\node_modules\.bin\vitest.cmd run --reporter=dot; .\node_modules\.bin\next.cmd build`. Esperado: todo verde.
- [ ] **Step 4: Verificación a mano** (CLAUDE.md: «míralo renderizado»). Sin la migración aplicada: el Inicio carga normal y **no** hay bloque. Con la migración aplicada en una base de pruebas: ver el bloque a 1366 px y 390 px, ambas pestañas, con 0, 1, 5 y más de 5 comercios, un empate y un comercio con 2 reseñas que no debe entrar; teclado (Tab/flechas en las pestañas, foco visible); lector: cada fila anuncia el dato accesible. Avisar al propietario de que **la migración está sin aplicar**.
- [ ] **Step 5: Commit** — `git add "src/app/miembros/(portal)/page.tsx"` · `feat(top-comercios): top de comercios en el Inicio del socio`.

---

## Autorrevisión

- **Cobertura del spec:** pestañas y 5 filas (T4); calificados con mínimo 3 y desempates (T1, T2); ventas 30 días, sin dinero, sin 0 (T1, T2); vacíos y bloque oculto (T1 `hayTop`, T4, T5); tolerancia a migración ausente (T3, T5); ubicación entre aviso y filtros (T5 vía `aviso`); fundido corto (T4); fuera de alcance respetado.
- **Consistencia de tipos:** `FilaCalificado`/`FilaVentas` (T1) coinciden con `Returns` de T2; `leerTopComercios` (T3) devuelve `TopComercios` de T1; `TopComerciosSocio` (T4) recibe ese tipo.
- **Proporción:** 6 tareas cortas; el código real lo escribe quien implementa.
