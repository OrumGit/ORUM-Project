/**
 * Las HORAS en que vale una promoción (`promociones.franjas_horarias`).
 *
 * Encargo del 28/10/2026: «si los descuentos aplican únicamente en horarios
 * fijos, que también se pueda poner». Una promoción puede valer todo el día
 * (sin franjas, como hasta ahora) o solo en ciertas franjas, y cada franja
 * lleva SUS días: «martes y miércoles de 8:00 a 9:30 a. m. y de 6:00 a 7:00
 * p. m.; sábados y domingos de 8:00 a 9:00 a. m.» son cuatro franjas.
 *
 * Con franjas, `dias_semana` se guarda como la UNIÓN de sus días, así lo que
 * ya sabía de días (la caja, el texto «Solo martes…») sigue diciendo la
 * verdad. Todo se evalúa en hora de Colombia, como el horario de las sedes;
 * la base repite la comprobación en `fn_validar_venta`.
 *
 * Una franja no cruza la medianoche: `desde` < `hasta`, las dos 'HH:MM'. Para
 * «hasta el cierre» se escribe 23:59.
 */
import { DIAS_SEMANA, diaDeSemanaISO, normalizarDias, textoDias } from './dias-promocion'
import { ahoraEnBogota, formatearHora, nombreDias, normalizarHora, rangoCompleto, textoRango } from './horario'

export type FranjaPromocion = { dias: number[]; desde: string; hasta: string }
export type FranjasPromocion = FranjaPromocion[] | null

/** Cuántas franjas admite una promoción: de sobra para dos turnos en dos grupos de días. */
export const MAX_FRANJAS = 6

const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/* ------------------------------- leer y validar ---------------------------- */

/**
 * Lee lo que viene de la base o del formulario —JSON en texto, o ya
 * deserializado— y lo deja en su forma guardada: días ordenados, horas
 * 'HH:MM', franjas ordenadas por día y hora. Nada válido → `null` («todo el
 * día»). No valida el orden de las horas: eso lo dice `validarFranjas`.
 */
