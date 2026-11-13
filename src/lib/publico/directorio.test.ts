import { describe, it, expect } from 'vitest'
import {
  alternarCategoria,
  filtrarFavoritos,
  compararNombres,
  filtrarDirectorio,
  hayFiltros,
  hrefDirectorio,
  leerFiltrosDirectorio,
  ordenarCategorias,
  quitarSubcategoriasDe,
  detalleComercio,
  etiquetaCategoria,
  type CategoriaDeComercio,
  type ComercioFiltrable,
  type FiltrosDirectorio,
} from './directorio'

const SIN_FILTROS: FiltrosDirectorio = {
  q: '',
  categoriaIds: [],
  subcategoriaIds: [],
  ciudadId: null,
  orden: 'az',
  soloFavoritos: false,
  beneficio: null,
}

function comercio(
  nombre: string,
  extra: Partial<ComercioFiltrable> = {},
): ComercioFiltrable {
  return {
    nombre,
    categorias: [],
    ciudadIds: [],
    ciudades: [],
    ...extra,
  }
}

function cat(
  categoriaId: number,
  categoriaNombre: string,
  subcategoriaId: number | null = null,
  subcategoriaNombre: string | null = null,
): CategoriaDeComercio {
  return { categoriaId, categoriaNombre, subcategoriaId, subcategoriaNombre }
}

describe('leerFiltrosDirectorio', () => {
  it('sin parámetros devuelve el directorio entero, de la A a la Z', () => {
    expect(leerFiltrosDirectorio({})).toEqual(SIN_FILTROS)
  })

  it('lee los cuatro filtros', () => {
    expect(
      leerFiltrosDirectorio({ q: '  café ', categoria_id: '3', ciudad_id: '7', orden: 'za' }),
    ).toEqual({
      q: 'café',
      categoriaIds: [3],
      subcategoriaIds: [],
      ciudadId: 7,
      orden: 'za',
      soloFavoritos: false,
      beneficio: null,
    })
  })

  it('lee varias categorías: con comas, repetidas, sin duplicados y ordenadas', () => {
    expect(leerFiltrosDirectorio({ categoria_id: '7,3,7' }).categoriaIds).toEqual([3, 7])
    expect(leerFiltrosDirectorio({ categoria_id: ['9', '2,x'] }).categoriaIds).toEqual([2, 9])
  })

  it('descarta ids que no son enteros positivos', () => {
    const f = leerFiltrosDirectorio({ categoria_id: 'abc', ciudad_id: '-2' })
    expect(f.categoriaIds).toEqual([])
    expect(f.ciudadId).toBeNull()
    expect(leerFiltrosDirectorio({ categoria_id: '1.5' }).categoriaIds).toEqual([])
  })

  it('un orden desconocido cae al de por defecto', () => {
    expect(leerFiltrosDirectorio({ orden: 'precio' }).orden).toBe('az')
  })

  it('con parámetros repetidos se queda con el primero', () => {
    expect(leerFiltrosDirectorio({ q: ['uno', 'dos'] }).q).toBe('uno')
  })

  it('recorta una búsqueda desmesurada', () => {
    expect(leerFiltrosDirectorio({ q: 'x'.repeat(500) }).q).toHaveLength(80)
  })
})

describe('hrefDirectorio', () => {
  it('sin filtros es la ruta a secas', () => {
    expect(hrefDirectorio(SIN_FILTROS)).toBe('/explorar')
  })

  it('cambia un filtro y conserva los demás', () => {
    const actuales = { ...SIN_FILTROS, q: 'pan', ciudadId: 2 }
    expect(hrefDirectorio(actuales, { categoriaIds: [5] })).toBe(
      '/explorar?q=pan&categoria_id=5&ciudad_id=2',
    )
  })

  it('varias categorías van en una lista legible con comas', () => {
    expect(hrefDirectorio(SIN_FILTROS, { categoriaIds: [3, 7] })).toBe(
      '/explorar?categoria_id=3,7',
    )
  })

  it('quitar un filtro lo saca de la URL', () => {
    const actuales = { ...SIN_FILTROS, categoriaIds: [5] }
    expect(hrefDirectorio(actuales, { categoriaIds: [] })).toBe('/explorar')
  })

  it('la misma URL sobre otra base (el directorio del socio en /miembros)', () => {
    expect(hrefDirectorio(SIN_FILTROS, {}, '/miembros')).toBe('/miembros')
    expect(hrefDirectorio({ ...SIN_FILTROS, q: 'pan' }, { ciudadId: 2 }, '/miembros')).toBe(
      '/miembros?q=pan&ciudad_id=2',
    )
  })

  it('el orden por defecto no ensucia la URL', () => {
    expect(hrefDirectorio({ ...SIN_FILTROS, orden: 'za' }, { orden: 'az' })).toBe('/explorar')
    expect(hrefDirectorio(SIN_FILTROS, { orden: 'za' })).toBe('/explorar?orden=za')
  })
})

