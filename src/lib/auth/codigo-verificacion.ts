/**
 * El código de 6 dígitos que confirma el correo del registro (diseño aprobado
 * el 23/11/2026: se escribe en la misma ventana, sin salir a buscar un enlace).
 * Puro: lo usan el campo de las seis casillas y la acción del servidor.
 */

export const LARGO_CODIGO = 6

/** Solo las cifras de lo que se escribió o pegó, como mucho seis. */
export function soloCifras(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, LARGO_CODIGO)
}

/** El código si está completo (seis cifras), o null. */
export function codigoCompleto(texto: string): string | null {
  const cifras = texto.replace(/\s/g, '')
  return /^\d{6}$/.test(cifras) ? cifras : null
}

/**
 * Las seis casillas tras escribir `texto` en la casilla `desde` (un pegado
 * llena las siguientes). Devuelve las casillas y cuál enfocar después.
 */
export function llenarCasillas(
  casillas: readonly string[],
  desde: number,
  texto: string,
): { casillas: string[]; foco: number } {
  const nuevas = Array.from({ length: LARGO_CODIGO }, (_, i) => casillas[i] ?? '')
  const cifras = soloCifras(texto)
  if (!cifras) {
    nuevas[desde] = ''
    return { casillas: nuevas, foco: desde }
  }
  let i = desde
  for (const c of cifras) {
    if (i >= LARGO_CODIGO) break
    nuevas[i] = c
    i++
  }
  return { casillas: nuevas, foco: Math.min(i, LARGO_CODIGO - 1) }
}
