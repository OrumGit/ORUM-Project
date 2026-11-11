// Fechas civiles (YYYY-MM-DD) para la gracia de un cobro rechazado.
//
// Reglas del proyecto: las fechas civiles se construyen con Date.UTC y se
// formatean en UTC. Leerlas en Bogotá (UTC−5) las retrasa un día.

export const DIAS_GRACIA = 3

const PATRON_YMD = /^(\d{4})-(\d{2})-(\d{2})$/

function aDate(ymd: string): Date {
  const m = PATRON_YMD.exec(ymd)
  if (!m) throw new Error(`Fecha civil inválida: ${ymd}`)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

function aYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mes}-${dia}`
}

/** Suma días a una fecha civil. */
export function sumarDiasCivil(ymd: string, dias: number): string {
  const d = aDate(ymd)
  d.setUTCDate(d.getUTCDate() + dias)
  return aYmd(d)
}

/**
 * Fecha hasta la que el socio conserva acceso tras un cobro rechazado.
 * Criterio acordado: la gracia cuenta desde `fecha_fin` de la membresía
 * pagada (ya cubrió su periodo; la gracia cubre el cobro siguiente).
 */
export function graciaHasta(fechaFin: string, dias: number = DIAS_GRACIA): string {
  return sumarDiasCivil(fechaFin, dias)
}

/** La gracia ya venció si hoy es posterior al último día de gracia. */
export function graciaVencida(graciaHastaYmd: string, hoyYmd: string): boolean {
  return aDate(hoyYmd).getTime() > aDate(graciaHastaYmd).getTime()
}