describe('compararNombres', () => {
  it('ordena los números por su valor, no por su primer dígito', () => {
    const nombres = ['Café 10', 'Café 2', 'Café 1']
    expect([...nombres].sort(compararNombres)).toEqual(['Café 1', 'Café 2', 'Café 10'])
  })

  it('no distingue mayúsculas ni tildes', () => {
    expect(compararNombres('arepa', 'Árbol')).toBeGreaterThan(0)
    expect(compararNombres('café', 'CAFE')).toBe(0)
  })
})

describe('filtrarDirectorio', () => {
  const lista = [
    comercio('Zapatería Luna', { categorias: [cat(2, 'Ropa', null, 'Calzado de mujer')], ciudadIds: [1], ciudades: ['Bogotá'] }),
    comercio('Café 10', { categorias: [cat(1, 'Café')], ciudadIds: [2], ciudades: ['Medellín'] }),
    comercio('Café 2', { categorias: [cat(1, 'Café')], ciudadIds: [1, 2], ciudades: ['Bogotá', 'Medellín'] }),
    comercio('Ámbar Spa', { categorias: [cat(3, 'Spa')], ciudadIds: [1], ciudades: ['Bogotá'] }),
  ]

  const nombres = (xs: ComercioFiltrable[]) => xs.map((x) => x.nombre)

  it('sin filtros ordena de la A a la Z, con números naturales y sin tildes', () => {
    expect(nombres(filtrarDirectorio(lista, SIN_FILTROS))).toEqual([
      'Ámbar Spa',
      'Café 2',
      'Café 10',
      'Zapatería Luna',
    ])
  })

  it('de la Z a la A invierte el orden', () => {
    expect(nombres(filtrarDirectorio(lista, { ...SIN_FILTROS, orden: 'za' }))).toEqual([
      'Zapatería Luna',
      'Café 10',
      'Café 2',
      'Ámbar Spa',
    ])
  })

  it('filtra por categoría y por ciudad a la vez', () => {
    const f = { ...SIN_FILTROS, categoriaIds: [1], ciudadId: 1 }
    expect(nombres(filtrarDirectorio(lista, f))).toEqual(['Café 2'])
  })

  it('con varias categorías enseña los comercios de cualquiera de ellas', () => {
    const f = { ...SIN_FILTROS, categoriaIds: [2, 3] }
    expect(nombres(filtrarDirectorio(lista, f))).toEqual(['Ámbar Spa', 'Zapatería Luna'])
  })

  it('la búsqueda casa con el nombre, sin tildes ni mayúsculas', () => {
    expect(nombres(filtrarDirectorio(lista, { ...SIN_FILTROS, q: 'ZAPATERIA' }))).toEqual([
      'Zapatería Luna',
    ])
  })

  it('la búsqueda casa con la categoría y con la ciudad', () => {
    expect(nombres(filtrarDirectorio(lista, { ...SIN_FILTROS, q: 'spa' }))).toEqual(['Ámbar Spa'])
    expect(nombres(filtrarDirectorio(lista, { ...SIN_FILTROS, q: 'medellin' }))).toEqual([
      'Café 2',
      'Café 10',
    ])
  })

  it('la búsqueda casa con la subcategoría, sin tildes', () => {
    expect(nombres(filtrarDirectorio(lista, { ...SIN_FILTROS, q: 'CALZADO' }))).toEqual([
      'Zapatería Luna',
    ])
    // Un comercio sin subcategoría sigue buscándose por lo demás.
    expect(nombres(filtrarDirectorio(lista, { ...SIN_FILTROS, q: 'cafe 2' }))).toEqual(['Café 2'])
  })

  it('no muta la lista de entrada', () => {
    const copia = [...lista]
    filtrarDirectorio(lista, { ...SIN_FILTROS, orden: 'za' })
    expect(lista).toEqual(copia)
  })
})

describe('ordenarCategorias', () => {
  it('ordena alfabéticamente y deja «Otros» al final', () => {
    const cats = ['Spa', 'Otros', 'Café', 'Alimentos saludables'].map((nombre, id) => ({ id, nombre }))
    expect(ordenarCategorias(cats).map((c) => c.nombre)).toEqual([
      'Alimentos saludables',
      'Café',
      'Spa',
      'Otros',
    ])
  })
})

