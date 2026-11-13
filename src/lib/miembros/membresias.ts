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
 * @param venceAt   `membresias.vence_at` (solo las cortesías por HORAS, ver
 *                  `cortesia.ts`): si lo hay, vence en ese instante exacto y
 *                  no al final del día.
 * @param ahora     El instante actual, para comparar con `venceAt`.
 */
export function derivarEstadoMembresia(
  estado: EstadoMembresia,
  fechaFin: string,
  hoy: string,
  venceAt: string | null = null,
  ahora: Date = new Date(),
): EstadoDerivado {
  // Las decisiones administrativas mandan sobre cualquier fecha: una membresía
  // cancelada no revive porque le queden días pagados.
  if (estado === 'cancelada' || estado === 'suspendida') {
    return { activa: false, motivo: estado }
  }

  // Una cortesía por horas vence en su instante, aunque su día no haya acabado.
  if (venceAt && new Date(venceAt).getTime() <= ahora.getTime()) {
    return { activa: false, motivo: 'vencida' }
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

/**
 * `vence_at` de una fila de `membresias` leída con `select('*')`: la columna
 * solo existe con la migración `20261112120000_cortesia_por_horas.sql`, y sin
 * ella la fila no la trae. Nunca lanza.
 */
export function venceAtDe(fila: object | null | undefined): string | null {
  if (!fila || !('vence_at' in fila)) return null
  const valor = (fila as { vence_at?: unknown }).vence_at
  return typeof valor === 'string' && valor !== '' ? valor : null
}

/**
 * Día en que empieza una renovación, a partir de la membresía ACTIVA más
 * reciente (o `null`). Es `calcularFechaInicioRenovacion` con una excepción:
 * una cortesía por HORAS no guarda días por delante, así que no se empieza
 * al día siguiente de su `fecha_fin` (dejaría un hueco entre la hora en que
 * vence y la medianoche): se empieza hoy.
 */
export function inicioDeRenovacion(hoy: string, vigente: { fecha_fin: string } | null): string {
  const finVigente = vigente && !venceAtDe(vigente) ? vigente.fecha_fin : null
  return calcularFechaInicioRenovacion(hoy, finVigente)
}
