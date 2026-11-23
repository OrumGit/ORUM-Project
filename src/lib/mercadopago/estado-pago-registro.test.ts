import { describe, expect, it } from 'vitest'
import { cobroDesdeEstado, estadoPagoRegistro, type DatosEstadoPago } from './estado-pago-registro'

const base = (extra: Partial<DatosEstadoPago>): DatosEstadoPago => ({
  estadoRegistro: 'pendiente',
  tieneFicha: false,
  tienePago: true,
  ultimoCobro: null,
  ...extra,
})

describe('cobroDesdeEstado', () => {
  it('lee los estados de Mercado Pago', () => {
    expect(cobroDesdeEstado('approved')).toBe('aprobado')
    expect(cobroDesdeEstado('rejected')).toBe('rechazado')
    expect(cobroDesdeEstado('cancelled')).toBe('rechazado')
    expect(cobroDesdeEstado('pending')).toBe('pendiente')
    expect(cobroDesdeEstado('in_process')).toBe('pendiente')
  })

  it('lo desconocido no decide nada', () => {
    expect(cobroDesdeEstado('refunded')).toBe('otro')
    expect(cobroDesdeEstado(null)).toBe('otro')
  })
})

describe('estadoPagoRegistro', () => {
  it('con ficha, la membresía está activa aunque el registro no lo diga aún', () => {
    expect(estadoPagoRegistro(base({ tieneFicha: true }))).toBe('activa')
  })

  it('un registro completado está activo', () => {
    expect(estadoPagoRegistro(base({ estadoRegistro: 'completado' }))).toBe('activa')
  })

  it('sin intento de pago, hay que abrirlo', () => {
    expect(estadoPagoRegistro(base({ tienePago: false }))).toBe('sin_pago')
  })

  it('cobro rechazado', () => {
    expect(estadoPagoRegistro(base({ ultimoCobro: 'rechazado' }))).toBe('rechazado')
  })

  it('cobro en revisión', () => {
    expect(estadoPagoRegistro(base({ ultimoCobro: 'pendiente' }))).toBe('pendiente')
  })

  it('sin cobro todavía, o aprobado sin ficha: confirmando', () => {
    expect(estadoPagoRegistro(base({ ultimoCobro: null }))).toBe('confirmando')
    expect(estadoPagoRegistro(base({ ultimoCobro: 'aprobado' }))).toBe('confirmando')
  })
})
