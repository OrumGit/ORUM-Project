/*
  LAS RESEÑAS DE COMERCIOS  ·  reglas puras
  ---------------------------------------------------------------------------
  Un socio califica un comercio con 1 a 5 estrellas y, si quiere, un mensaje;
  el comercio y el administrador pueden responder. Aquí vive lo que tienen que
  decir igual la interfaz y el servidor: el rango de la calificación, el
  largo y la limpieza del texto, el promedio y el nombre con el que se firma.

  El texto se publica a la vista de todos, así que no admite enlaces ni
  marcado (mismo criterio que el formulario «Quiero ser aliado»). El servidor
  es quien decide; la interfaz solo avisa antes.
*/

export const ESTRELLAS_MIN = 1
export const ESTRELLAS_MAX = 5

/** Largo máximo del mensaje de una reseña y de cada respuesta. */
export const MENSAJE_MAXIMO = 500

/** Lo que devuelven las server actions de reseñas. */
export type ResenaState = { error?: string; ok?: boolean }

/** Una reseña tal como la pintan el catálogo y la ficha. */
export type ResenaVista = {
  id: number
  estrellas: number
  mensaje: string | null
  autor: string
  creadaEn: string
  respuestaComercio: string | null
  respuestaAdmin: string | null
}

const ERROR_ESTRELLAS = `Elige de ${ESTRELLAS_MIN} a ${ESTRELLAS_MAX} estrellas.`
const ERROR_LARGO = `El texto no puede pasar de ${MENSAJE_MAXIMO} caracteres.`
const ERROR_ENLACE = 'No pongas enlaces ni marcado en el texto.'
const ERROR_RESPUESTA_VACIA = 'Escribe la respuesta.'

/** Un enlace metido donde no va. */
function tieneEnlace(valor: string): boolean {
  return /https?:\/\/|www\./i.test(valor)
}

/** Marcado, llaves o barras invertidas: no forman parte de un comentario real. */
function tieneMarcado(valor: string): boolean {
  return /[<>{}[\]\\`|^~]/.test(valor)
}

/**
 * Espacios colapsados, salvo los saltos de línea: uno solo separa párrafos y
 * las líneas en blanco de más desaparecen.
 */
function limpiarTexto(crudo: string): string {
  return crudo
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Comprobaciones comunes de largo y contenido sobre un texto ya limpio. */
function errorDeTexto(texto: string): string | null {
  if (texto.length > MENSAJE_MAXIMO) return ERROR_LARGO
  if (tieneEnlace(texto) || tieneMarcado(texto)) return ERROR_ENLACE
  return null
}

/** La calificación: un entero de 1 a 5, que puede llegar como texto. */
export function revisarEstrellas(
  crudo: unknown,
): { ok: true; estrellas: number } | { ok: false; error: string } {
  const n =
    typeof crudo === 'number'
      ? crudo
      : typeof crudo === 'string' && /^\s*\d+\s*$/.test(crudo)
        ? Number(crudo)
        : NaN
  if (!Number.isInteger(n) || n < ESTRELLAS_MIN || n > ESTRELLAS_MAX) {
    return { ok: false, error: ERROR_ESTRELLAS }
  }
  return { ok: true, estrellas: n }
}

/** El mensaje es opcional: vacío se guarda como `null` (solo estrellas). */
export function revisarMensaje(
  crudo: string,
): { ok: true; mensaje: string | null } | { ok: false; error: string } {
  const mensaje = limpiarTexto(crudo)
  if (!mensaje) return { ok: true, mensaje: null }
  const error = errorDeTexto(mensaje)
  if (error) return { ok: false, error }
  return { ok: true, mensaje }
}

/** La respuesta del comercio o del administrador: obligatoria. */
export function revisarRespuesta(
  crudo: string,
): { ok: true; respuesta: string } | { ok: false; error: string } {
  const respuesta = limpiarTexto(crudo)
  if (!respuesta) return { ok: false, error: ERROR_RESPUESTA_VACIA }
  const error = errorDeTexto(respuesta)
  if (error) return { ok: false, error }
  return { ok: true, respuesta }
}

/** Promedio a un decimal, o `null` si aún no hay reseñas. */
export function promedio(estrellas: number[]): number | null {
  if (estrellas.length === 0) return null
  const suma = estrellas.reduce((a, b) => a + b, 0)
  return Math.round((suma / estrellas.length) * 10) / 10
}

/**
 * Total y promedio a partir de cuántas reseñas hay con 1, 2, 3, 4 y 5
 * estrellas (`conteos[0]` = las de 1). Exacto sin traer filas.
 */
export function resumenDeConteos(conteos: readonly number[]): {
  total: number
  promedio: number | null
} {
  let total = 0
  let suma = 0
  conteos.forEach((n, i) => {
    total += n
    suma += n * (i + 1)
  })
  return { total, promedio: total === 0 ? null : Math.round((suma / total) * 10) / 10 }
}

/** «4,5» con coma decimal; «—» cuando no hay promedio. */
export function formatearPromedio(valor: number | null): string {
  if (valor === null) return '—'
  return valor.toFixed(1).replace('.', ',')
}

/**
 * Lo que significa cada calificación, en palabras (29/10/2026). El selector
 * lo enseña al lado de las estrellas, para que nadie tenga que adivinar si
 * tres es bueno o regular. Vacío fuera de 1–5.
 */
export function etiquetaEstrellas(n: number): string {
  return ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][Number.isInteger(n) ? n : 0] ?? ''
}

function capitalizar(palabra: string): string {
  const [primera = '', ...resto] = Array.from(palabra)
  return primera.toLocaleUpperCase('es') + resto.join('').toLocaleLowerCase('es')
}

/**
 * Cómo firma un socio su reseña sin dar su nombre completo: el primer nombre
 * y la inicial del primer apellido («María G.»).
 */
export function nombreCorto(nombres: string, apellidos: string): string {
  const nombre = capitalizar(nombres.trim().split(/\s+/)[0] ?? '')
  const apellido = apellidos.trim().split(/\s+/)[0] ?? ''
  if (!apellido) return nombre
  return `${nombre} ${Array.from(apellido)[0].toLocaleUpperCase('es')}.`
}

/**
 * La tabla aún no existe (el esquema se aplica a mano y el código puede
 * llegar antes): Postgres dice `42P01`, PostgREST `PGRST205`.
 */
export function esTablaAusente(
  error: { code?: string } | null | undefined,
): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}
