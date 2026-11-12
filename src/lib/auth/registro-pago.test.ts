import { describe, expect, it } from 'vitest'
import { puedeAbrirPago } from './registro-pago'

const pendiente = { estado: 'pendiente' as const, miembro_id: null }

describe('puedeAbrirPago', () => {
  it('permite pagar con correo confirmado y registro pendiente', () => {
    expect(puedeAbrirPago('2026-11-11T20:00:00Z', pendiente)).toEqual({ ok: true })
  })

  it('bloquea sin correo confirmado, aunque el registro exista', () => {
    expect(puedeAbrirPago(null, pendiente)).toEqual({ ok: false, motivo: 'correo_sin_confirmar' })
    expect(puedeAbrirPago(undefined, pendiente)).toEqual({ ok: false, motivo: 'correo_sin_confirmar' })
    expect(puedeAbrirPago('', pendiente)).toEqual({ ok: false, motivo: 'correo_sin_confirmar' })
  })

  it('bloquea si no hay registro pendiente', () => {
    expect(puedeAbrirPago('2026-11-11T20:00:00Z', null)).toEqual({ ok: false, motivo: 'sin_registro' })
  })

  it('bloquea un registro cancelado', () => {
    expect(
      puedeAbrirPago('2026-11-11T20:00:00Z', { estado: 'cancelado', miembro_id: null }),
    ).toEqual({ ok: false, motivo: 'registro_cancelado' })
  })

  it('bloquea un registro ya completado o con socio vinculado', () => {
    expect(
      puedeAbrirPago('2026-11-11T20:00:00Z', { estado: 'completado', miembro_id: 12 }),
    ).toEqual({ ok: false, motivo: 'ya_completado' })
    expect(
      puedeAbrirPago('2026-11-11T20:00:00Z', { estado: 'pendiente', miembro_id: 12 }),
    ).toEqual({ ok: false, motivo: 'ya_completado' })
  })

  it('el correo sin confirmar pesa menos que un registro ya completado', () => {
    // Un socio ya dado de alta no vuelve a pagar, confirmado o no.
    expect(
      puedeAbrirPago(null, { estado: 'completado', miembro_id: 12 }),
    ).toEqual({ ok: false, motivo: 'ya_completado' })
  })
})
