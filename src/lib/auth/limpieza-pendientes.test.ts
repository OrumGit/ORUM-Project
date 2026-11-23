import { describe, expect, it } from 'vitest'
import {
  cuentasParaBorrar,
  DIAS_PLAZO_SIN_PAGO,
  esCuentaVencida,
  sePuedeBorrar,
  type CuentaParaRevisar,
} from './limpieza-pendientes'

const ahora = new Date('2026-11-21T12:00:00Z')
const hace = (dias: number) =>
  new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString()

const base = (extra: Partial<CuentaParaRevisar>): CuentaParaRevisar => ({
  id: 'x',
  creadaAt: hace(30),
  estadoRegistro: 'pendiente',
  registroConFicha: false,
  tienePerfil: false,
  tieneFicha: false,
  pagoAbierto: false,
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

describe('sePuedeBorrar', () => {
  it('borra un registro pendiente, vencido y sin rastro de cuenta real', () => {
    expect(sePuedeBorrar(base({}), ahora)).toBe(true)
  })

  it('también un registro cancelado', () => {
    expect(sePuedeBorrar(base({ estadoRegistro: 'cancelado' }), ahora)).toBe(true)
  })

  it('NUNCA una cuenta con perfil: personal del panel, comercio o socio', () => {
    expect(sePuedeBorrar(base({ tienePerfil: true }), ahora)).toBe(false)
  })

  it('nunca una cuenta con ficha de socio', () => {
    expect(sePuedeBorrar(base({ tieneFicha: true }), ahora)).toBe(false)
  })

  it('nunca un registro completado', () => {
    expect(sePuedeBorrar(base({ estadoRegistro: 'completado' }), ahora)).toBe(false)
  })

  it('nunca un registro que ya apunta a una ficha', () => {
    expect(sePuedeBorrar(base({ registroConFicha: true }), ahora)).toBe(false)
  })

  it('no si su enlace de pago sigue abierto en Mercado Pago', () => {
    expect(sePuedeBorrar(base({ pagoAbierto: true }), ahora)).toBe(false)
  })

  it('no si el registro es reciente', () => {
    expect(sePuedeBorrar(base({ creadaAt: hace(3) }), ahora)).toBe(false)
  })
})

describe('cuentasParaBorrar', () => {
  it('solo devuelve las que cumplen todo, de una lista mixta', () => {
    const cuentas = [
      base({ id: 'borrar' }),
      base({ id: 'admin', tienePerfil: true }),
      base({ id: 'socio', tieneFicha: true }),
      base({ id: 'pago', estadoRegistro: 'completado' }),
      base({ id: 'abierto', pagoAbierto: true }),
      base({ id: 'reciente', creadaAt: hace(2) }),
    ]
    expect(cuentasParaBorrar(cuentas, ahora)).toEqual(['borrar'])
  })
})
