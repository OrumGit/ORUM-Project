import { describe, it, expect } from 'vitest'
import { resumirConciliacion, sumarResumenes } from './resumen-conciliacion'

describe('resumirConciliacion', () => {
  it('sin cuotas: todo en cero', () => {
    expect(resumirConciliacion([])).toEqual({
      revisadas: 0, aplicadas: 0, yaEstaban: 0, enEspera: 0, rechazadas: 0, sinPago: 0, noAplicables: 0,
    })
  })

  it('cuenta cada resultado en su casilla', () => {
    const r = resumirConciliacion(['aplicada', 'ya_estaba', 'ya_estaba', 'en_espera', 'rechazada', 'sin_pago', 'no_aplicable'])
    expect(r).toEqual({
      revisadas: 7, aplicadas: 1, yaEstaban: 2, enEspera: 1, rechazadas: 1, sinPago: 1, noAplicables: 1,
    })
  })

  it('una cuota ya aplicada no cuenta como aplicada ahora', () => {
    const r = resumirConciliacion(['ya_estaba'])
    expect(r.aplicadas).toBe(0)
    expect(r.yaEstaban).toBe(1)
  })
})

describe('sumarResumenes', () => {
  it('suma varias suscripciones', () => {
    const a = resumirConciliacion(['aplicada', 'ya_estaba'])
    const b = resumirConciliacion(['rechazada'])
    expect(sumarResumenes([a, b])).toEqual({
      revisadas: 3, aplicadas: 1, yaEstaban: 1, enEspera: 0, rechazadas: 1, sinPago: 0, noAplicables: 0,
    })
  })

  it('sin suscripciones: todo en cero', () => {
    expect(sumarResumenes([]).revisadas).toBe(0)
  })
})
