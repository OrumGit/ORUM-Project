/*
  DÓNDE SE VE UN COMERCIO  ·  puro (07/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que pueda ponerlo visible en el portal inicial,
  en el de miembros o en ambos, para poder registrarlos pero tenerlos no
  visibles hasta que se tengan todos los recursos».

  Dos columnas de `comercios` (`visible_publico`, `visible_miembros`,
  migración `20261107120000_comercios_visibilidad.sql`, SE APLICA A MANO),
  las dos `true` por defecto: lo que ya había se sigue viendo. Van ENCIMA de
  `activo` —un aliado inactivo no se ve en ninguna parte, marque lo que
  marque—, y no tocan la caja: un comercio oculto sigue pudiendo registrar
  ventas, porque ocultarlo es una decisión de vitrina, no de servicio.

  Sin la migración, las lecturas reintentan sin las columnas
  (`faltaColumnaVisibilidad`) y todo se ve, como antes.
*/

export type Portal = 'publico' | 'miembros'

export type Visibilidad = { publico: boolean; miembros: boolean }

/**
 * Lo que haya en la fila; una columna que falta (sin migración, o leída sin
 * ella) vale «se ve». Acepta cualquier fila de `comercios`, la traiga o no.
 */
export function leerVisibilidad(fila: Readonly<Record<string, unknown>>): Visibilidad {
  return {
    publico: fila.visible_publico !== false,
    miembros: fila.visible_miembros !== false,
  }
}

/** Sin dato (una copia vieja de la caché) se ve: es lo que pasaba antes. */
export function seVeEn(v: Visibilidad | undefined, portal: Portal): boolean {
  if (!v) return true
  return (portal === 'publico' ? v.publico : v.miembros) !== false
}

/** La frase de la lista del panel y de la ficha. */
export function textoVisibilidad(v: Visibilidad): string {
  if (v.publico && v.miembros) return 'Portal inicial y miembros'
  if (v.publico) return 'Solo portal inicial'
  if (v.miembros) return 'Solo portal de miembros'
  return 'Oculto'
}

/** La misma frase, corta, para una celda de la lista del panel. */
export function textoVisibilidadCorto(v: Visibilidad): string {
  if (v.publico && v.miembros) return 'Ambos'
  if (v.publico) return 'Solo inicial'
  if (v.miembros) return 'Solo miembros'
  return 'Oculto'
}

/** Postgres (`42703`) y PostgREST (`PGRST204`) dicen así «esa columna no existe». */
export function faltaColumnaVisibilidad(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code !== '42703' && error.code !== 'PGRST204') return false
  return !error.message || /visible_(publico|miembros)/.test(error.message)
}

/**
 * Las fotos de un comercio SIN el logotipo: la portada (si hay) y las de la
 * galería. Es lo que cuenta el tope de ocho de «Mi negocio».
 */
export function contarImagenes(portadaUrl: string | null | undefined, enGaleria: number): number {
  return ((portadaUrl ?? '').trim() ? 1 : 0) + Math.max(0, enGaleria)
}

type ComercioDelCatalogo = {
  visible?: Visibilidad
  ciudadIds: readonly number[]
  categorias: readonly { subcategoriaId: number | null }[]
}

type Catalogo<C extends ComercioDelCatalogo> = {
  comercios: C[]
  categorias: { id: number; nombre: string; subcategorias: { id: number; nombre: string }[] }[]
  ciudades: { id: number; nombre: string }[]
}

/**
 * El catálogo de UN portal: solo sus comercios, y los filtros que les
 * quedan. Una ciudad o una subcategoría que solo tenía comercios ocultos se
 * va (filtrar por ella daría siempre una rejilla vacía); las categorías se
 * quedan todas, como en el catálogo entero.
 */
export function catalogoPara<C extends ComercioDelCatalogo, T extends Catalogo<C>>(
  catalogo: T,
  portal: Portal,
): T {
  const comercios = catalogo.comercios.filter((c) => seVeEn(c.visible, portal))
  if (comercios.length === catalogo.comercios.length) return catalogo

  const ciudades = new Set(comercios.flatMap((c) => c.ciudadIds))
  const subcategorias = new Set(comercios.flatMap((c) => c.categorias.map((k) => k.subcategoriaId)))
  return {
    ...catalogo,
    comercios,
    categorias: catalogo.categorias.map((k) => ({
      ...k,
      subcategorias: k.subcategorias.filter((s) => subcategorias.has(s.id)),
    })),
    ciudades: catalogo.ciudades.filter((c) => ciudades.has(c.id)),
  }
}
