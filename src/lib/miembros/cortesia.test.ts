import { describe, it, expect } from 'vitest'
import {
  calcularFinCortesia,
  faltaColumnaVenceAt,
  leerDuracionCortesia,
  textoVencimiento,
  MAXIMOS,
} from './cortesia'
import { derivarEstadoMembresia, inicioDeRenovacion, venceAtDe } from './membresias'
import { esMembresiaVigente } from './membresia-vigente'

// 12 nov 2026, 3:00 p. m. en Colombia (20:00 UTC).
const AHORA = new Date('2026-11-12T20:00:00Z')
const HOY = '2026-11-12'

describe('leer la duración de una cortesía', () => {
  it('sin unidad es la del plan, como antes', () => {
    expect(leerDuracionCortesia({}, HOY)).toEqual({ ok: true, duracion: { unidad: 'plan' } })
    expect(leerDuracionCortesia({ duracion: 'plan', cantidad: '9' }, HOY)).toEqual({
      ok: true,
      duracion: { unidad: 'plan' },
    })
  })

  it('lee horas, días, semanas y meses', () => {
    expect(leerDuracionCortesia({ duracion: 'horas', cantidad: '5' }, HOY)).toEqual({
      ok: true,
      duracion: { unidad: 'horas', cantidad: 5 },
    })
    expect(leerDuracionCortesia({ duracion: 'semanas', cantidad: ' 2 ' }, HOY)).toEqual({
      ok: true,
      duracion: { unidad: 'semanas', cantidad: 2 },
    })
  })

  it('rechaza cantidades vacías, con decimales, cero o por encima del tope', () => {
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: '' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: '1.5' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: '0' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'horas', cantidad: String(MAXIMOS.horas + 1) }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'meses', cantidad: String(MAXIMOS.meses) }, HOY).ok).toBe(true)
  })

  it('rechaza una unidad que no existe', () => {
    expect(leerDuracionCortesia({ duracion: 'siglos', cantidad: '1' }, HOY).ok).toBe(false)
  })

  it('la fecha del calendario: válida, no antes del inicio y no más de dos años', () => {
    expect(leerDuracionCortesia({ duracion: 'fecha', hasta: '2026-12-24' }, HOY)).toEqual({
      ok: true,
      duracion: { unidad: 'fecha', hasta: '2026-12-24' },
    })
    expect(leerDuracionCortesia({ duracion: 'fecha', hasta: HOY }, HOY).ok).toBe(true)
    expect(leerDuracionCortesia({ duracion: 'fecha', hasta: '2026-11-11' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'fecha', hasta: '2026-02-30' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'fecha', hasta: '2029-01-01' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'fecha', hasta: '' }, HOY).ok).toBe(false)
  })
})

