/**
 * Horario de atención de una sucursal (`sucursal_horarios`).
 *
 * Una fila por día: 1 = lunes … 7 = domingo (numeración ISO, la de
 * `dias-promocion.ts`) y 8 = festivos. `abre`/`cierra` en 'HH:MM' de 24 h;
 * `abre null` es «cerrado» (distinto de no tener fila). Un cierre menor o
 * igual a la apertura es «pasada la medianoche». Sin ninguna fila = «sin
 * horario cargado» y las fichas no dicen nada.
 *
 * TODO se evalúa en hora de Colombia (UTC−5, sin horario de verano): ni la del
 * navegador ni la del servidor cuentan.
 */
import { DIAS_SEMANA, diaDeSemanaISO } from './dias-promocion'
import { esFestivoColombia } from './festivos-colombia'

export const DIA_FESTIVOS = 8

export type DiaHorario = {
  dia: number
  abre: string | null
  cierra: string | null
  almuerzoDesde: string | null
  almuerzoHasta: string | null
}

export type HorarioSucursal = DiaHorario[]

const MIN_DIA = 1440
const DESFASE_BOGOTA_MS = 5 * 3_600_000

/* ---------------------------------- horas --------------------------------- */

const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/

/** '08:00:00' → '08:00'; lo que no es una hora → `null`. */
export function normalizarHora(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null
  const m = PATRON_HORA.exec(valor.trim())
  return m ? `${m[1]}:${m[2]}` : null
}

function aMinutos(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
}

