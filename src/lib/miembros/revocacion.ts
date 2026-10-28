/*
  REVOCAR UNA MEMBRESÍA  ·  29/10/2026
  ---------------------------------------------------------------------------
  Encargo del propietario: «que el administrador pueda revocar membresías».
  Revocar deja la membresía VIGENTE en `cancelada` —el valor que el esquema
  ya tenía y que `derivarEstadoMembresia` ya trata como decisión
  administrativa: «una membresía cancelada no revive porque le queden días
  pagados»—. No borra nada: el historial y el pago siguen ahí, y renovar
  crea una membresía nueva desde hoy.

  Siempre con un MOTIVO de esta lista (y, con «Otro», una nota que lo
  explique): queda en la bitácora del miembro. Lógica pura y probada; el
  servidor es quien decide.
*/

export const MOTIVOS_REVOCACION = [
  'pago_no_recibido',
  'uso_indebido',
  'solicitud_miembro',
  'error_registro',
  'otro',
] as const

export type MotivoRevocacion = (typeof MOTIVOS_REVOCACION)[number]

export const ETIQUETA_MOTIVO_REVOCACION: Record<MotivoRevocacion, string> = {
  pago_no_recibido: 'El pago no se recibió o se reversó',
  uso_indebido: 'Uso indebido del carnet',
  solicitud_miembro: 'Lo pidió el miembro',
  error_registro: 'Se registró por error',
  otro: 'Otro motivo',
}

export const NOTA_REVOCACION_MAXIMA = 300

export function esMotivoRevocacion(valor: unknown): valor is MotivoRevocacion {
  return typeof valor === 'string' && (MOTIVOS_REVOCACION as readonly string[]).includes(valor)
}

export type RevisionRevocacion =
  | { ok: true; motivo: MotivoRevocacion; nota: string | null }
  | { ok: false; campo: 'motivo' | 'nota'; error: string }

/** El motivo, obligatorio; la nota, opcional salvo con «Otro motivo». */
export function revisarRevocacion(motivo: unknown, nota: unknown): RevisionRevocacion {
  if (!esMotivoRevocacion(motivo)) {
    return { ok: false, campo: 'motivo', error: 'Elige el motivo por el que se revoca.' }
  }
  const texto = typeof nota === 'string' ? nota.trim() : ''
  if (motivo === 'otro' && texto.length === 0) {
    return { ok: false, campo: 'nota', error: 'Cuenta en una línea por qué se revoca.' }
  }
  if (texto.length > NOTA_REVOCACION_MAXIMA) {
    return {
      ok: false,
      campo: 'nota',
      error: `La nota no puede pasar de ${NOTA_REVOCACION_MAXIMA} caracteres.`,
    }
  }
  return { ok: true, motivo, nota: texto || null }
}

/** «Membresía revocada — Uso indebido del carnet: …» (bitácora). */
export function resumirRevocacion(motivo: unknown, nota: unknown): string {
  const etiqueta = esMotivoRevocacion(motivo) ? ETIQUETA_MOTIVO_REVOCACION[motivo] : 'sin motivo'
  const detalle = typeof nota === 'string' && nota.trim() ? `: ${nota.trim()}` : ''
  return `Membresía revocada — ${etiqueta}${detalle}`
}
