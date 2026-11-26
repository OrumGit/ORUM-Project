import { describe, it, expect } from 'vitest'
import { esMembresiaVigente } from './membresia-vigente'

describe('esMembresiaVigente', () => {
  it('vigente: activa y fecha_fin en el futuro', () => {
    expect(esMembresiaVigente('activa', '2026-12-31', '2026-08-09')).toBe(true)
  })

  it('vigente: activa y fecha_fin es hoy mismo', () => {
    expect(esMembresiaVigente('activa', '2026-08-09', '2026-08-09')).toBe(true)
  })

  it('no vigente: activa pero fecha_fin ya pasó (nadie la marcó vencida)', () => {
    expect(esMembresiaVigente('activa', '2026-08-01', '2026-08-09')).toBe(false)
  })

  it('no vigente: estado vencida', () => {
    expect(esMembresiaVigente('vencida', '2026-12-31', '2026-08-09')).toBe(false)
  })

  it('no vigente: estado suspendida', () => {
    expect(esMembresiaVigente('suspendida', '2026-12-31', '2026-08-09')).toBe(false)
  })

  it('no vigente: estado cancelada', () => {
    expect(esMembresiaVigente('cancelada', '2026-12-31', '2026-08-09')).toBe(false)
  })
})
