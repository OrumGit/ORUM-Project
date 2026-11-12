import { describe, expect, it } from 'vitest'
import {
  cuentasParaBorrar,
  DIAS_PLAZO_SIN_PAGO,
  esCuentaVencida,
  type CuentaParaRevisar,
} from './limpieza-pendientes'

const ahora = new Date('2026-11-21T12:00:00Z')
const hace = (dias: number) =>
  new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString()

const base = (extra: Partial<CuentaParaRevisar>): CuentaParaRevisar => ({
  id: 'x',
  creadaAt: hace(30),
  tieneFicha: false,
  tienePagoCompletado: false,
  ...extra,
})

describe('esCuentaVencida', () => {
  it('el plazo son 10 días', () => {
    expect(DIAS_PLAZO_SIN_PAGO).toBe(10)
  })

  it('vence pasados los 10 días', () => {
    expect(esCuentaVencida(hace(11), ahora)).toBe(true)
  })

  it('no vence antes de los 10 días', () => {
    expect(esCuentaVencida(hace(9), ahora)).toBe(false)
  })

  it('una fecha que no se lee no vence', () => {
    expect(esCuentaVencida('no-es-fecha', ahora)).toBe(false)
  })
})

describe('cuentasParaBorrar', () => {
  it('borra una cuenta vencida, sin ficha y sin pago', () => {
    expect(cuentasParaBorrar([base({ id: 'a' })], ahora)).toEqual(['a'])
  })

  it('nunca borra una cuenta con ficha de socio', () => {
    expect(cuentasParaBorrar([base({ id: 'a', tieneFicha: true })], ahora)).toEqual([])
  })

  it('nunca borra una cuenta que completó un pago', () => {
    expect(cuentasParaBorrar([base({ id: 'a', tienePagoCompletado: true })], ahora)).toEqual([])
  })

  it('no borra una cuenta reciente aunque no tenga pago', () => {
    expect(cuentasParaBorrar([base({ id: 'a', creadaAt: hace(3) })], ahora)).toEqual([])
  })

  it('solo devuelve las que cumplen todo, de una lista mixta', () => {
    const cuentas = [
      base({ id: 'borrar' }),
      base({ id: 'socio', tieneFicha: true }),
      base({ id: 'pago', tienePagoCompletado: true }),
      base({ id: 'reciente', creadaAt: hace(2) }),
    ]
    expect(cuentasParaBorrar(cuentas, ahora)).toEqual(['borrar'])
  })
})
