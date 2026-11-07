/*
  UN REINTENTO, CON PAUSA  (06/11/2026, prueba de carga)

  El reintento inmediato de `conRespaldo` duplicaba la carga sobre Supabase en
  el peor momento, y todos los visitantes reintentaban a la vez. Ahora el
  segundo intento espera una pausa aleatoria (para que no coincidan) y se
  salta cuando el error ya dice que insistir no sirve (circuito abierto).

  Puro: la pausa, la espera y el azar se inyectan.
*/

/** Pausa aleatoria entre `minMs` y `maxMs`. */
export function pausaDeReintento(minMs: number, maxMs: number, azar: () => number = Math.random): number {
  return Math.floor(minMs + azar() * (maxMs - minMs))
}

const esperarDeVerdad = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

export async function conReintentoUnico<T>(
  leer: () => Promise<T>,
  opciones: {
    pausaMs?: () => number
    esperar?: (ms: number) => Promise<void>
    noReintentar?: (error: unknown) => boolean
  } = {},
): Promise<T> {
  const { pausaMs = () => pausaDeReintento(200, 400), esperar = esperarDeVerdad, noReintentar } = opciones
  try {
    return await leer()
  } catch (error) {
    if (noReintentar?.(error)) throw error
    await esperar(pausaMs())
    return await leer()
  }
}
