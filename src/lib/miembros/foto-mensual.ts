/*
  LA FOTO DEL SOCIO, UNA VEZ AL MES  ·  29/10/2026
  ---------------------------------------------------------------------------
  Encargo del cliente: «que el socio pueda subir o cambiar su foto UNA vez al
  mes, y eliminarla cuando quiera; pero si la puso y la eliminó en el mismo
  mes, no puede volver a subirla».

  El mes es el del CALENDARIO, en hora de Colombia (UTC−5 todo el año, sin
  horario de verano): quien la cambió el 30 de octubre puede volver a hacerlo
  el 1 de noviembre. Lo que cuenta es SUBIR una foto; quitarla no gasta el
  cambio, pero tampoco lo devuelve. Los cambios del panel (administrador o
  empleado) no cuentan: la regla es solo para el socio.
*/

const DESFASE_BOGOTA_MS = 5 * 60 * 60 * 1000

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function mesBogota(ahora: Date): { anio: number; mes: number } {
  const local = new Date(ahora.getTime() - DESFASE_BOGOTA_MS)
  return { anio: local.getUTCFullYear(), mes: local.getUTCMonth() }
}

/** El primer instante del mes en curso, en hora de Colombia. */
export function inicioMesBogota(ahora: Date): Date {
  const { anio, mes } = mesBogota(ahora)
  return new Date(Date.UTC(anio, mes, 1) + DESFASE_BOGOTA_MS)
}

/** El primer instante del mes siguiente, en hora de Colombia. */
export function inicioMesSiguienteBogota(ahora: Date): Date {
  const { anio, mes } = mesBogota(ahora)
  return new Date(Date.UTC(anio, mes + 1, 1) + DESFASE_BOGOTA_MS)
}

/** Si el socio puede subir una foto ahora, sabiendo cuándo subió la última. */
export function puedeCambiarFoto(ultimoCambio: Date | string | null, ahora: Date): boolean {
  if (!ultimoCambio) return true
  const instante = new Date(ultimoCambio)
  if (Number.isNaN(instante.getTime())) return true
  return instante.getTime() < inicioMesBogota(ahora).getTime()
}

/** «el 1 de noviembre»: cuándo vuelve a poder cambiarla. */
export function textoProximoCambio(ahora: Date): string {
  const { mes } = mesBogota(inicioMesSiguienteBogota(ahora))
  return `el 1 de ${MESES[mes]}`
}
