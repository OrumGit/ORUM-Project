/**
 * Recordatorio de vencimiento: decide si una membresía merece el correo de
 * «tu membresía vence pronto». Pura: la consulta y el envío están fuera.
 *
 * Con pago único el socio tiene que pagar a mano antes de vencer, así que el
 * aviso sale 5 días antes de `fecha_fin` (decisión del propietario, 25/11/2026).
 * Una sola vez por membresía: `recordatorio_enviado_at` lo marca.
 *
 * `fecha_fin` es una fecha civil ('YYYY-MM-DD'), no un instante: se resta en UTC
 * para no correr un día (ver CLAUDE.md, «Fechas»).
 */

export const DIAS_ANTES_RECORDATORIO = 5

/** Diferencia en días civiles entre dos fechas 'YYYY-MM-DD' (`hasta` − `desde`). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aDiaUtc(hasta) - aDiaUtc(desde)) / 86_400_000)
}

function aDiaUtc(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

export type MembresiaParaRecordar = {
  fecha_fin: string
  recordatorio_enviado_at: string | null
}

/**
 * Sí cuando faltan entre 1 y 5 días para el vencimiento y aún no se envió.
 * El día 0 (ya vence hoy) y lo ya vencido no reciben recordatorio: ese caso lo
 * cubre la pantalla de vencimiento, no un correo.
 */
export function debeRecordarVencimiento(
  membresia: MembresiaParaRecordar,
  hoy: string,
  dias: number = DIAS_ANTES_RECORDATORIO,
): boolean {
  if (membresia.recordatorio_enviado_at !== null) return false
  const restantes = diasEntre(hoy, membresia.fecha_fin)
  return restantes >= 1 && restantes <= dias
}
