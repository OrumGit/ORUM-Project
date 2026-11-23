import { describe, it, expect } from 'vitest'
import {
  armarTopCalificados,
  armarTopVentas,
  hayTop,
  LOGOS_POR_MITAD,
  MINIMO_DESFILE,
  mezclar,
  mezclarTop,
  repeticionesDesfile,
  TOPE_TOP,
  type ComercioDelTop,
} from './top-comercios'

function comercio(id: number, nombre: string): ComercioDelTop {
  return {
    id,
    nombre,
    logoUrl: null,
    categorias: [
      { categoriaId: 1, categoriaNombre: 'Gastronomía', subcategoriaId: 3, subcategoriaNombre: 'Pizzerías' },
    ],
    ciudades: ['Bogotá'],
  }
}

const COMERCIOS = new Map<number, ComercioDelTop>(
  [
    comercio(1, 'Alfa'),
    comercio(2, 'Beta'),
    comercio(3, 'Gamma'),
    comercio(4, 'Delta'),
    comercio(5, 'Épsilon'),
    comercio(6, 'Zeta'),
    comercio(7, 'Eta'),
  ].map((c) => [c.id, c]),
)

describe('armarTopCalificados', () => {
  it('ordena por promedio, luego por total y luego por nombre, y numera desde 1', () => {
    const top = armarTopCalificados(
      [
        { comercio_id: 3, promedio: 4.5, total: 10 },
        { comercio_id: 2, promedio: 4.9, total: 5 },
        { comercio_id: 1, promedio: 4.5, total: 10 },
        { comercio_id: 4, promedio: 4.5, total: 20 },
      ],
      COMERCIOS,
    )
    expect(top.map((i) => i.nombre)).toEqual(['Beta', 'Delta', 'Alfa', 'Gamma'])
    expect(top.map((i) => i.posicion)).toEqual([1, 2, 3, 4])
  })

  it('descarta un comercio que no está en el catálogo', () => {
    const top = armarTopCalificados(
      [
        { comercio_id: 99, promedio: 5, total: 9 },
        { comercio_id: 1, promedio: 4, total: 3 },
      ],
      COMERCIOS,
    )
    expect(top.map((i) => i.comercioId)).toEqual([1])
  })

  it('corta a TOPE_TOP', () => {
    const filas = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ comercio_id: id, promedio: 4, total: 3 }))
    expect(armarTopCalificados(filas, COMERCIOS)).toHaveLength(TOPE_TOP)
  })

  it('escribe el promedio con coma y un decimal', () => {
    const [a, b] = armarTopCalificados(
      [
        { comercio_id: 1, promedio: 4.9, total: 12 },
        { comercio_id: 2, promedio: 4, total: 3 },
      ],
      COMERCIOS,
    )
    expect(a.dato).toBe('★ 4,9')
    expect(a.datoAccesible).toBe('4,9 de 5 estrellas, 12 reseñas')
    expect(b.dato).toBe('★ 4,0')
    expect(b.datoAccesible).toBe('4,0 de 5 estrellas, 3 reseñas')
  })

  it('descarta comercios con menos de 3 reseñas', () => {
    const top = armarTopCalificados(
      [
        { comercio_id: 1, promedio: 5, total: 2 },
        { comercio_id: 2, promedio: 4, total: 3 },
      ],
      COMERCIOS,
    )
    expect(top.map((i) => i.comercioId)).toEqual([2])
  })

  it('usa el detalle de categorías y ciudades del comercio', () => {
    const [a] = armarTopCalificados([{ comercio_id: 1, promedio: 4, total: 3 }], COMERCIOS)
    expect(a.detalle).toBe('Gastronomía (Pizzerías) · Bogotá')
  })
})

