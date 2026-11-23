/*
  CUÁNTO FALTA  ·  el contador del editor de video (13/11/2026)
  ---------------------------------------------------------------------------
  Encargo: «añade un contador de carga para que el usuario sepa más o menos
  cuánto falta». Preparar y subir dan su avance (0 a 1) pero no su tiempo:
  aquí se estima con el RITMO REAL de los últimos segundos —no desde el
  principio: el arranque es lento y una subida cambia de velocidad— y se
  SUAVIZA, para que el número baje con calma en vez de saltar.

  Puro y probado: el componente guarda las muestras y pregunta cada segundo.
*/

/** Una lectura del avance: `t` en segundos, `p` de 0 a 1. */
export type Muestra = { t: number; p: number }

/** Cuántos segundos de muestras miran el ritmo. */
export const VENTANA_RITMO = 6
/** Lo mínimo observado antes de atreverse a estimar, en segundos. */
export const ESPERA_MINIMA = 1.5
/** Entre muestra y muestra, como poco (en segundos), y cuántas se guardan. */
export const INTERVALO_MUESTRAS = 0.25
export const MAXIMO_MUESTRAS = 120

/**
 * Añade una lectura sin que la lista crezca sin fin. La preparación avisa de
 * su avance CIENTOS de veces por segundo: guardarlas todas con un tope de
 * 120 dejaba menos de medio segundo de historia y nunca se podía estimar
 * (pasó en la primera versión). Se guarda una cada cuarto de segundo, como
 * mucho, y las 120 últimas: 30 segundos, de sobra para la ventana.
 */
export function agregarMuestra(muestras: readonly Muestra[], m: Muestra): Muestra[] {
  const penultima = muestras[muestras.length - 2]
  if (penultima && m.t - penultima.t < INTERVALO_MUESTRAS) {
    // Muy seguida: sustituye a la última (con su hora real), así el avance
    // más reciente no se pierde y las guardadas quedan espaciadas.
    return [...muestras.slice(0, -1), m]
  }
  const todas = [...muestras, m]
  return todas.length > MAXIMO_MUESTRAS ? todas.slice(-MAXIMO_MUESTRAS) : todas
}

/**
 * Segundos que faltan según el ritmo de los últimos `VENTANA_RITMO`
 * segundos, o `null` si aún no se puede saber (muy pronto, o sin avance).
 */
export function estimarRestante(muestras: readonly Muestra[]): number | null {
  if (muestras.length < 2) return null
  const ultima = muestras[muestras.length - 1]
  if (ultima.p >= 1) return 0
  const desde = ultima.t - VENTANA_RITMO
  const primera = muestras.find((m) => m.t >= desde) ?? muestras[0]
  const lapso = ultima.t - primera.t
  const avance = ultima.p - primera.p
  if (lapso < ESPERA_MINIMA || avance <= 0) return null
  return (1 - ultima.p) / (avance / lapso)
}

/**
 * Lo que se enseña: el valor anterior, descontado el tiempo que pasó, se
 * mezcla con la estimación nueva. ASIMÉTRICO: si va más rápido de lo
 * esperado, el número BAJA deprisa (pesa más lo nuevo); si se frena, SUBE
 * con calma. Así no promete de más ni salta con una racha lenta. (Con un
 * suavizado parejo, un arranque lento y luego rápido decía «35 s» a tres
 * segundos de terminar.) Nunca negativo.
 */
export function suavizarRestante(anterior: number | null, nuevo: number | null, transcurrido: number): number | null {
  if (nuevo === null) return anterior === null ? null : Math.max(0, anterior - transcurrido)
  if (anterior === null) return nuevo
  const esperado = Math.max(0, anterior - transcurrido)
  const pesoNuevo = nuevo < esperado ? 0.6 : 0.3
  return Math.max(0, esperado * (1 - pesoNuevo) + nuevo * pesoNuevo)
}

/** «Faltan unos 35 s», «Faltan unos 2 min», «Ya casi termina», o «Calculando…». */
export function textoRestante(segundos: number | null): string {
  if (segundos === null) return 'Calculando cuánto falta…'
  if (segundos < 5) return 'Ya casi termina'
  if (segundos < 60) return `Faltan unos ${Math.max(5, Math.round(segundos / 5) * 5)} s`
  const minutos = Math.round(segundos / 30) / 2 // de medio en medio minuto
  if (minutos < 1.5) return 'Falta cerca de 1 min'
  return `Faltan unos ${minutos.toLocaleString('es-CO')} min`
}