function deMinutos(min: number): string {
  const m = ((min % MIN_DIA) + MIN_DIA) % MIN_DIA
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** '18:00' → '6:00 p. m.' */
export function formatearHora(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2))
  const resto = hhmm.slice(2, 5)
  return `${h % 12 || 12}${resto} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

/**
 * Para PINTAR un texto con horas: que «9:30 a. m.» no se parta en dos líneas
 * («9:30 a.» / «m.») ni un rango («8:00 – 9:30 a. m.») quede partido: se
 * corta entre rangos, no dentro de uno. Espacios de no separación donde cortar se lee mal; los textos
 * de las funciones siguen con espacios normales (las pruebas los comparan).
 */
export function sinCortarHoras(texto: string): string {
  return texto.replace(/ ([ap])\. m\./g, '\u00a0$1.\u00a0m.').replace(/ – /g, '\u00a0–\u00a0')
}

/** «8:00 – 9:30 a. m.» si comparten mitad del día; si no, «11:00 a. m. – 2:00 p. m.». */
export function textoRango(desde: string, hasta: string): string {
  const d = formatearHora(desde)
  const h = formatearHora(hasta)
  const sufijo = (t: string) => t.slice(t.indexOf(' '))
  return sufijo(d) === sufijo(h) ? `${d.slice(0, d.indexOf(' '))} – ${h}` : `${d} – ${h}`
}

/* -------------------------------- validación ------------------------------- */

function nombreDia(n: number): string {
  return n === DIA_FESTIVOS ? 'festivos' : (DIAS_SEMANA[n - 1]?.largo ?? `día ${n}`)
}

/**
 * Intervalo de la jornada y del almuerzo en minutos desde las 00:00 del día de
 * apertura. Pasada la medianoche, los valores superan 1440.
 */
function intervalos(f: DiaHorario): {
  abre: number
  cierra: number
  almuerzo: [number, number] | null
} | null {
  if (f.abre === null || f.cierra === null) return null
  const abre = aMinutos(f.abre)
  let cierra = aMinutos(f.cierra)
  if (cierra <= abre) cierra += MIN_DIA

  let almuerzo: [number, number] | null = null
  if (f.almuerzoDesde !== null && f.almuerzoHasta !== null) {
    let desde = aMinutos(f.almuerzoDesde)
    if (desde < abre) desde += MIN_DIA
    let hasta = aMinutos(f.almuerzoHasta)
    while (hasta <= desde) hasta += MIN_DIA
    almuerzo = [desde, hasta]
  }
  return { abre, cierra, almuerzo }
}

/** El primer error del horario, en español, o `null` si está bien. */
export function validarHorario(filas: readonly DiaHorario[]): string | null {
  const vistos = new Set<number>()
  for (const f of filas) {
    if (!Number.isInteger(f.dia) || f.dia < 1 || f.dia > DIA_FESTIVOS) {
      return 'Hay un día del horario que no existe.'
    }
    if (vistos.has(f.dia)) return `El horario repite ${nombreDia(f.dia)}.`
    vistos.add(f.dia)

    const nombre = nombreDia(f.dia)
    const horas = [f.abre, f.cierra, f.almuerzoDesde, f.almuerzoHasta]
    if (horas.some((h) => h !== null && normalizarHora(h) !== h)) {
      return `Revisa las horas de ${nombre}: deben ser como 09:00.`
    }
    if ((f.abre === null) !== (f.cierra === null)) {
      return `En ${nombre} falta la hora de apertura o la de cierre.`
    }
    if (f.abre !== null && f.abre === f.cierra) {
      return `En ${nombre} la apertura y el cierre no pueden ser la misma hora.`
    }
    if ((f.almuerzoDesde === null) !== (f.almuerzoHasta === null)) {
      return `En ${nombre} el almuerzo necesita hora de inicio y de fin.`
    }
    if (f.almuerzoDesde !== null) {
      const iv = intervalos(f)
      if (!iv) return `En ${nombre} hay almuerzo pero el comercio está cerrado.`
      const [desde, hasta] = iv.almuerzo!
      if (desde < iv.abre || hasta > iv.cierra) {
        return `El almuerzo de ${nombre} debe quedar dentro del horario de atención.`
      }
    }
  }
  return null
}

/* ----------------------------- estado «ahora» ----------------------------- */

export type EstadoHorario = {
  tipo: 'abierto' | 'almuerzo' | 'cerrado' | 'sin_horario'
  /**
   * El siguiente cambio: cuándo ocurre (hoy, mañana o el día ISO 1–7), a qué
   * hora y QUÉ es (`cierra`, `almuerzo` = empieza la pausa, `reabre` = termina
   * la pausa, `abre`).
   */
  proximo: {
    cuando: 'hoy' | 'manana' | number
    hora: string
    accion: 'cierra' | 'almuerzo' | 'reabre' | 'abre'
  } | null
}

type Segmento = { desde: number; hasta: number; tipo: 'abierto' | 'almuerzo' }

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** La fila que rige una fecha civil: festivos si lo es y hay fila; si no, su día. */
function filaDe(horario: HorarioSucursal, fecha: string): DiaHorario | undefined {
  if (esFestivoColombia(fecha)) {
    const festivos = horario.find((f) => f.dia === DIA_FESTIVOS)
    if (festivos) return festivos
  }
  return horario.find((f) => f.dia === diaDeSemanaISO(fecha))
}

/** Los tramos del día, en minutos desde sus 00:00 (pueden pasar de 1440). */
function segmentosDe(horario: HorarioSucursal, fecha: string): Segmento[] {
  const fila = filaDe(horario, fecha)
  const iv = fila ? intervalos(fila) : null
  if (!iv) return []
  if (!iv.almuerzo) return [{ desde: iv.abre, hasta: iv.cierra, tipo: 'abierto' }]
  const [ad, ah] = iv.almuerzo
  return [
    { desde: iv.abre, hasta: ad, tipo: 'abierto' },
    { desde: ad, hasta: ah, tipo: 'almuerzo' },
    { desde: ah, hasta: iv.cierra, tipo: 'abierto' },
  ]
}

/** La fecha civil y los minutos desde las 00:00 en Bogotá (UTC−5) de un instante. */
export function ahoraEnBogota(instante: Date): { fecha: string; minutos: number } {
  const local = new Date(instante.getTime() - DESFASE_BOGOTA_MS)
  return {
    fecha: local.toISOString().slice(0, 10),
    minutos: local.getUTCHours() * 60 + local.getUTCMinutes(),
  }
}

export function estadoAhora(horario: HorarioSucursal, instante: Date): EstadoHorario {
  if (horario.length === 0) return { tipo: 'sin_horario', proximo: null }

  const { fecha: hoy, minutos: ahora } = ahoraEnBogota(instante)

  // Los tramos de hoy y los de ayer que se alargan pasada la medianoche.
  const tramos: Segmento[] = [
    ...segmentosDe(horario, sumarDias(hoy, -1)).map((s) => ({
      ...s,
      desde: s.desde - MIN_DIA,
      hasta: s.hasta - MIN_DIA,
    })),
    ...segmentosDe(horario, hoy),
  ]
  const actual = tramos.find((s) => s.desde <= ahora && ahora < s.hasta)
  if (actual) {
    const sigueAlmuerzo = tramos.some((s) => s.tipo === 'almuerzo' && s.desde === actual.hasta)
    return {
      tipo: actual.tipo,
      proximo: {
        cuando: actual.hasta < MIN_DIA ? 'hoy' : 'manana',
        hora: deMinutos(actual.hasta),
        accion: actual.tipo === 'almuerzo' ? 'reabre' : sigueAlmuerzo ? 'almuerzo' : 'cierra',
      },
    }
  }

  for (let d = 0; d <= 7; d++) {
    const fecha = sumarDias(hoy, d)
    const siguiente = segmentosDe(horario, fecha)
      .filter((s) => d > 0 || s.desde > ahora)
      .sort((a, b) => a.desde - b.desde)[0]
    if (siguiente) {
      return {
        tipo: 'cerrado',
        proximo: {
          cuando: d === 0 ? 'hoy' : d === 1 ? 'manana' : diaDeSemanaISO(fecha),
          hora: deMinutos(siguiente.desde),
          accion: 'abre',
        },
      }
    }
  }
  return { tipo: 'cerrado', proximo: null }
}

/* -------------------------------- resumen --------------------------------- */

export type GrupoHorario = { dias: number[]; fila: DiaHorario }

const mismaFila = (a: DiaHorario, b: DiaHorario) =>
  a.abre === b.abre &&
  a.cierra === b.cierra &&
  a.almuerzoDesde === b.almuerzoDesde &&
  a.almuerzoHasta === b.almuerzoHasta

/** Agrupa los días consecutivos con la misma jornada; aparte, los festivos. */
export function resumenHorario(horario: HorarioSucursal): {
  grupos: GrupoHorario[]
  festivos: DiaHorario | null
} {
  const semana = horario.filter((f) => f.dia >= 1 && f.dia <= 7).sort((a, b) => a.dia - b.dia)
  const grupos: GrupoHorario[] = []
  for (const fila of semana) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.dias[ultimo.dias.length - 1] === fila.dia - 1 && mismaFila(ultimo.fila, fila)) {
      ultimo.dias.push(fila.dia)
    } else {
      grupos.push({ dias: [fila.dia], fila })
    }
  }
  return { grupos, festivos: horario.find((f) => f.dia === DIA_FESTIVOS) ?? null }
}

/** 'Cerrado' o '9:00 a. m. – 6:00 p. m. · Almuerzo 12:00 p. m. – 1:00 p. m.' */
export function textoJornada(fila: DiaHorario): string {
  if (fila.abre === null || fila.cierra === null) return 'Cerrado'
  const base = `${formatearHora(fila.abre)} – ${formatearHora(fila.cierra)}`
  if (fila.almuerzoDesde === null || fila.almuerzoHasta === null) return base
  return `${base} · Almuerzo ${formatearHora(fila.almuerzoDesde)} – ${formatearHora(fila.almuerzoHasta)}`
}

/**
 * Las horas en que está ABIERTO, sin la palabra «almuerzo»: «8:00 – 11:00
 * a. m. y 3:30 – 10:00 p. m.». Lo que se lee de un vistazo es cuándo se puede
 * ir; el hueco del almuerzo queda a la vista entre los dos tramos.
 */
export function textoTramos(fila: DiaHorario): string {
  if (fila.abre === null || fila.cierra === null) return 'Cerrado'
  if (fila.almuerzoDesde === null || fila.almuerzoHasta === null) return textoRango(fila.abre, fila.cierra)
  return `${textoRango(fila.abre, fila.almuerzoDesde)} y ${textoRango(fila.almuerzoHasta, fila.cierra)}`
}

/* --------------------- para LEER: sin abreviar, sin restar -------------------
   29/10/2026, un probador: «no lo entiendo». Los días en corto («Lun a
   sáb»), las horas que comparten «a. m.» («8:00 – 11:00 a. m.») y el almuerzo
   escondido entre dos tramos obligaban a descifrar. Para la ficha, todo se
   dice entero. */

/** «Lunes a sábado», «Sábado y domingo», «Lunes, miércoles y viernes», «Domingo», «Todos los días». */
export function nombreDias(dias: readonly number[]): string {
  const lista = [...new Set(dias)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b)
  if (lista.length === 0) return ''
  if (lista.length === 7) return 'Todos los días'
  const largo = (n: number) => DIAS_SEMANA[n - 1].largo
  const seguidos = lista.every((d, i) => i === 0 || d === lista[i - 1] + 1)
  let texto: string
  if (lista.length === 1) texto = largo(lista[0])
  else if (seguidos && lista.length >= 3) texto = `${largo(lista[0])} a ${largo(lista[lista.length - 1])}`
  else texto = `${lista.slice(0, -1).map(largo).join(', ')} y ${largo(lista[lista.length - 1])}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** «8:00 a. m. – 11:00 a. m.»: las dos horas completas, sin compartir «a. m.». */
