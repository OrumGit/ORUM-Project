import { describe, expect, it } from 'vitest'
import {
  SIN_PROMOCION,
  resumirVentasComercio,
  ventasPorPromocion,
  ventasPorSede,
  type VentaComercio,
} from './ventas-comercio'

const venta = (v: Partial<VentaComercio>): VentaComercio => ({
  id: 1,
  fechaHora: '2026-11-10T15:00:00Z',
  miembroId: 19,
  miembro: 'Jessica García',
  sede: 'Centro',
  promocion: '10% en toda la carta',
  valorCompra: 100000,
  descuento: 10000,
  valorFinal: 90000,
  metodo: 'numero',
  ...v,
})

describe('resumirVentasComercio', () => {
  it('suma lo que entró, el descuento y lo que valía, y cuenta socios distintos', () => {
    const r = resumirVentasComercio([
      venta({ id: 1 }),
      venta({ id: 2, miembroId: 30, valorCompra: 50000, descuento: 0.1, valorFinal: 49999.9 }),
      venta({ id: 3, valorCompra: 0.2, descuento: 0.2, valorFinal: 0 }),
    ])
    expect(r).toEqual({
      ventas: 3,
      entro: 139999.9,
      descuento: 10000.3,
      sinDescuento: 150000.2,
      socios: 2,
      porcentajeDescuento: 7,
      ventaPromedio: 46667,
    })
  })

  it('sin ventas no hay porcentaje ni promedio', () => {
    expect(resumirVentasComercio([])).toEqual({
      ventas: 0,
      entro: 0,
      descuento: 0,
      sinDescuento: 0,
      socios: 0,
      porcentajeDescuento: null,
      ventaPromedio: null,
    })
  })
})

describe('ventasPorSede y ventasPorPromocion', () => {
  const ventas = [
    venta({ id: 1, sede: 'Centro', promocion: '10%' }),
    venta({ id: 2, sede: 'Norte', promocion: null, valorFinal: 500000 }),
    venta({ id: 3, sede: 'Centro', promocion: '10%' }),
    venta({ id: 4, sede: null, promocion: '  ' }),
  ]

  it('agrupa por sede, de más a menos ventas', () => {
    expect(ventasPorSede(ventas).map((g) => [g.nombre, g.ventas, g.entro])).toEqual([
      ['Centro', 2, 180000],
      ['Norte', 1, 500000],
      ['Sede sin nombre', 1, 90000],
    ])
  })

  it('agrupa por promoción y junta las ventas sin ella', () => {
    expect(ventasPorPromocion(ventas).map((g) => [g.nombre, g.ventas])).toEqual([
      [SIN_PROMOCION, 2],
      ['10%', 2],
    ])
  })
})
