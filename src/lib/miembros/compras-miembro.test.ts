import { describe, expect, it } from 'vitest'
import {
  comprasPorComercio,
  esFechaCivil,
  leerPeriodoCompras,
  resumirCompras,
  textoMetodoRegistro,
  textoPeriodo,
} from './compras-miembro'
import type { Movimiento } from './movimientos'

// Miércoles 11 de noviembre de 2026.
const HOY = '2026-11-11'

describe('leerPeriodoCompras', () => {
  it('sin nada (o algo raro) es «Todo»', () => {
    expect(leerPeriodoCompras({}, HOY)).toEqual({ periodo: 'todo', desde: null, hasta: null })
    expect(leerPeriodoCompras({ periodo: 'siglo' }, HOY).periodo).toBe('todo')
  })

  it('la semana empieza el lunes', () => {
    expect(leerPeriodoCompras({ periodo: 'semana' }, HOY)).toEqual({
      periodo: 'semana',
      desde: '2026-11-09',
      hasta: HOY,
    })
    // Un domingo pertenece a la semana que empezó el lunes anterior.
    expect(leerPeriodoCompras({ periodo: 'semana' }, '2026-11-15').desde).toBe('2026-11-09')
    // Un lunes empieza en sí mismo.
    expect(leerPeriodoCompras({ periodo: 'semana' }, '2026-11-09').desde).toBe('2026-11-09')
  })

  it('mes, año y últimos 30 días', () => {
    expect(leerPeriodoCompras({ periodo: 'mes' }, HOY).desde).toBe('2026-11-01')
    expect(leerPeriodoCompras({ periodo: 'anio' }, HOY).desde).toBe('2026-01-01')
    expect(leerPeriodoCompras({ periodo: '30dias' }, HOY).desde).toBe('2026-10-13')
    // Cruza el año.
    expect(leerPeriodoCompras({ periodo: '30dias' }, '2027-01-10').desde).toBe('2026-12-12')
  })

  it('un rango de fechas manda sobre el periodo, y al revés se ordena', () => {
    expect(leerPeriodoCompras({ periodo: 'mes', desde: '2026-01-01', hasta: '2026-03-31' }, HOY)).toEqual({
      periodo: 'rango',
      desde: '2026-01-01',
      hasta: '2026-03-31',
    })
    expect(leerPeriodoCompras({ desde: '2026-03-31', hasta: '2026-01-01' }, HOY)).toEqual({
      periodo: 'rango',
      desde: '2026-01-01',
      hasta: '2026-03-31',
    })
    expect(leerPeriodoCompras({ desde: '2026-05-01' }, HOY)).toEqual({ periodo: 'rango', desde: '2026-05-01', hasta: null })
  })

  it('ignora fechas que no existen', () => {
    expect(esFechaCivil('2026-02-31')).toBe(false)
    expect(esFechaCivil('2026-2-1')).toBe(false)
    expect(leerPeriodoCompras({ desde: '2026-02-31' }, HOY).periodo).toBe('todo')
  })
})

describe('textoPeriodo', () => {
  it('dice el periodo en palabras', () => {
    expect(textoPeriodo({ periodo: 'todo', desde: null, hasta: null })).toBe('Desde que es miembro')
    expect(textoPeriodo({ periodo: 'mes', desde: '2026-11-01', hasta: '2026-11-11' })).toBe(
      'Del 1 de noviembre de 2026 al 11 de noviembre de 2026',
    )
    expect(textoPeriodo({ periodo: 'rango', desde: '2026-11-11', hasta: '2026-11-11' })).toBe('El 11 de noviembre de 2026')
    expect(textoPeriodo({ periodo: 'rango', desde: '2026-05-01', hasta: null })).toBe('Desde el 1 de mayo de 2026')
  })
})

const compra = (m: Partial<Movimiento>): Movimiento => ({
  id: 1,
  fechaHora: '2026-11-10T15:00:00Z',
  comercioId: 1,
  comercio: 'Artesana 43',
  logoUrl: null,
  sucursal: 'Centro',
  promocion: '10%',
  valorCompra: 100000,
  ahorro: 10000,
  valorFinal: 90000,
  ...m,
})

describe('resumirCompras', () => {
  it('suma lo gastado, lo ahorrado y lo que habría pagado', () => {
    const r = resumirCompras([
      compra({ id: 1 }),
      compra({ id: 2, comercioId: 2, comercio: 'Coraje', valorCompra: 50000, ahorro: 0.1, valorFinal: 49999.9 }),
      compra({ id: 3, valorCompra: 0.2, ahorro: 0.2, valorFinal: 0 }),
    ])
    expect(r).toEqual({
      compras: 3,
      gastado: 139999.9,
      ahorrado: 10000.3,
      sinOrum: 150000.2,
      comercios: 2,
      porcentajeAhorro: 7,
    })
  })

  it('sin compras, el porcentaje no existe', () => {
    expect(resumirCompras([])).toEqual({
      compras: 0,
      gastado: 0,
      ahorrado: 0,
      sinOrum: 0,
      comercios: 0,
      porcentajeAhorro: null,
    })
  })
})

describe('comprasPorComercio', () => {
  it('agrupa por comercio, de más a menos compras, con su última compra', () => {
    const filas = comprasPorComercio([
      compra({ id: 1, fechaHora: '2026-11-10T15:00:00Z' }),
      compra({ id: 2, comercioId: 2, comercio: 'Coraje', valorFinal: 500000 }),
      compra({ id: 3, fechaHora: '2026-10-01T15:00:00Z' }),
    ])
    expect(filas.map((f) => [f.comercio, f.compras, f.gastado, f.ahorrado])).toEqual([
      ['Artesana 43', 2, 180000, 20000],
      ['Coraje', 1, 500000, 10000],
    ])
    expect(filas[0].ultima).toBe('2026-11-10T15:00:00Z')
  })

  it('a igual número de compras, primero el que más gastó', () => {
    const filas = comprasPorComercio([
      compra({ id: 1, comercioId: 1, comercio: 'A', valorFinal: 10 }),
      compra({ id: 2, comercioId: 2, comercio: 'B', valorFinal: 20 }),
    ])
    expect(filas.map((f) => f.comercio)).toEqual(['B', 'A'])
  })

  it('un comercio que ya no se puede leer se agrupa por su nombre de respaldo', () => {
    const filas = comprasPorComercio([
      compra({ id: 1, comercioId: null, comercio: 'Comercio no disponible' }),
      compra({ id: 2, comercioId: null, comercio: 'Comercio no disponible' }),
    ])
    expect(filas).toHaveLength(1)
    expect(filas[0].compras).toBe(2)
  })
})

describe('textoMetodoRegistro', () => {
  it('dice cómo se encontró al socio', () => {
    expect(textoMetodoRegistro('qr')).toBe('Escaneó el carnet')
    expect(textoMetodoRegistro('numero')).toBe('Tecleó el número')
    expect(textoMetodoRegistro(null)).toBe('Sin dato')
  })
})
