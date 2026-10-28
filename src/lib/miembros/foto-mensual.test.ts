import { describe, expect, it } from 'vitest'
import {
  inicioMesBogota,
  inicioMesSiguienteBogota,
  puedeCambiarFoto,
  textoProximoCambio,
} from './foto-mensual'

describe('inicioMesBogota', () => {
  it('es la medianoche del día 1 en Colombia (05:00 UTC)', () => {
    expect(inicioMesBogota(new Date('2026-10-28T15:00:00Z')).toISOString()).toBe('2026-10-01T05:00:00.000Z')
  })

  it('la noche del último día sigue siendo ese mes en Colombia', () => {
    // 31 oct a las 9 p. m. en Bogotá = 1 nov 02:00 UTC.
    expect(inicioMesBogota(new Date('2026-11-01T02:00:00Z')).toISOString()).toBe('2026-10-01T05:00:00.000Z')
  })

  it('el mes siguiente cruza el año', () => {
    expect(inicioMesSiguienteBogota(new Date('2026-12-15T12:00:00Z')).toISOString()).toBe('2027-01-01T05:00:00.000Z')
  })
})

describe('puedeCambiarFoto', () => {
  const ahora = new Date('2026-10-28T15:00:00Z')

  it('sin cambios anteriores, puede', () => {
    expect(puedeCambiarFoto(null, ahora)).toBe(true)
  })

  it('si ya la cambió este mes, no puede', () => {
    expect(puedeCambiarFoto('2026-10-01T05:00:00Z', ahora)).toBe(false)
    expect(puedeCambiarFoto('2026-10-27T20:00:00Z', ahora)).toBe(false)
  })

  it('si la cambió el mes pasado, puede (aunque fuera ayer en la noche)', () => {
    // 30 sept a las 11:59 p. m. en Bogotá.
    expect(puedeCambiarFoto('2026-10-01T04:59:00Z', ahora)).toBe(true)
    expect(puedeCambiarFoto(new Date('2026-09-03T12:00:00Z'), ahora)).toBe(true)
  })

  it('el 1 del mes siguiente vuelve a poder', () => {
    const cambio = '2026-10-31T23:00:00Z'
    expect(puedeCambiarFoto(cambio, new Date('2026-11-01T04:00:00Z'))).toBe(false)
    expect(puedeCambiarFoto(cambio, new Date('2026-11-01T05:00:00Z'))).toBe(true)
  })

  it('una fecha ilegible no bloquea a nadie', () => {
    expect(puedeCambiarFoto('no-es-fecha', ahora)).toBe(true)
  })
})

describe('textoProximoCambio', () => {
  it('nombra el mes siguiente', () => {
    expect(textoProximoCambio(new Date('2026-10-28T15:00:00Z'))).toBe('el 1 de noviembre')
    expect(textoProximoCambio(new Date('2026-12-31T20:00:00Z'))).toBe('el 1 de enero')
  })
})
