/**
 * Qué escribió la persona en el login de socios: su número de membresía o su
 * correo. Pura: la acción del servidor decide después qué hacer con cada caso.
 *
 * - Número: exactamente 8 dígitos (ceros a la izquierda incluidos).
 * - Correo: forma de correo, normalizado a minúsculas y sin espacios. No se
 *   rechazan dominios desechables aquí: una cuenta antigua debe poder entrar.
 */

export type IdentificadorAcceso =
  | { tipo: 'numero'; valor: string }
  | { tipo: 'correo'; valor: string }

const NUMERO = /^\d{8}$/
const FORMA_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function clasificarIdentificador(entrada: string): IdentificadorAcceso | null {
  const limpio = entrada.trim()
  if (limpio === '') return null
  if (NUMERO.test(limpio)) return { tipo: 'numero', valor: limpio }
  const correo = limpio.toLowerCase()
  if (FORMA_CORREO.test(correo) && correo.length <= 254) {
    return { tipo: 'correo', valor: correo }
  }
  return null
}
