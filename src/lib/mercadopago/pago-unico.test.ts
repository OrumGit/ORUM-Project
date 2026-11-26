import { describe, expect, it } from 'vitest'
import { esPagoTardio, registroDelPago } from './pago-unico'

describe('registroDelPago', () => {
  it('lee el id del registro desde external_reference', () => {
    expect(registroDelPago({ external_reference: '42' })).toBe(42)
  })

  it('no reconoce referencias que no son de este flujo', () => {
    expect(registroDelPago({ external_reference: null })).toBeNull()
    expect(registroDelPago({ external_reference: '' })).toBeNull()
    expect(registroDelPago({ external_reference: 'prueba-pago-unico' })).toBeNull()
    expect(registroDelPago({ external_reference: '0' })).toBeNull()
    expect(registroDelPago({ external_reference: '12abc' })).toBeNull()
  })
})

describe('esPagoTardio', () => {
  const vence = '2026-12-01T00:59:59.000-04:00'

  it('aprobado antes de la fecha límite no es tardío', () => {
    expect(esPagoTardio({ date_of_expiration: vence, date_approved: '2026-11-28T10:00:00.000-05:00' })).toBe(false)
  })

  it('aprobado después de la fecha límite es tardío', () => {
    expect(esPagoTardio({ date_of_expiration: vence, date_approved: '2026-12-02T10:00:00.000-05:00' })).toBe(true)
  })

  it('sin fechas no se puede juzgar, así que no es tardío', () => {
    expect(esPagoTardio({})).toBe(false)
    expect(esPagoTardio({ date_of_expiration: vence, date_approved: null })).toBe(false)
  })
})