export function normalizarFranjas(crudo: unknown): FranjasPromocion {
  let valor = crudo
  if (typeof valor === 'string') {
    if (valor.trim() === '') return null
    try {
      valor = JSON.parse(valor)
    } catch {
      return null
    }
  }
  if (!Array.isArray(valor)) return null
  const franjas: FranjaPromocion[] = []
  for (const f of valor) {
    if (!f || typeof f !== 'object') continue
    const { dias, desde, hasta } = f as Record<string, unknown>
    // Una lista de días vacía es un descuido, no «todos»: se conserva vacía
    // para que `validarFranjas` lo diga.
    const listaDias = Array.isArray(dias)
      ? [...new Set(dias.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort(
          (x, y) => x - y,
        )
      : null
    const d = normalizarHora(typeof desde === 'string' ? desde : null)
    const h = normalizarHora(typeof hasta === 'string' ? hasta : null)
    if (listaDias === null || d === null || h === null) continue
    franjas.push({ dias: listaDias, desde: d, hasta: h })
  }
  if (franjas.length === 0) return null
  return franjas.sort((a, b) => (a.dias[0] ?? 0) - (b.dias[0] ?? 0) || a.desde.localeCompare(b.desde))
}

/** El primer error, en palabras, o `null` si las franjas valen. */
export function validarFranjas(franjas: FranjasPromocion): string | null {
  if (!franjas) return null
  if (franjas.length > MAX_FRANJAS) return `Una promoción admite como máximo ${MAX_FRANJAS} franjas horarias.`
  for (const f of franjas) {
    if (f.dias.length === 0) return 'Marca al menos un día en cada horario.'
    if (aMinutos(f.hasta) <= aMinutos(f.desde)) {
      return `La hora final debe ser después de la inicial (${formatearHora(f.desde)} a ${formatearHora(f.hasta)}). Para «hasta el cierre», usa 11:59 p. m.`
    }
  }
  // Dos franjas del mismo día que se pisan confunden al socio y al cajero.
  for (let i = 0; i < franjas.length; i++) {
    for (let j = i + 1; j < franjas.length; j++) {
      const a = franjas[i]
      const b = franjas[j]
      const comparten = a.dias.some((d) => b.dias.includes(d))
      const sePisan = aMinutos(a.desde) < aMinutos(b.hasta) && aMinutos(b.desde) < aMinutos(a.hasta)
      if (comparten && sePisan) {
        return `Dos horarios se cruzan el mismo día (${formatearHora(a.desde)} a ${formatearHora(a.hasta)} y ${formatearHora(b.desde)} a ${formatearHora(b.hasta)}). Únelos en uno.`
      }
    }
  }
  return null
}

/** Lo que manda el formulario (el JSON del campo oculto `franjas_horarias`). */
export function leerFranjasDelFormulario(
  texto: string,
): { ok: true; valor: FranjasPromocion } | { ok: false; error: string } {
  const valor = normalizarFranjas(texto)
  const error = validarFranjas(valor)
  return error ? { ok: false, error } : { ok: true, valor }
}

/** Los días de todas las franjas juntas: lo que se guarda en `dias_semana`. */
export function diasDeFranjas(franjas: FranjasPromocion): number[] | null {
  if (!franjas) return null
  return normalizarDias(franjas.flatMap((f) => f.dias))
}

/* ---------------------------------- ahora ---------------------------------- */

export type EstadoPromocion =
  /** Vale ahora mismo; `hasta` = cuándo deja de valer hoy (`null` = todo el día). */
  | { tipo: 'aplica'; hasta: string | null }
  /** Hoy vale, más tarde: `desde`. */
  | { tipo: 'mas_tarde'; desde: string }
  /** Hoy ya no vale (pasó su última franja) o hoy no le toca. */
  | { tipo: 'hoy_no' }

/**
 * ¿Vale la promoción en este instante (hora de Colombia)? `dias` es
 * `dias_semana`; con franjas, mandan las franjas.
 */
export function estadoPromocion(
  dias: number[] | null | undefined,
  franjas: FranjasPromocion | undefined,
  instante: Date,
): EstadoPromocion {
  const { fecha, minutos } = ahoraEnBogota(instante)
  const hoy = diaDeSemanaISO(fecha)
  if (!franjas || franjas.length === 0) {
    const lista = normalizarDias(dias)
    return !lista || lista.includes(hoy) ? { tipo: 'aplica', hasta: null } : { tipo: 'hoy_no' }
  }
  const deHoy = franjas
    .filter((f) => f.dias.includes(hoy))
    .sort((a, b) => a.desde.localeCompare(b.desde))
  const actual = deHoy.find((f) => aMinutos(f.desde) <= minutos && minutos < aMinutos(f.hasta))
  if (actual) return { tipo: 'aplica', hasta: actual.hasta }
  const siguiente = deHoy.find((f) => aMinutos(f.desde) > minutos)
  return siguiente ? { tipo: 'mas_tarde', desde: siguiente.desde } : { tipo: 'hoy_no' }
}

/** ¿Se puede cobrar ahora? (la caja y la acción de la venta). */
export function aplicaAhora(
  dias: number[] | null | undefined,
  franjas: FranjasPromocion | undefined,
  instante: Date,
): boolean {
  return estadoPromocion(dias, franjas, instante).tipo === 'aplica'
}

/* ---------------------------------- texto ---------------------------------- */

/** «Mar y mié», «Lun a vie», «Sáb y dom», «Todos los días». */
export function textoDiasCorto(dias: readonly number[]): string {
  const lista = normalizarDias([...dias])
  if (!lista) return 'Todos los días'
  const corto = (n: number) => DIAS_SEMANA[n - 1].corto
  const seguidos = lista.every((d, i) => i === 0 || d === lista[i - 1] + 1)
  if (seguidos && lista.length >= 3) return `${corto(lista[0])} a ${corto(lista[lista.length - 1]).toLowerCase()}`
  const nombres = lista.map((d, i) => (i === 0 ? corto(d) : corto(d).toLowerCase()))
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

export { textoRango }

/**
 * Las franjas agrupadas por días, una línea por grupo: «Mar y mié · 8:00 –
 * 9:30 a. m. y 6:00 – 7:00 p. m.». Vacío si vale todo el día.
 */
export function lineasFranjas(franjas: FranjasPromocion | undefined): string[] {
  if (!franjas || franjas.length === 0) return []
  const grupos = new Map<string, FranjaPromocion[]>()
  for (const f of franjas) {
    const clave = f.dias.join(',')
    grupos.set(clave, [...(grupos.get(clave) ?? []), f])
  }
  return [...grupos.values()].map((lista) => {
    const rangos = lista
      .sort((a, b) => a.desde.localeCompare(b.desde))
      .map((f) => (esTodoElDia(f) ? 'todo el día' : textoRango(f.desde, f.hasta)))
    const unidos = rangos.length === 1 ? rangos[0] : `${rangos.slice(0, -1).join(', ')} y ${rangos[rangos.length - 1]}`
    return `${textoDiasCorto(lista[0].dias)} · ${unidos}`
  })
}

/**
 * Cuándo vale, en una línea: las franjas si las tiene («Mar y mié · 8:00 –
 * 9:30 a. m.; Sáb y dom · …»); si no, los días («Solo martes»); `null` si
 * vale siempre.
 */
export function cuandoAplica(
  dias: number[] | null | undefined,
  franjas: FranjasPromocion | undefined,
): string | null {
  const lineas = lineasFranjas(franjas)
  return lineas.length > 0 ? lineas.join('; ') : textoDias(dias)
}

/** «aplica hasta las 9:30 a. m.», «a la 1:00 p. m.» … */
function aLas(hhmm: string): string {
  return `${Number(hhmm.slice(0, 2)) % 12 === 1 ? 'a la' : 'a las'} ${formatearHora(hhmm)}`
}

/** Una franja de 00:00 a 23:59 es «todo el día» (así la guarda el editor). */
export const esTodoElDia = (f: { desde: string; hasta: string }) => f.desde === '00:00' && f.hasta === '23:59'

export type GrupoUso = { dias: string; horas: string[] }

/**
 * CUÁNDO SE PUEDE USAR, para que el socio lo lea sin descifrar (29/10/2026):
 * un renglón por grupo de días, con los días ENTEROS y las horas COMPLETAS.
 *   [{ dias: 'Martes y miércoles', horas: ['8:00 a. m. – 9:30 a. m.', '6:00 p. m. – 7:00 p. m.'] },
 *    { dias: 'Sábado y domingo', horas: ['Todo el día'] }]
 */
export function cuandoUsarlo(
  dias: number[] | null | undefined,
  franjas: FranjasPromocion | undefined,
): GrupoUso[] {
  if (!franjas || franjas.length === 0) {
    const lista = normalizarDias(dias)
    return [{ dias: lista ? nombreDias(lista) : 'Todos los días', horas: ['Todo el día'] }]
  }
  const grupos = new Map<string, FranjaPromocion[]>()
  for (const f of franjas) {
    const clave = f.dias.join(',')
    grupos.set(clave, [...(grupos.get(clave) ?? []), f])
  }
  return [...grupos.values()]
    .sort((a, b) => a[0].dias[0] - b[0].dias[0])
    .map((lista) => ({
      dias: nombreDias(lista[0].dias),
      horas: lista
        .sort((a, b) => a.desde.localeCompare(b.desde))
        .map((f) => (esTodoElDia(f) ? 'Todo el día' : rangoCompleto(f.desde, f.hasta))),
    }))
}

/** Lo que ve el SOCIO sobre si puede usarlo ahora, en palabras de socio. */
export function textoDisponibilidad(estado: EstadoPromocion): string {
  if (estado.tipo === 'aplica') {
    return estado.hasta && estado.hasta !== '23:59'
      ? `Puedes usarlo ahora, hasta ${aLas(estado.hasta).replace(/^a /, '')}`
      : 'Puedes usarlo hoy'
  }
  if (estado.tipo === 'mas_tarde') return `Hoy podrás usarlo desde ${aLas(estado.desde).replace(/^a /, '')}`
  return 'Hoy no está disponible'
}

/** La línea de estado para el cajero. */
export function textoEstadoPromocion(estado: EstadoPromocion): string {
  if (estado.tipo === 'aplica') return estado.hasta ? `Aplica ahora · hasta ${aLas(estado.hasta).replace(/^a /, '')}` : 'Aplica hoy'
  if (estado.tipo === 'mas_tarde') return `Hoy aplica desde ${aLas(estado.desde).replace(/^a /, '')}`
  return 'Hoy no aplica'
}
