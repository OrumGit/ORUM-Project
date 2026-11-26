import { describe, expect, it } from 'vitest'
import { debeRecordarVencimiento, diasEntre } from './recordatorio-vencimiento'

describe('diasEntre', () => {
  it('cuenta días civiles, también cruzando fin de mes y de año', () => {
    expect(diasEntre('2026-11-25', '2026-12-01')).toBe(6)
    expect(diasEntre('2026-12-28', '2027-01-02')).toBe(5)
    expect(diasEntre('2026-11-25', '2026-11-25')).toBe(0)
  })
})

describe('debeRecordarVencimiento', () => {
  const hoy = '2026-11-25'

  it('recuerda cuando faltan entre 1 y 5 días', () => {
    expect(debeRecordarVencimiento({ fecha_fin: '2026-11-30', recordatorio_enviado_at: null }, hoy)).toBe(true)
    expect(debeRecordarVencimiento({ fecha_fin: '2026-11-26', recordatorio_enviado_at: null }, hoy)).toBe(true)
  })

  it('no recuerda antes de la ventana de 5 días', () => {
    expect(debeRecordarVencimiento({ fecha_fin: '2026-12-01', recordatorio_enviado_at: null }, hoy)).toBe(false)
  })

  it('no recuerda el día del vencimiento ni después', () => {
    expect(debeRecordarVencimiento({ fecha_fin: '2026-11-25', recordatorio_enviado_at: null }, hoy)).toBe(false)
    expect(debeRecordarVencimiento({ fecha_fin: '2026-11-20', recordatorio_enviado_at: null }, hoy)).toBe(false)
  })

  it('una sola vez: si ya se envió, no vuelve a recordar', () => {
    expect(
      debeRecordarVencimiento(
        { fecha_fin: '2026-11-30', recordatorio_enviado_at: '2026-11-25T13:00:00.000Z' },
        hoy,
      ),
    ).toBe(false)
  })

  it('acepta otra ventana si se pasa', () => {
    expect(debeRecordarVencimiento({ fecha_fin: '2026-12-01', recordatorio_enviado_at: null }, hoy, 7)).toBe(true)
  })
})