export function rangoCompleto(desde: string, hasta: string): string {
  return `${formatearHora(desde)} – ${formatearHora(hasta)}`
}

/**
 * Una jornada para leer: si está cerrado, los TURNOS en que está abierto
 * (uno, o dos con el almuerzo en medio) y la pausa dicha con palabras.
 */
export function jornadaLegible(fila: DiaHorario): {
  cerrado: boolean
  turnos: string[]
  pausa: string | null
} {
  if (fila.abre === null || fila.cierra === null) return { cerrado: true, turnos: [], pausa: null }
  if (fila.almuerzoDesde === null || fila.almuerzoHasta === null) {
    return { cerrado: false, turnos: [rangoCompleto(fila.abre, fila.cierra)], pausa: null }
  }
  return {
    cerrado: false,
    turnos: [rangoCompleto(fila.abre, fila.almuerzoDesde), rangoCompleto(fila.almuerzoHasta, fila.cierra)],
    pausa: `Cerrado por almuerzo de ${formatearHora(fila.almuerzoDesde)} a ${formatearHora(fila.almuerzoHasta)}`,
  }
}

/** «Lun a sáb», «Sáb y dom», «Dom»: los días de un grupo, en corto. */
export function etiquetaDias(dias: readonly number[]): string {
  const corto = (n: number) => DIAS_SEMANA[n - 1].corto
  const primero = dias[0]
  const ultimo = dias[dias.length - 1]
  if (dias.length === 1) return corto(primero)
  if (dias.length === 2) return `${corto(primero)} y ${corto(ultimo).toLowerCase()}`
  return `${corto(primero)} a ${corto(ultimo).toLowerCase()}`
}

