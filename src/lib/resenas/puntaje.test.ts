import { describe, expect, it } from 'vitest'
import { calificacionPorComercio, clasificacionPromedio, conteosDe, distribucionEstrellas } from './puntaje'

describe('distribucionEstrellas', () => {
  it('de 5 a 1 estrellas, con su porcentaje', () => {
    // 1★:1, 2★:0, 3★:1, 4★:2, 5★:4 → 8 reseñas.
    expect(distribucionEstrellas([1, 0, 1, 2, 4])).toEqual([
      { estrellas: 5, cantidad: 4, porcentaje: 50 },
      { estrellas: 4, cantidad: 2, porcentaje: 25 },
      { estrellas: 3, cantidad: 1, porcentaje: 13 },
      { estrellas: 2, cantidad: 0, porcentaje: 0 },
      { estrellas: 1, cantidad: 1, porcentaje: 13 },
    ])
  })

  it('sin reseñas, todo en cero (nunca NaN)', () => {
    expect(distribucionEstrellas([0, 0, 0, 0, 0]).every((f) => f.porcentaje === 0)).toBe(true)
  })
})

describe('clasificacionPromedio', () => {
  it('pone en palabras el promedio', () => {
    expect(clasificacionPromedio(4.8)).toBe('Excelente')
    expect(clasificacionPromedio(4.5)).toBe('Excelente')
    expect(clasificacionPromedio(4.2)).toBe('Muy bueno')
    expect(clasificacionPromedio(3)).toBe('Bueno')
    expect(clasificacionPromedio(2.4)).toBe('Regular')
    expect(clasificacionPromedio(1.2)).toBe('Malo')
  })

  it('sin promedio no dice nada', () => {
    expect(clasificacionPromedio(null)).toBe('')
    expect(clasificacionPromedio(0)).toBe('')
    expect(clasificacionPromedio(Number.NaN)).toBe('')
  })
})

describe('conteosDe y calificacionPorComercio', () => {
  it('cuenta cada número de estrellas e ignora lo que no es 1–5', () => {
    expect(conteosDe([5, 5, 4, 1, 0, 6, 3.5])).toEqual([1, 0, 0, 1, 2])
  })

  it('promedio y total por comercio', () => {
    const m = calificacionPorComercio([
      { comercio_id: 1, estrellas: 5 },
      { comercio_id: 1, estrellas: 4 },
      { comercio_id: 2, estrellas: 2 },
    ])
    expect(m.get(1)).toEqual({ total: 2, promedio: 4.5 })
    expect(m.get(2)).toEqual({ total: 1, promedio: 2 })
    expect(m.get(3)).toBeUndefined()
  })
})
