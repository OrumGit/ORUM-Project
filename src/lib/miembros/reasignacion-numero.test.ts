import { describe, it, expect } from 'vitest'
import { revisarReasignacion } from './reasignacion-numero'

const base = { numeroActual: '00090027', numeroNuevo: '00090037', ventas: 0 }

describe('revisarReasignacion', () => {
  it('permite reasignar a un número válido distinto, sin ventas', () => {
    expect(revisarReasignacion(base)).toEqual({ ok: true })
  })

  it('rechaza un número nuevo que no tiene 8 dígitos', () => {
    const r = revisarReasignacion({ ...base, numeroNuevo: '90037' })
    expect(r.ok).toBe(false)
  })

  it('rechaza un número nuevo con letras', () => {
    const r = revisarReasignacion({ ...base, numeroNuevo: 'ORUM-037' })
    expect(r.ok).toBe(false)
  })

  it('rechaza el mismo número que ya tiene', () => {
    const r = revisarReasignacion({ ...base, numeroNuevo: '00090027' })
    expect(r).toEqual({ ok: false, error: 'Ese ya es su número de membresía.' })
  })

  it('bloquea si el miembro tiene una venta, en singular', () => {
    const r = revisarReasignacion({ ...base, ventas: 1 })
    expect(r).toEqual({
      ok: false,
      error: 'No se puede reasignar el número: el miembro tiene una venta registrada.',
    })
  })

  it('bloquea si el miembro tiene varias ventas, con el conteo', () => {
    const r = revisarReasignacion({ ...base, ventas: 3 })
    expect(r).toEqual({
      ok: false,
      error: 'No se puede reasignar el número: el miembro tiene 3 ventas registradas.',
    })
  })
})
