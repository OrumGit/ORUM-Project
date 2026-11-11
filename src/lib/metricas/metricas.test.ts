import { describe, it, expect } from 'vitest'
import {
  rangoUltimosDias,
  agruparMembresiasPorEmpleado,
  agruparVentasPorComercio,
  agruparVentasPorMiembroYComercio,
  detallarVentas,
  totalesVentas,
  normalizarRango,
} from './metricas'

describe('rangoUltimosDias', () => {
  it('calcula desde/hasta en formato YYYY-MM-DD', () => {
    const rango = rangoUltimosDias(30, new Date('2026-07-31T12:00:00Z'))
    expect(rango).toEqual({ desde: '2026-07-01', hasta: '2026-07-31' })
  })

  it('cruza el límite de año correctamente', () => {
    // 15:00Z = 10:00 en America/Bogota (UTC-5), mismo día calendario en ambas
    // zonas horarias — evita ambigüedad de límite de día en la aserción.
    const rango = rangoUltimosDias(10, new Date('2026-01-05T15:00:00Z'))
    expect(rango).toEqual({ desde: '2025-12-26', hasta: '2026-01-05' })
  })
})

describe('agruparMembresiasPorEmpleado', () => {
  const empleados = [
    { id: 1, nombres: 'Ana', apellidos: 'Ruiz' },
    { id: 2, nombres: 'Luis', apellidos: 'Pardo' },
  ]

  it('agrupa cantidad y monto por empleado', () => {
    const resultado = agruparMembresiasPorEmpleado(
      [
        { vendido_por: 1, precio_pagado: 50000 },
        { vendido_por: 1, precio_pagado: 30000 },
        { vendido_por: 2, precio_pagado: 20000 },
      ],
      empleados,
    )
    expect(resultado).toEqual([
      { empleadoId: 1, nombre: 'Ana Ruiz', cantidad: 2, monto: 80000 },
      { empleadoId: 2, nombre: 'Luis Pardo', cantidad: 1, monto: 20000 },
    ])
  })

  it('agrupa vendido_por null bajo "Super admin"', () => {
    const resultado = agruparMembresiasPorEmpleado(
      [{ vendido_por: null, precio_pagado: 40000 }],
      empleados,
    )
    expect(resultado).toEqual([{ empleadoId: null, nombre: 'Super admin', cantidad: 1, monto: 40000 }])
  })

  it('devuelve arreglo vacío sin membresías', () => {
    expect(agruparMembresiasPorEmpleado([], empleados)).toEqual([])
  })

  it('las cortesías no cuentan: ni en la cantidad ni en el monto', () => {
    const resultado = agruparMembresiasPorEmpleado(
      [
        { vendido_por: 1, precio_pagado: 50000, es_cortesia: false },
        { vendido_por: 1, precio_pagado: 0, es_cortesia: true },
        { vendido_por: 2, precio_pagado: 0, es_cortesia: true },
      ],
      empleados,
    )
    // El empleado 2 solo registró una cortesía: no aparece.
    expect(resultado).toEqual([{ empleadoId: 1, nombre: 'Ana Ruiz', cantidad: 1, monto: 50000 }])
  })

  it('una membresía sin el dato de cortesía se cuenta como vendida', () => {
    const resultado = agruparMembresiasPorEmpleado([{ vendido_por: 1, precio_pagado: 10000 }], empleados)
    expect(resultado[0]).toMatchObject({ cantidad: 1, monto: 10000 })
  })
})

describe('agruparVentasPorComercio', () => {
  const sucursales = [
    { id: 10, comercio_id: 100 },
    { id: 11, comercio_id: 200 },
  ]
  const comercios = [
    { id: 100, nombre: 'Restaurante A' },
    { id: 200, nombre: 'Tienda B' },
  ]

  it('agrupa cantidad, monto y descuento por comercio, ordenado desc por cantidad', () => {
    const resultado = agruparVentasPorComercio(
      [
        { sucursal_id: 10, miembro_id: 1, valor_final: 18000, valor_descuento: 2000 },
        { sucursal_id: 10, miembro_id: 2, valor_final: 9000, valor_descuento: 1000 },
        { sucursal_id: 11, miembro_id: 1, valor_final: 5000, valor_descuento: 500 },
      ],
      sucursales,
      comercios,
    )
    expect(resultado).toEqual([
      { comercioId: 100, nombre: 'Restaurante A', cantidad: 2, montoTotal: 27000, descuentoTotal: 3000 },
      { comercioId: 200, nombre: 'Tienda B', cantidad: 1, montoTotal: 5000, descuentoTotal: 500 },
    ])
  })

  it('devuelve arreglo vacío sin ventas', () => {
    expect(agruparVentasPorComercio([], sucursales, comercios)).toEqual([])
  })
})

