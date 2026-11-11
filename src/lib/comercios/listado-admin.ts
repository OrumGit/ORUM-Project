/*
  LA LISTA DE COMERCIOS DEL PANEL  ·  puro (15/10/2026)
  ---------------------------------------------------------------------------
  El mismo diseño que la de miembros: pestañas con recuento, buscador,
  filtro de categoría y páginas. Aquí solo vive qué filas salen y en qué
  orden; la carga está en la página.
*/

export { FILAS_POR_PAGINA, paginar, paginasVisibles, type Pagina } from '../shared/paginacion'
import type { Visibilidad } from './visibilidad'

export type FilaComercio = {
  id: number
  nombre: string
  logoUrl: string | null
  /** Sus categorías (hasta 3), en el orden en que se guardaron. */
  categoriaIds: number[]
  categorias: string[]
  activo: boolean
  /** Sucursales activas. */
  sucursales: number
  /** Promociones activas. */
  promociones: number
  /** Fotos SIN el logotipo: la portada y la galería (07/11/2026). */
  imagenes: number
  /** Dónde se ve (07/11/2026). */
  visible: Visibilidad
  /** El puntaje de sus reseñas (11/11/2026); `promedio` null sin reseñas. */
  calificacion: { total: number; promedio: number | null }
}

/**
 * «Sin promociones»: aliados activos que no ofrecen nada hoy; es lo que hay
 * que perseguir. «Ocultos» (07/11/2026): aliados activos que no se ven en
 * NINGÚN portal, los registrados que esperan sus recursos.
 */
export type PestanaComercio = 'todos' | 'activos' | 'sin-promociones' | 'ocultos' | 'inactivos'

const PESTANAS: readonly PestanaComercio[] = ['todos', 'activos', 'sin-promociones', 'ocultos', 'inactivos']

export function leerPestanaComercio(valor: string | undefined): PestanaComercio {
  return PESTANAS.includes(valor as PestanaComercio) ? (valor as PestanaComercio) : 'todos'
}

export function enPestanaComercio(fila: FilaComercio, pestana: PestanaComercio): boolean {
  switch (pestana) {
    case 'activos':
      return fila.activo
    case 'sin-promociones':
      return fila.activo && fila.promociones === 0
    case 'ocultos':
      return fila.activo && !fila.visible.publico && !fila.visible.miembros
    case 'inactivos':
      return !fila.activo
    default:
      return true
  }
}

export function contarPorPestanaComercio(filas: readonly FilaComercio[]): Record<PestanaComercio, number> {
  const cuentas: Record<PestanaComercio, number> = {
    todos: 0,
    activos: 0,
    'sin-promociones': 0,
    ocultos: 0,
    inactivos: 0,
  }
  for (const f of filas) for (const p of PESTANAS) if (enPestanaComercio(f, p)) cuentas[p]++
  return cuentas
}

/** Sin tildes ni mayúsculas: «cafe» encuentra «Café Arábigo». */
function plano(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function filtrarComercios(
  filas: readonly FilaComercio[],
  { pestana, busqueda, categoriaId }: { pestana: PestanaComercio; busqueda: string; categoriaId: number | null },
): FilaComercio[] {
  const palabras = plano(busqueda).split(/\s+/).filter(Boolean)
  return filas
    .filter((f) => enPestanaComercio(f, pestana))
    .filter((f) => categoriaId === null || f.categoriaIds.includes(categoriaId))
    .filter((f) => {
      if (palabras.length === 0) return true
      const texto = plano(`${f.nombre} ${f.categorias.join(' ')}`)
      return palabras.every((p) => texto.includes(p))
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
