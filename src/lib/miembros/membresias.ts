/*
  Aquí vivía `generarNumeroMembresia`, que fabricaba el número al vuelo (4
  dígitos secuenciales + 4 aleatorios) durante el alta. Se retiró: ahora el
  número sale del pozo de números de registro que el administrador precarga por
  rango (ver `numeros-registro.ts` y `/OrumAdminLogin/miembros/numeros`). Si el pozo está
  vacío, el alta se bloquea; no se vuelve a inventar ninguno.
*/

/** Suma `dias` a una fecha 'YYYY-MM-DD' y devuelve 'YYYY-MM-DD'. */
function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  base.setUTCDate(base.getUTCDate() + dias)
  return base.toISOString().slice(0, 10)
}

/**
 * Suma `duracionMeses` a `fechaInicio` ('YYYY-MM-DD'). Si el día no existe en el
 * mes destino (p. ej. 31 de enero + 1 mes), ajusta al último día de ese mes.
 */
export function calcularFechaFin(fechaInicio: string, duracionMeses: number): string {
  const [y, m, d] = fechaInicio.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  const objetivo = new Date(base)
  objetivo.setUTCMonth(objetivo.getUTCMonth() + duracionMeses)
  // Si el día se desbordó a otro mes, retroceder al último día del mes correcto.
  if (objetivo.getUTCDate() < d) {
    objetivo.setUTCDate(0)
  }
  return objetivo.toISOString().slice(0, 10)
}

/**
 * Fecha de inicio de una renovación: el día siguiente al fin de la membresía
 * vigente si aún no ha vencido (para no perder días pagados); si ya venció o no
 * hay anterior, empieza hoy. Todas las fechas en 'YYYY-MM-DD'.
 */
export function calcularFechaInicioRenovacion(hoy: string, finVigente: string | null): string {
  if (finVigente && finVigente >= hoy) {
    return sumarDias(finVigente, 1)
  }
  return hoy
}

/** Valores del enum `estado_membresia` en la base de datos. */
export type EstadoMembresia = 'activa' | 'vencida' | 'cancelada' | 'suspendida'

/** Motivo por el que una membresía no está activa. */
export type MotivoInactiva = 'vencida' | 'cancelada' | 'suspendida'

/**
 * Estado real de una membresía, ya resuelto.
 *
 * De cara al usuario el eje es BINARIO —activa o inactiva, según el pago—; el
 * motivo es un dato secundario, no otro color de badge.
 */
export type EstadoDerivado =
  | { activa: true; diasRestantes: number }
  | { activa: false; motivo: MotivoInactiva }

/** Días completos entre dos fechas 'YYYY-MM-DD' (negativo si `hasta` ya pasó). */
function diasEntre(desde: string, hasta: string): number {
  const [ay, am, ad] = desde.split('-').map(Number)
  const [by, bm, bd] = hasta.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Deriva el estado real de una membresía.
 *
 * POR QUÉ EXISTE: `membresias.estado` es una columna almacenada con default
 * `'activa'` y NADA la cambia a `'vencida'` al pasar `fecha_fin`. Si la
 * interfaz confiara en ella, mostraría "Activa" en verde a un miembro que
 * lleva meses sin pagar — y un empleado decidiría sobre ese badge.
 *
 * MODELO: `estado` guarda la INTENCIÓN ADMINISTRATIVA (cancelar o suspender
 * son decisiones humanas); la VIGENCIA siempre se deriva de `fecha_fin`. Así
 * no se depende de un cron que puede fallar o retrasarse.
 *
 * @param estado    Valor de `membresias.estado`.
 * @param fechaFin  `membresias.fecha_fin` en 'YYYY-MM-DD'.
 * @param hoy       Fecha actual en 'YYYY-MM-DD'.
 */
export function derivarEstadoMembresia(
  estado: EstadoMembresia,
  fechaFin: string,
  hoy: string,
): EstadoDerivado {
  // Las decisiones administrativas mandan sobre cualquier fecha: una membresía
  // cancelada no revive porque le queden días pagados.
  if (estado === 'cancelada' || estado === 'suspendida') {
    return { activa: false, motivo: estado }
  }

  const diasRestantes = diasEntre(hoy, fechaFin)

  // Vence HOY todavía cuenta como activa: el miembro pagó por el día completo.
  if (estado === 'activa' && diasRestantes >= 0) {
    return { activa: true, diasRestantes }
  }

  return { activa: false, motivo: 'vencida' }
}

/*
  NOTA DE PRODUCTO (2026-08-09)
  -----------------------------
  ORUM vende UN solo servicio: la membresía mensual. No hay niveles.

  Aquí vivía `esPlanDestacado`, una heurística por nombre que marcaba los
  planes "Oro"/"Premium" con un distintivo dorado. Se eliminó junto con el
  componente `PlanTierBadge`: con un único producto, una etiqueta de nivel
  muestra el mismo valor en todas las filas, y una columna que siempre dice
  lo mismo no informa de nada.

  Si algún día se venden varios niveles, la solución correcta NO es recuperar
  la heurística sino añadir una columna real `planes_membresia.destacado`.
*/

/** Umbral por defecto para avisar de una renovación próxima. */
export const DIAS_AVISO_VENCIMIENTO = 30

/** ¿Conviene ofrecer la renovación? Solo aplica a membresías activas. */
export function venceProximamente(
  derivado: EstadoDerivado,
  umbral: number = DIAS_AVISO_VENCIMIENTO,
): boolean {
  return derivado.activa && derivado.diasRestantes <= umbral
}

/** Cómo se ve una membresía en el historial de la ficha. */
export type EstadoEnHistorial = { futura: true; desde: string } | { futura: false; estado: EstadoDerivado }

/**
 * El estado de una membresía EN EL HISTORIAL de la ficha (12/11/2026).
 *
 * Renovar —o añadir días de cortesía— pasa la anterior a `'vencida'` en el
 * acto, porque la base admite UNA sola `'activa'` por miembro
 * (`uq_membresia_activa`); la nueva empieza cuando la anterior termina. Así
 * que `'vencida'` ahí no quiere decir «se acabó»: quiere decir «ya tiene
 * quien la siga». Mientras su `fecha_fin` no pase y quien la sigue esté
 * activa, el mes pagado sigue corriendo y se enseña como activo.
 *
 * Y la que empieza más adelante (la cortesía que va tras el plan) se enseña
 * como «Empieza el …», no como activa.
 *
 * @param sucesorActivo ¿Hay una membresía ACTIVA que la sigue
 *                      (`membresia_anterior_id` = esta)? Si la siguiente se
 *                      revocó, esta no revive.
 */
export function estadoEnHistorial(
  m: { estado: EstadoMembresia; fecha_inicio: string; fecha_fin: string },
  hoy: string,
  sucesorActivo: boolean,
): EstadoEnHistorial {
  if (m.estado === 'activa' && m.fecha_inicio > hoy) return { futura: true, desde: m.fecha_inicio }
  const estado = m.estado === 'vencida' && sucesorActivo ? 'activa' : m.estado
  return { futura: false, estado: derivarEstadoMembresia(estado, m.fecha_fin, hoy) }
}
