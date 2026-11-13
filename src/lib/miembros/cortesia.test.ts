import { describe, it, expect } from 'vitest'
import {
  calcularFinCortesia,
  leerDuracionCortesia,
  textoDuracionCortesia,
  textoVencimiento,
  MAXIMOS,
} from './cortesia'

const HOY = '2026-11-12'

describe('leer la duración de una cortesía', () => {
  it('sin unidad es la del plan, como antes', () => {
    expect(leerDuracionCortesia({}, HOY)).toEqual({ ok: true, duracion: { unidad: 'plan' } })
    expect(leerDuracionCortesia({ duracion: 'plan', cantidad: '9' }, HOY)).toEqual({
      ok: true,
      duracion: { unidad: 'plan' },
    })
  })

  it('lee días, semanas y meses', () => {
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: '5' }, HOY)).toEqual({
      ok: true,
      duracion: { unidad: 'dias', cantidad: 5 },
    })
    expect(leerDuracionCortesia({ duracion: 'semanas', cantidad: ' 2 ' }, HOY)).toEqual({
      ok: true,
      duracion: { unidad: 'semanas', cantidad: 2 },
    })
  })

  it('las horas ya no existen', () => {
    expect(leerDuracionCortesia({ duracion: 'horas', cantidad: '5' }, HOY).ok).toBe(false)
  })

  it('rechaza cantidades vacías, con decimales, cero o por encima del tope', () => {
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: '' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: '1.5' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: '0' }, HOY).ok).toBe(false)
    expect(leerDuracionCortesia({ duracion: 'dias', cantidad: String(MAXIMOS.dias + 1) }, HOY).ok).toBe(false)
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

  it('al renovar, la fecha no puede ser antes de que empiece', () => {
    expect(leerDuracionCortesia({ duracion: 'fecha', hasta: '2026-12-10' }, '2026-12-21').ok).toBe(false)
  })
})

describe('cuándo termina una cortesía', () => {
  it('lo del plan conserva la cuenta de siempre (anual y mensual)', () => {
    expect(calcularFinCortesia({ unidad: 'plan' }, HOY, 12)).toBe('2027-11-12')
    expect(calcularFinCortesia({ unidad: 'plan' }, HOY, 1)).toBe('2026-12-12')
  })

  it('días, semanas y meses cuentan como un plan, hasta la misma fecha', () => {
    expect(calcularFinCortesia({ unidad: 'dias', cantidad: 3 }, HOY, 1)).toBe('2026-11-15')
    expect(calcularFinCortesia({ unidad: 'semanas', cantidad: 2 }, HOY, 1)).toBe('2026-11-26')
    expect(calcularFinCortesia({ unidad: 'meses', cantidad: 3 }, HOY, 1)).toBe('2027-02-12')
  })

  it('hasta una fecha es esa fecha', () => {
    expect(calcularFinCortesia({ unidad: 'fecha', hasta: '2026-12-24' }, HOY, 1)).toBe('2026-12-24')
  })

  it('dice cuándo vence y cuánto dura en palabras', () => {
    expect(textoVencimiento('2026-12-24')).toBe('Vale hasta el 24 dic 2026, ese día incluido.')
    expect(textoDuracionCortesia({ unidad: 'plan' })).toBeNull()
    expect(textoDuracionCortesia({ unidad: 'semanas', cantidad: 1 })).toBe('por 1 semana')
    expect(textoDuracionCortesia({ unidad: 'dias', cantidad: 3 })).toBe('por 3 días')
    expect(textoDuracionCortesia({ unidad: 'fecha', hasta: '2026-12-24' })).toBe('hasta el 24 dic 2026')
  })
})
