/*
  LAS GRÁFICAS DE MÉTRICAS  ·  lo que se dibuja (29/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «gráficas simples para que el administrador pueda
  ver gráficamente todos los datos». Puro y probado; los componentes solo
  pintan lo que sale de aquí.

    · `serieVentas` — las ventas del periodo por DÍA (hasta 45 días) o por
      SEMANA (más largo: 90 columnas no se leen), con los días sin ventas en
      cero para que el hueco se vea. Fecha de Colombia, siempre.
    · `primerosYOtros` — las barras de un ranking: las N primeras y el resto
      sumado en «Otros», para que una barra número 30 no se pierda.
*/

const DESFASE_BOGOTA_MS = 5 * 60 * 60 * 1000
const DIA_MS = 24 * 60 * 60 * 1000
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

/** A partir de cuántos días se agrupa por semana. */
export const DIAS_MAXIMOS_POR_DIA = 45

/** El día civil de Colombia de un instante ('YYYY-MM-DD'). */
export function diaBogota(instante: string): string {
  return new Date(Date.parse(instante) - DESFASE_BOGOTA_MS).toISOString().slice(0, 10)
}

const aMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** «14 oct». */
export function etiquetaDia(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES[m - 1]}`
}

export type PuntoSerie = {
  /** 'YYYY-MM-DD' del día (o del lunes de la semana). */
  clave: string
  etiqueta: string
  cantidad: number
  monto: number
}

export type SerieVentas = { unidad: 'dia' | 'semana'; puntos: PuntoSerie[] }

export function serieVentas(
  ventas: { fecha_hora: string; valor_final: number }[],
  desde: string,
  hasta: string,
): SerieVentas {
  const inicio = aMs(desde)
  const fin = aMs(hasta)
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin < inicio) return { unidad: 'dia', puntos: [] }

  const dias = Math.round((fin - inicio) / DIA_MS) + 1
  const unidad = dias > DIAS_MAXIMOS_POR_DIA ? 'semana' : 'dia'

  /* La clave de un día: él mismo, o el lunes de su semana (getUTCDay: 0 = domingo). */
  const claveDe = (iso: string) => {
    if (unidad === 'dia') return iso
    const ms = aMs(iso)
    const desdeLunes = (new Date(ms).getUTCDay() + 6) % 7
    return aIso(Math.max(inicio, ms - desdeLunes * DIA_MS))
  }

  const puntos = new Map<string, PuntoSerie>()
  for (let ms = inicio; ms <= fin; ms += DIA_MS) {
    const clave = claveDe(aIso(ms))
    if (!puntos.has(clave)) {
      puntos.set(clave, {
        clave,
        etiqueta: unidad === 'dia' ? etiquetaDia(clave) : `Semana del ${etiquetaDia(clave)}`,
        cantidad: 0,
        monto: 0,
      })
    }
  }

  for (const v of ventas) {
    const dia = diaBogota(v.fecha_hora)
    if (dia < desde || dia > hasta) continue
    const p = puntos.get(claveDe(dia))
    if (!p) continue
    p.cantidad += 1
    p.monto += v.valor_final
  }

  return { unidad, puntos: [...puntos.values()] }
}

export type Barra = { clave: string; etiqueta: string; valor: number; nota?: string }

/** Las `n` primeras (ya ordenadas de mayor a menor) y el resto sumado en «Otros». */
export function primerosYOtros(barras: Barra[], n = 8): Barra[] {
  const orden = [...barras].sort((a, b) => b.valor - a.valor)
  if (orden.length <= n) return orden
  const resto = orden.slice(n - 1)
  return [
    ...orden.slice(0, n - 1),
    {
      clave: 'otros',
      etiqueta: `Otros (${resto.length})`,
      valor: resto.reduce((s, b) => s + b.valor, 0),
    },
  ]
}
