/*
  LEER TODAS LAS FILAS, POR LOTES  ·  puro (11/11/2026)
  ---------------------------------------------------------------------------
  PostgREST corta CADA respuesta en 1000 filas, en silencio: una consulta
  sin `.range` que debería traer 3.000 ventas trae 1.000 y no avisa. Métricas
  sumaba así las ventas del periodo, y con un club grande sus cifras habrían
  salido cortas sin que nadie lo notara.

  `leerEnPaginas` pide de 1000 en 1000 hasta que un lote llega incompleto.
  Quien la usa ORDENA la consulta por una columna única (`id`): sin orden,
  dos lotes pueden repetir o saltarse filas.

  Tiene un tope (`MAX_LOTES`): si se alcanza, lanza en vez de devolver una
  lista cortada que se leería como completa. Un error de la base también
  lanza: una cifra inventada es peor que una página de error.
*/

export const FILAS_POR_LOTE = 1000
/** 50.000 filas. Más que eso, la cuenta tiene que hacerla la base. */
export const MAX_LOTES = 50

type Lote<T> = { data: T[] | null; error: unknown }

export async function leerEnPaginas<T>(
  pedir: (desde: number, hasta: number) => PromiseLike<Lote<T>>,
  { porLote = FILAS_POR_LOTE, maxLotes = MAX_LOTES }: { porLote?: number; maxLotes?: number } = {},
): Promise<T[]> {
  const filas: T[] = []
  for (let lote = 0; lote < maxLotes; lote++) {
    const desde = lote * porLote
    const { data, error } = await pedir(desde, desde + porLote - 1)
    if (error) throw error
    const llegaron = data ?? []
    filas.push(...llegaron)
    if (llegaron.length < porLote) return filas
  }
  throw new Error(`[leerEnPaginas] Más de ${maxLotes * porLote} filas: esta cuenta tiene que hacerla la base.`)
}