describe('hayFiltros', () => {
  it('el orden no cuenta como filtro', () => {
    expect(hayFiltros({ ...SIN_FILTROS, orden: 'za' })).toBe(false)
    expect(hayFiltros({ ...SIN_FILTROS, q: 'x' })).toBe(true)
    expect(hayFiltros({ ...SIN_FILTROS, ciudadId: 1 })).toBe(true)
  })
})

describe('alternarCategoria', () => {
  it('enciende la que falta y la deja ordenada', () => {
    expect(alternarCategoria([7], 3)).toEqual([3, 7])
  })

  it('apaga la que ya estaba', () => {
    expect(alternarCategoria([3, 7], 7)).toEqual([3])
  })

  it('no toca la lista de entrada', () => {
    const ids = [3]
    alternarCategoria(ids, 5)
    expect(ids).toEqual([3])
  })
})

describe('favoritos', () => {
  it('lee ?favoritos=1 y lo escribe de vuelta', () => {
    expect(leerFiltrosDirectorio({ favoritos: '1' }).soloFavoritos).toBe(true)
    expect(leerFiltrosDirectorio({ favoritos: 'si' }).soloFavoritos).toBe(false)
    expect(hrefDirectorio(SIN_FILTROS, { soloFavoritos: true }, '/miembros')).toBe(
      '/miembros?favoritos=1',
    )
  })

  it('cuenta como filtro para el estado vacío', () => {
    expect(hayFiltros({ ...SIN_FILTROS, soloFavoritos: true })).toBe(true)
  })

  it('deja solo los favoritos, en el orden de la lista', () => {
    const lista = [{ id: 3 }, { id: 1 }, { id: 2 }]
    expect(filtrarFavoritos(lista, [2, 3, 9])).toEqual([{ id: 3 }, { id: 2 }])
    expect(filtrarFavoritos(lista, [])).toEqual([])
  })
})

describe('subcategorías', () => {
  // Gastronomía (1): Pizzerías (3) y Alitas (4). Belleza (3): Uñas (15).
  const categoriaDe = new Map([
    [3, 1],
    [4, 1],
    [15, 3],
  ])
  const lista = [
    comercio('Pizza Roma', { categorias: [cat(1, 'c1', 3)] }),
    comercio('Alitas Ya', { categorias: [cat(1, 'c1', 4)] }),
    comercio('Sin sub', { categorias: [cat(1, 'c1', null)] }),
    comercio('Uñas Bellas', { categorias: [cat(3, 'c3', 15)] }),
    comercio('Peluquería Ana', { categorias: [cat(3, 'c3', null)] }),
  ]
  const nombres = (f: Partial<FiltrosDirectorio>) =>
    filtrarDirectorio(lista, { ...SIN_FILTROS, ...f }, categoriaDe).map((c) => c.nombre)

  it('se leen de la URL y vuelven a ella con comas', () => {
    const f = leerFiltrosDirectorio({ categoria_id: '1', subcategoria_id: '4,3,x' })
    expect(f.subcategoriaIds).toEqual([3, 4])
    expect(hrefDirectorio(f)).toBe('/explorar?categoria_id=1&subcategoria_id=3,4')
  })

  it('afinan su categoría: solo las elegidas', () => {
    expect(nombres({ categoriaIds: [1], subcategoriaIds: [3] })).toEqual(['Pizza Roma'])
    expect(nombres({ categoriaIds: [1], subcategoriaIds: [3, 4] })).toEqual(['Alitas Ya', 'Pizza Roma'])
  })

  it('una categoría sin subcategorías elegidas se ve entera', () => {
    expect(nombres({ categoriaIds: [1, 3], subcategoriaIds: [15] })).toEqual([
      'Alitas Ya',
      'Pizza Roma',
      'Sin sub',
      'Uñas Bellas',
    ])
  })

  it('una subcategoría de una categoría que no está elegida no filtra nada', () => {
    expect(nombres({ categoriaIds: [3], subcategoriaIds: [3] })).toEqual(['Peluquería Ana', 'Uñas Bellas'])
  })

  it('al apagar una categoría se van sus subcategorías', () => {
    expect(quitarSubcategoriasDe([3, 4, 15], 1, categoriaDe)).toEqual([15])
  })

  it('cuentan como filtro puesto', () => {
    expect(hayFiltros({ ...SIN_FILTROS, subcategoriaIds: [3] })).toBe(true)
  })
})