describe('agruparVentasPorMiembroYComercio', () => {
  const sucursales = [{ id: 10, comercio_id: 100 }]
  const comercios = [{ id: 100, nombre: 'Restaurante A' }]
  const miembros = [{ id: 1, nombres: 'Juan', apellidos: 'Pérez' }]

  it('cuenta veces por par miembro+comercio', () => {
    const resultado = agruparVentasPorMiembroYComercio(
      [
        { sucursal_id: 10, miembro_id: 1, valor_final: 1000, valor_descuento: 0 },
        { sucursal_id: 10, miembro_id: 1, valor_final: 2000, valor_descuento: 0 },
      ],
      sucursales,
      comercios,
      miembros,
    )
    expect(resultado).toEqual([
      { miembroId: 1, miembroNombre: 'Juan Pérez', comercioId: 100, comercioNombre: 'Restaurante A', veces: 2 },
    ])
  })

  it('devuelve TODOS los pares (la página los muestra de a 10), ordenados desc por veces', () => {
    const ventas = Array.from({ length: 25 }, (_, i) => ({
      sucursal_id: 10,
      miembro_id: i + 1,
      valor_final: 1000,
      valor_descuento: 0,
    }))
    // Duplicar las ventas del miembro 1 para que quede primero.
    ventas.push({ sucursal_id: 10, miembro_id: 1, valor_final: 1000, valor_descuento: 0 })

    const miembrosAmpliados = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      nombres: `M${i + 1}`,
      apellidos: '',
    }))

    const resultado = agruparVentasPorMiembroYComercio(ventas, sucursales, comercios, miembrosAmpliados)
    expect(resultado).toHaveLength(25)
    expect(resultado[0]).toMatchObject({ miembroId: 1, veces: 2 })
  })

  it('ignora ventas de sucursales desconocidas', () => {
    const resultado = agruparVentasPorMiembroYComercio(
      [{ sucursal_id: 999, miembro_id: 1, valor_final: 1000, valor_descuento: 0 }],
      sucursales,
      comercios,
      miembros,
    )
    expect(resultado).toEqual([])
  })
})

describe('detallarVentas', () => {
  const sucursales = [
    { id: 10, nombre: 'Centro' },
    { id: 11, nombre: null },
  ]
  const miembros = [{ id: 1, nombres: 'Ana', apellidos: 'Ruiz' }]
  const promociones = [{ id: 5, titulo: '2x1 en cafés' }]
  const base = {
    id: 100,
    miembro_id: 1,
    sucursal_id: 10,
    promocion_id: 5,
    valor_compra: 50000,
    valor_descuento: 5000,
    valor_final: 45000,
    fecha_hora: '2026-09-30T01:30:00Z',
  }

  it('resuelve nombres de miembro, sucursal y promoción', () => {
    const [d] = detallarVentas([base], sucursales, miembros, promociones)
    expect(d).toEqual({
      id: 100,
      fechaHora: '2026-09-30T01:30:00Z',
      miembroNombre: 'Ana Ruiz',
      sucursalNombre: 'Centro',
      promocionTitulo: '2x1 en cafés',
      valorCompra: 50000,
      valorDescuento: 5000,
      valorFinal: 45000,
    })
  })

  it('conserva el orden recibido', () => {
    const resultado = detallarVentas(
      [{ ...base, id: 2 }, { ...base, id: 1 }],
      sucursales,
      miembros,
      promociones,
    )
    expect(resultado.map((d) => d.id)).toEqual([2, 1])
  })

  it('usa textos de respaldo cuando falta un dato', () => {
    const [d] = detallarVentas(
      [{ ...base, miembro_id: 9, sucursal_id: 11, promocion_id: null }],
      sucursales,
      miembros,
      promociones,
    )
    expect(d.miembroNombre).toBe('Miembro #9')
    expect(d.sucursalNombre).toBe('Sin nombre')
    expect(d.promocionTitulo).toBeNull()
  })

  it('no inventa una sucursal desconocida', () => {
    const [d] = detallarVentas([{ ...base, sucursal_id: 99 }], sucursales, miembros, promociones)
    expect(d.sucursalNombre).toBe('Sucursal #99')
  })
})

describe('totalesVentas', () => {
  it('suma cantidad, monto final y descuento', () => {
    expect(
      totalesVentas([
        { valor_final: 1000, valor_descuento: 100 },
        { valor_final: 2000, valor_descuento: 300 },
      ]),
    ).toEqual({ cantidad: 2, monto: 3000, descuento: 400 })
  })

  it('devuelve ceros sin ventas', () => {
    expect(totalesVentas([])).toEqual({ cantidad: 0, monto: 0, descuento: 0 })
  })
})

describe('normalizarRango', () => {
  const hoy = new Date('2026-07-31T12:00:00Z')

  it('acepta un rango válido', () => {
    expect(normalizarRango('2026-07-01', '2026-07-15', hoy)).toEqual({
      desde: '2026-07-01',
      hasta: '2026-07-15',
    })
  })

  it('cae al rango por defecto si falta o no es una fecha', () => {
    const defecto = { desde: '2026-07-01', hasta: '2026-07-31' }
    expect(normalizarRango(undefined, undefined, hoy)).toEqual(defecto)
    expect(normalizarRango('basura', '2026-07-15', hoy)).toEqual(defecto)
    expect(normalizarRango('2026-02-31', '2026-07-15', hoy)).toEqual(defecto)
  })

  it('cae al rango por defecto si desde es posterior a hasta', () => {
    expect(normalizarRango('2026-07-20', '2026-07-10', hoy)).toEqual({
      desde: '2026-07-01',
      hasta: '2026-07-31',
    })
  })
})