describe('armarTopVentas', () => {
  it('ordena por ventas y luego por nombre', () => {
    const top = armarTopVentas(
      [
        { comercio_id: 2, ventas: 10 },
        { comercio_id: 1, ventas: 10 },
        { comercio_id: 3, ventas: 50 },
      ],
      COMERCIOS,
    )
    expect(top.map((i) => i.nombre)).toEqual(['Gamma', 'Alfa', 'Beta'])
  })

  it('no dice cuántas ventas hizo cada comercio, solo el orden', () => {
    const top = armarTopVentas(
      [
        { comercio_id: 1, ventas: 1280 },
        { comercio_id: 2, ventas: 128 },
        { comercio_id: 3, ventas: 1 },
      ],
      COMERCIOS,
    )
    expect(top.map((i) => i.posicion)).toEqual([1, 2, 3])
    expect(top.map((i) => i.dato)).toEqual(['', '', ''])
    expect(top.every((i) => i.datoAccesible === '')).toBe(true)
  })

  it('descarta comercios con 0 ventas y los que no están en el catálogo', () => {
    const top = armarTopVentas(
      [
        { comercio_id: 1, ventas: 0 },
        { comercio_id: 99, ventas: 8 },
        { comercio_id: 2, ventas: 2 },
      ],
      COMERCIOS,
    )
    expect(top.map((i) => i.comercioId)).toEqual([2])
  })

  it('corta a TOPE_TOP', () => {
    const filas = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ comercio_id: id, ventas: 3 }))
    expect(armarTopVentas(filas, COMERCIOS)).toHaveLength(TOPE_TOP)
  })
})

describe('hayTop', () => {
  const item = armarTopVentas([{ comercio_id: 1, ventas: 1 }], COMERCIOS)

  it('es falso con null o con las dos listas vacías', () => {
    expect(hayTop(null)).toBe(false)
    expect(hayTop({ calificados: [], ventas: [] })).toBe(false)
  })

  it('es verdadero si cualquiera de las dos tiene algo', () => {
    expect(hayTop({ calificados: item, ventas: [] })).toBe(true)
    expect(hayTop({ calificados: [], ventas: item })).toBe(true)
  })
})

describe('el desfile de logos', () => {
  // Generador fijo: siempre el mismo «azar», para que la prueba sea estable.
  const fijo = (valores: number[]) => {
    let i = 0
    return () => valores[i++ % valores.length]
  }

  it('mezclar conserva los mismos elementos y no toca la lista original', () => {
    const original = [1, 2, 3, 4, 5]
    const mezclada = mezclar(original, fijo([0.1, 0.7, 0.3, 0.9]))
    expect(original).toEqual([1, 2, 3, 4, 5])
    expect([...mezclada].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('mezclar cambia el orden cuando el azar lo pide', () => {
    // Con 0 siempre, cada paso cambia el último con el primero.
    expect(mezclar([1, 2, 3], () => 0)).toEqual([2, 3, 1])
  })

  it('mezclar aguanta listas vacías y de uno', () => {
    expect(mezclar([], Math.random)).toEqual([])
    expect(mezclar(['a'], Math.random)).toEqual(['a'])
  })

  it('mezclarTop mezcla las dos listas sin perder a nadie', () => {
    const comercios = new Map([1, 2, 3].map((id) => [id, comercio(id, `C${id}`)]))
    const top = {
      calificados: armarTopCalificados([{ comercio_id: 1, promedio: 5, total: 3 }], comercios),
      ventas: armarTopVentas(
        [1, 2, 3].map((id) => ({ comercio_id: id, ventas: 10 - id })),
        comercios,
      ),
    }
    const mezclado = mezclarTop(top, () => 0)
    expect(mezclado.calificados).toHaveLength(1)
    expect(mezclado.ventas.map((v) => v.comercioId).sort()).toEqual([1, 2, 3])
  })

  it('repite la lista hasta llenar media cinta', () => {
    expect(repeticionesDesfile(0)).toBe(0)
    expect(repeticionesDesfile(5)).toBe(3)
    expect(repeticionesDesfile(3)).toBe(4)
    expect(repeticionesDesfile(5) * 5).toBeGreaterThanOrEqual(LOGOS_POR_MITAD)
    expect(repeticionesDesfile(LOGOS_POR_MITAD)).toBe(1)
  })

  it('por debajo del mínimo no hay desfile', () => {
    expect(MINIMO_DESFILE).toBe(3)
  })
})
