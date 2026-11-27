import { describe, expect, it } from 'vitest'
import {
  ordenarRecientes,
  resumirVentasMembresias,
  textoTipoMembresia,
  type VentaMembresia,
} from './ventas-membresias'

const venta = (v: Partial<VentaMembresia>): VentaMembresia => ({
  id: 1,
  fechaHora: '2026-11-26T15:00:00+00:00',
  miembroId: 19,
  miembro: 'Jessica García',
  numeroMembresia: '00090001',
  plan: 'Mensual',
  tipo: 'nueva',
  esCortesia: false,
  precio: 30000,
  ...v,
})

describe('resumirVentasMembresias', () => {
  it('cuenta las membresías cobradas y su monto', () => {
    const r = resumirVentasMembresias([venta({ id: 1, precio: 30000 }), venta({ id: 2, precio: 50000 })])
    expect(r).toEqual({ vendidas: 2, monto: 80000, cortesias: 0 })
  })

  it('una cortesía no suma ni a la cantidad ni al monto, pero se cuenta aparte', () => {
    const r = resumirVentasMembresias([
      venta({ id: 1, precio: 30000 }),
      venta({ id: 2, esCortesia: true, precio: 0 }),
      venta({ id: 3, esCortesia: true, precio: 0, tipo: 'renovada' }),
    ])
    expect(r).toEqual({ vendidas: 1, monto: 30000, cortesias: 2 })
  })

  it('sin ventas, todo en cero', () => {
    expect(resumirVentasMembresias([])).toEqual({ vendidas: 0, monto: 0, cortesias: 0 })
  })
})

describe('ordenarRecientes', () => {
  it('pone primero la membresía más reciente (id mayor) sin tocar el original', () => {
    const original = [venta({ id: 5 }), venta({ id: 9 }), venta({ id: 2 })]
    const ordenadas = ordenarRecientes(original)
    expect(ordenadas.map((v) => v.id)).toEqual([9, 5, 2])
    expect(original.map((v) => v.id)).toEqual([5, 9, 2])
  })
})

describe('textoTipoMembresia', () => {
  it('nueva y renovación', () => {
    expect(textoTipoMembresia('nueva', false)).toBe('Nueva')
    expect(textoTipoMembresia('renovada', false)).toBe('Renovación')
  })

  it('una cortesía se nombra como cortesía aunque su tipo sea renovada', () => {
    expect(textoTipoMembresia('renovada', true)).toBe('Cortesía')
    expect(textoTipoMembresia('nueva', true)).toBe('Cortesía')
  })
})
