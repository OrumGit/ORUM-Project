import { revisarCorreo } from '../aliados/solicitud-aliado'

/**
 * Correo del registro público, normalizado. Es la forma que se guarda en
 * `registros_pendientes.correo` y que se compara con `auth.users.email`.
 *
 * El índice de `auth.users` distingue mayúsculas, así que «Ana@Mail.com» y
 * «ana@mail.com» serían dos cuentas. Por eso todo correo se pasa por aquí antes
 * de tocar la base: sin espacios y en minúsculas.
 */
export function normalizarCorreo(valor: string): string {
  return valor.trim().toLowerCase()
}

export type ResultadoCorreoRegistro =
  | { ok: true; correo: string }
  | { ok: false; error: string }

/**
 * Normaliza y valida el correo del registro. Usa la misma validación que
 * «Quiero ser aliado» (forma entregable, sin dominios mal escritos ni
 * desechables). Validar la forma no prueba que el buzón exista: eso lo prueba
 * el correo de vinculación.
 */
export function correoParaRegistro(valor: string): ResultadoCorreoRegistro {
  const correo = normalizarCorreo(valor)
  const error = revisarCorreo(correo)
  if (error) return { ok: false, error }
  return { ok: true, correo }
}