/**
 * El estado de ahora en dos partes, para la ficha: el titular («Abierto
 * ahora», «Cerrado por almuerzo», «Cerrado») y el detalle («Cierra por
 * almuerzo a las 11:00 a. m.», «Abre mañana a las 8:00 a. m.»). `null` si no
 * hay horario cargado.
 */
export function partesEstado(estado: EstadoHorario): { titulo: string; detalle: string | null } | null {
  if (estado.tipo === 'sin_horario') return null
  const p = estado.proximo
  if (estado.tipo === 'abierto') {
    if (!p) return { titulo: 'Abierto ahora', detalle: null }
    const cuando = p.cuando === 'manana' ? ' mañana' : ''
    return {
      titulo: 'Abierto ahora',
      detalle:
        p.accion === 'almuerzo'
          ? `Cierra ${aLas(p.hora)} para almorzar`
          : `Cierra${cuando} ${aLas(p.hora)}`,
    }
  }
  if (estado.tipo === 'almuerzo') {
    return { titulo: 'Cerrado por almuerzo', detalle: p ? `Abre de nuevo ${aLas(p.hora)}` : null }
  }
  if (!p) return { titulo: 'Cerrado ahora', detalle: null }
  const cuando =
    p.cuando === 'hoy' ? 'hoy' : p.cuando === 'manana' ? 'mañana' : `el ${DIAS_SEMANA[p.cuando - 1].largo}`
  return { titulo: 'Cerrado ahora', detalle: `Abre ${cuando} ${aLas(p.hora)}` }
}