describe('cuándo termina una cortesía', () => {
  it('lo del plan conserva la cuenta de siempre (anual y mensual)', () => {
    expect(calcularFinCortesia({ unidad: 'plan' }, HOY, AHORA, 12)).toEqual({ fechaFin: '2027-11-12', venceAt: null })
    expect(calcularFinCortesia({ unidad: 'plan' }, HOY, AHORA, 1)).toEqual({ fechaFin: '2026-12-12', venceAt: null })
  })

  it('días, semanas y meses cuentan como un plan, hasta la misma fecha', () => {
    expect(calcularFinCortesia({ unidad: 'dias', cantidad: 3 }, HOY, AHORA, 1).fechaFin).toBe('2026-11-15')
    expect(calcularFinCortesia({ unidad: 'semanas', cantidad: 2 }, HOY, AHORA, 1).fechaFin).toBe('2026-11-26')
    expect(calcularFinCortesia({ unidad: 'meses', cantidad: 3 }, HOY, AHORA, 1).fechaFin).toBe('2027-02-12')
  })

  it('hasta una fecha es esa fecha', () => {
    expect(calcularFinCortesia({ unidad: 'fecha', hasta: '2026-12-24' }, HOY, AHORA, 1)).toEqual({
      fechaFin: '2026-12-24',
      venceAt: null,
    })
  })

  it('las horas cuentan desde ahora y guardan el instante exacto', () => {
    const fin = calcularFinCortesia({ unidad: 'horas', cantidad: 5 }, HOY, AHORA, 1)
    expect(fin.venceAt).toBe('2026-11-13T01:00:00.000Z')
    // 8:00 p. m. del mismo día en Colombia: su fecha es hoy.
    expect(fin.fechaFin).toBe(HOY)
  })

  it('las horas que pasan la medianoche de Colombia caen en el día siguiente', () => {
    const fin = calcularFinCortesia({ unidad: 'horas', cantidad: 10 }, HOY, AHORA, 1)
    expect(fin.fechaFin).toBe('2026-11-13')
  })

  it('si empieza otro día (renovación), las horas cuentan desde su medianoche', () => {
    const fin = calcularFinCortesia({ unidad: 'horas', cantidad: 6 }, '2026-12-01', AHORA, 1)
    expect(fin.venceAt).toBe('2026-12-01T11:00:00.000Z')
    expect(fin.fechaFin).toBe('2026-12-01')
  })

  it('dice cuándo vence en palabras', () => {
    expect(textoVencimiento({ fechaFin: '2026-12-24', venceAt: null })).toBe(
      'Vale hasta el 24 dic 2026, ese día incluido.',
    )
    expect(textoVencimiento({ fechaFin: HOY, venceAt: '2026-11-13T01:30:00.000Z' })).toBe(
      'Vence el 12 nov 2026 a las 8:30 p. m.',
    )
    expect(textoVencimiento({ fechaFin: HOY, venceAt: '2026-11-12T17:05:00.000Z' })).toBe(
      'Vence el 12 nov 2026 a las 12:05 p. m.',
    )
  })
})

describe('la vigencia con vence_at', () => {
  it('una cortesía por horas deja de valer en su instante, aunque el día no acabe', () => {
    const venceAt = '2026-11-12T22:00:00.000Z' // 5:00 p. m. en Colombia
    expect(derivarEstadoMembresia('activa', HOY, HOY, venceAt, new Date('2026-11-12T21:59:00Z')).activa).toBe(true)
    expect(derivarEstadoMembresia('activa', HOY, HOY, venceAt, new Date('2026-11-12T22:00:00Z'))).toEqual({
      activa: false,
      motivo: 'vencida',
    })
    expect(esMembresiaVigente('activa', HOY, HOY, venceAt, new Date('2026-11-12T22:30:00Z'))).toBe(false)
    expect(esMembresiaVigente('activa', HOY, HOY, venceAt, new Date('2026-11-12T21:30:00Z'))).toBe(true)
  })

  it('sin vence_at todo sigue igual', () => {
    expect(derivarEstadoMembresia('activa', HOY, HOY).activa).toBe(true)
    expect(esMembresiaVigente('activa', '2026-11-11', HOY)).toBe(false)
  })

  it('una cancelada sigue cancelada, tenga o no vence_at', () => {
    expect(derivarEstadoMembresia('cancelada', '2027-01-01', HOY, '2027-01-01T00:00:00Z', AHORA)).toEqual({
      activa: false,
      motivo: 'cancelada',
    })
  })

  it('venceAtDe lee la columna si viene y aguanta que no exista', () => {
    expect(venceAtDe({ vence_at: '2026-11-13T01:00:00Z' })).toBe('2026-11-13T01:00:00Z')
    expect(venceAtDe({ vence_at: null })).toBeNull()
    expect(venceAtDe({ fecha_fin: HOY })).toBeNull()
    expect(venceAtDe(null)).toBeNull()
  })

  it('una renovación tras una cortesía por horas empieza hoy, no mañana', () => {
    expect(inicioDeRenovacion(HOY, { fecha_fin: HOY, vence_at: '2026-11-13T01:00:00Z' } as { fecha_fin: string })).toBe(HOY)
    expect(inicioDeRenovacion(HOY, { fecha_fin: '2026-11-20' })).toBe('2026-11-21')
    expect(inicioDeRenovacion(HOY, null)).toBe(HOY)
  })

  it('reconoce el error de la columna que falta', () => {
    expect(faltaColumnaVenceAt({ message: "Could not find the 'vence_at' column of 'membresias'" })).toBe(true)
    expect(faltaColumnaVenceAt({ message: 'otro error', code: '23505' })).toBe(false)
    expect(faltaColumnaVenceAt(null)).toBe(false)
  })
})