describe('varias categorías', () => {
  const lista = [
    comercio('Barbería Dos Mundos', { categorias: [cat(3, 'Belleza', 15), cat(1, 'Gastronomía')] }),
    comercio('Pizza Roma', { categorias: [cat(1, 'Gastronomía', 3, 'Pizzerías')] }),
    comercio('Sin categoría'),
  ]
  const categoriaDe = new Map([
    [3, 1],
    [15, 3],
  ])
  const nombres = (f: Partial<FiltrosDirectorio>) =>
    filtrarDirectorio(lista, { ...SIN_FILTROS, ...f }, categoriaDe).map((c) => c.nombre)

  it('sale bajo cualquiera de sus categorías', () => {
    expect(nombres({ categoriaIds: [3] })).toEqual(['Barbería Dos Mundos'])
    expect(nombres({ categoriaIds: [1] })).toEqual(['Barbería Dos Mundos', 'Pizza Roma'])
  })

  it('con dos de sus categorías elegidas sale una sola vez', () => {
    expect(nombres({ categoriaIds: [1, 3] })).toEqual(['Barbería Dos Mundos', 'Pizza Roma'])
  })

  it('un comercio sin categorías no sale al filtrar por categoría, y sí sin filtro', () => {
    expect(nombres({ categoriaIds: [1] })).not.toContain('Sin categoría')
    expect(nombres({})).toContain('Sin categoría')
  })

  it('la subcategoría afina SOLO su categoría', () => {
    // Gastronomía + Pizzerías: la barbería tiene Gastronomía sin subcategoría y Belleza.
    expect(nombres({ categoriaIds: [1], subcategoriaIds: [3] })).toEqual(['Pizza Roma'])
    // Con Belleza elegida también, la barbería sale por Belleza, entera.
    expect(nombres({ categoriaIds: [1, 3], subcategoriaIds: [3] })).toEqual([
      'Barbería Dos Mundos',
      'Pizza Roma',
    ])
  })

  it('la búsqueda casa con cualquiera de sus categorías y subcategorías', () => {
    expect(nombres({ q: 'belleza' })).toEqual(['Barbería Dos Mundos'])
    expect(nombres({ q: 'pizzerias' })).toEqual(['Pizza Roma'])
  })

  it('etiquetaCategoria dice la categoría y, si hay, su subcategoría', () => {
    expect(etiquetaCategoria(cat(1, 'Gastronomía', 3, 'Pizzerías'))).toBe('Gastronomía (Pizzerías)')
    expect(etiquetaCategoria(cat(1, 'Gastronomía'))).toBe('Gastronomía')
  })

  it('detalleComercio junta todas las categorías y luego las ciudades', () => {
    expect(
      detalleComercio([cat(1, 'Gastronomía', 3, 'Pizzerías'), cat(3, 'Belleza')], ['Bogotá', 'Cali']),
    ).toBe('Gastronomía (Pizzerías), Belleza · Bogotá, Cali')
    expect(detalleComercio([], ['Bogotá'])).toBe('Bogotá')
    expect(detalleComercio([cat(1, 'Gastronomía')], [])).toBe('Gastronomía')
    expect(detalleComercio([], [])).toBe('')
  })
})

describe('filtro por beneficio (portal de miembros)', () => {
  it('lee el tipo de la URL y descarta lo que no es un tipo', () => {
    expect(leerFiltrosDirectorio({ beneficio: 'regalo' }).beneficio).toBe('regalo')
    expect(leerFiltrosDirectorio({ beneficio: 'dos_por_uno' }).beneficio).toBe('dos_por_uno')
    expect(leerFiltrosDirectorio({ beneficio: 'gratis' }).beneficio).toBeNull()
  })

  it('va a la URL y cuenta como filtro', () => {
    expect(hrefDirectorio(SIN_FILTROS, { beneficio: 'porcentaje' }, '/miembros')).toBe(
      '/miembros?beneficio=porcentaje',
    )
    expect(hayFiltros({ ...SIN_FILTROS, beneficio: 'regalo' })).toBe(true)
  })

  it('deja solo los comercios con una promoción vigente de ese tipo', () => {
    const lista = [
      comercio('Café', { tiposBeneficio: ['porcentaje', 'regalo'] }),
      comercio('Bar', { tiposBeneficio: ['dos_por_uno'] }),
      comercio('Spa'),
    ]
    const nombres = (beneficio: FiltrosDirectorio['beneficio']) =>
      filtrarDirectorio(lista, { ...SIN_FILTROS, beneficio }).map((c) => c.nombre)
    expect(nombres('regalo')).toEqual(['Café'])
    expect(nombres('dos_por_uno')).toEqual(['Bar'])
    expect(nombres('monto_fijo')).toEqual([])
    expect(nombres(null)).toEqual(['Bar', 'Café', 'Spa'])
  })
})