/** 'Lun–vie · 9:00 a. m. – 6:00 p. m.' */
export function textoGrupo(g: GrupoHorario): string {
  const corto = (n: number) => DIAS_SEMANA[n - 1].corto
  const primero = g.dias[0]
  const ultimo = g.dias[g.dias.length - 1]
  const dias =
    g.dias.length === 1 ? corto(primero) : `${corto(primero)}–${corto(ultimo).toLowerCase()}`
  return `${dias} · ${textoJornada(g.fila)}`
}

/** «a las 6:00 p. m.», pero «a la 1:00 p. m.». */
function aLas(hhmm: string): string {
  return `${Number(hhmm.slice(0, 2)) % 12 === 1 ? 'a la' : 'a las'} ${formatearHora(hhmm)}`
}

/**
 * La línea de estado de la ficha: «Abierto ahora · cierra a las 6:00 p. m.».
 * Vacía si la sucursal no tiene horario cargado.
 */
export function textoEstado(estado: EstadoHorario): string {
  if (estado.tipo === 'sin_horario') return ''
  const p = estado.proximo

  if (estado.tipo === 'abierto') {
    if (!p) return 'Abierto ahora'
    return p.accion === 'almuerzo'
      ? `Abierto ahora · pausa de almuerzo ${aLas(p.hora)}`
      : `Abierto ahora · cierra ${aLas(p.hora)}`
  }
  if (estado.tipo === 'almuerzo') {
    return p ? `En pausa de almuerzo · reabre ${aLas(p.hora)}` : 'En pausa de almuerzo'
  }
  if (!p) return 'Cerrado'
  const cuando =
    p.cuando === 'hoy' ? 'hoy' : p.cuando === 'manana' ? 'mañana' : `el ${DIAS_SEMANA[p.cuando - 1].largo}`
  return `Cerrado · abre ${cuando} ${aLas(p.hora)}`
}

/**
 * ¿Cabe este almuerzo dentro de esta jornada? Lo usa el editor para aplicar la
 * franja solo a los días donde entra, en vez de bloquear el guardado.
 */
export function almuerzoCabe(
  abre: string | null,
  cierra: string | null,
  desde: string | null,
  hasta: string | null,
): boolean {
  const horas = [abre, cierra, desde, hasta]
  if (horas.some((h) => h === null || normalizarHora(h) !== h)) return false
  const iv = intervalos({
    dia: 1,
    abre,
    cierra,
    almuerzoDesde: desde,
    almuerzoHasta: hasta,
  })
  if (!iv || !iv.almuerzo) return false
  return iv.almuerzo[0] >= iv.abre && iv.almuerzo[1] <= iv.cierra
}
