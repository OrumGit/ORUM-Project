import { describe, expect, it } from 'vitest'
import { leerPeriodo, PERIODOS_CON_HOY } from '../shared/periodo'
import {
  diaBogota,
  resumirVentasEmpleado,
  textoTipoVenta,
  ventasPorDia,
  ventasPorPlan,
  type VentaEmpleado,
} from './ventas-empleado'

const venta = (extra: Partial<VentaEmpleado>): VentaEmpleado => ({
  id: 1,
  fechaHora: '2026-11-20T15:00:00Z',
  miembroId: 1,
  miembro: 'Ana Ruiz',
  numero: '00090001',
  plan: 'Anual',
  tipo: 'nueva',
  precio: 250000,
  esCortesia: false,
  inicio: '2026-11-20',
  fin: '2027-11-20',
  ...extra,
})

describe('diaBogota', () => {
  it('una venta a las 8 p. m. de Colombia es de ese día, no del siguiente', () => {
    // 2026-11-21 01:00 UTC = 2026-11-20 20:00 en Bogotá.
    expect(diaBogota('2026-11-21T01:00:00Z')).toBe('2026-11-20')
  })

  it('a la medianoche de Colombia ya es el día siguiente', () => {
    expect(diaBogota('2026-11-21T05:00:00Z')).toBe('2026-11-21')
  })

  it('entiende el formato con offset de Postgres', () => {
    expect(diaBogota('2026-11-20 23:30:00+00')).toBe('2026-11-20')
  })
})

describe('resumirVentasEmpleado', () => {
  it('sin ventas: todo en cero y sin promedio', () => {
    expect(resumirVentasEmpleado([])).toEqual({
      vendidas: 0,
      nuevas: 0,
      renovaciones: 0,
      ingreso: 0,
      promedio: null,
      cortesias: 0,
      registros: 0,
      dias: 0,
    })
  })

  it('cuenta nuevas y renovaciones, y las cortesías aparte sin sumar dinero', () => {
    const r = resumirVentasEmpleado([
      venta({ id: 1, tipo: 'nueva', precio: 250000 }),
      venta({ id: 2, tipo: 'renovada', precio: 30000, fechaHora: '2026-11-22T15:00:00Z' }),
      venta({ id: 3, tipo: 'nueva', precio: 0, esCortesia: true }),
    ])
    expect(r).toEqual({
      vendidas: 2,
      nuevas: 1,
      renovaciones: 1,
      ingreso: 280000,
      promedio: 140000,
      cortesias: 1,
      registros: 3,
      dias: 2,
    })
  })

  it('solo cortesías: sin promedio', () => {
    expect(resumirVentasEmpleado([venta({ esCortesia: true, precio: 0 })]).promedio).toBeNull()
  })
})

describe('ventasPorDia', () => {
  it('agrupa por día de Colombia, del más reciente al más antiguo', () => {
    const dias = ventasPorDia([
      venta({ id: 1, fechaHora: '2026-11-20T15:00:00Z', precio: 100 }),
      venta({ id: 2, fechaHora: '2026-11-21T01:00:00Z', precio: 50 }), // 20 nov, 8 p. m.
      venta({ id: 3, fechaHora: '2026-11-22T15:00:00Z', precio: 0, esCortesia: true }),
    ])
    expect(dias).toEqual([
      { clave: '2026-11-22', nombre: '2026-11-22', vendidas: 0, cortesias: 1, ingreso: 0 },
      { clave: '2026-11-20', nombre: '2026-11-20', vendidas: 2, cortesias: 0, ingreso: 150 },
    ])
  })
})

describe('ventasPorPlan', () => {
  it('de más a menos vendidas; un plan sin nombre cae en «Sin plan»', () => {
    const planes = ventasPorPlan([
      venta({ id: 1, plan: 'Mensual', precio: 30000 }),
      venta({ id: 2, plan: 'Anual', precio: 250000 }),
      venta({ id: 3, plan: 'Anual', precio: 250000 }),
      venta({ id: 4, plan: ' ', precio: 0, esCortesia: true }),
    ])
    expect(planes.map((p) => [p.nombre, p.vendidas, p.cortesias, p.ingreso])).toEqual([
      ['Anual', 2, 0, 500000],
      ['Mensual', 1, 0, 30000],
      ['Sin plan', 0, 1, 0],
    ])
  })
})

describe('textoTipoVenta', () => {
  it('dice si fue un miembro nuevo o una renovación', () => {
    expect(textoTipoVenta('nueva')).toBe('Nuevo miembro')
    expect(textoTipoVenta('renovada')).toBe('Renovación')
  })
})

describe('el periodo «Hoy»', () => {
  it('va detrás de «Todo» en las pestañas del empleado', () => {
    expect(PERIODOS_CON_HOY.map((p) => p.clave)).toEqual(['todo', 'hoy', 'semana', 'mes', '30dias', 'anio'])
  })

  it('es solo el día de hoy', () => {
    expect(leerPeriodo({ periodo: 'hoy' }, '2026-11-25')).toEqual({
      periodo: 'hoy',
      desde: '2026-11-25',
      hasta: '2026-11-25',
    })
  })
})
