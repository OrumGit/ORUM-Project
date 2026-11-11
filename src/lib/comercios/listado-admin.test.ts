import { describe, expect, it } from 'vitest'
import {
  contarPorPestanaComercio,
  filtrarComercios,
  leerPestanaComercio,
  type FilaComercio,
} from './listado-admin'

const fila = (f: Partial<FilaComercio>): FilaComercio => ({
  id: 1,
  nombre: 'Café Arábigo',
  logoUrl: null,
  categoriaIds: [1],
  categorias: ['Cafés'],
  activo: true,
  sucursales: 1,
  promociones: 1,
  imagenes: 0,
  visible: { publico: true, miembros: true },
  calificacion: { total: 0, promedio: null },
  ...f,
})

const FILAS = [
  fila({ id: 1 }),
  fila({ id: 2, nombre: 'Heladería Polo', categoriaIds: [2], categorias: ['Heladerías'], promociones: 0 }),
  fila({ id: 3, nombre: 'Asadero', categoriaIds: [3], categorias: ['Restaurantes'], activo: false }),
]

describe('lista de comercios del panel', () => {
  it('lee la pestaña y cae a «todos» si no la conoce', () => {
    expect(leerPestanaComercio('inactivos')).toBe('inactivos')
    expect(leerPestanaComercio('otra')).toBe('todos')
    expect(leerPestanaComercio(undefined)).toBe('todos')
  })

  it('cuenta por pestaña; «sin promociones» solo entre los activos', () => {
    expect(contarPorPestanaComercio(FILAS)).toEqual({
      todos: 3,
      activos: 2,
      'sin-promociones': 1,
      ocultos: 0,
      inactivos: 1,
    })
  })

  it('busca sin tildes, filtra por categoría y ordena por nombre', () => {
    const base = { pestana: 'todos' as const, categoriaId: null }
    expect(filtrarComercios(FILAS, { ...base, busqueda: 'cafe' }).map((f) => f.id)).toEqual([1])
    expect(filtrarComercios(FILAS, { ...base, busqueda: 'helader' }).map((f) => f.id)).toEqual([2])
    expect(filtrarComercios(FILAS, { ...base, busqueda: '', categoriaId: 3 }).map((f) => f.id)).toEqual([3])
    expect(filtrarComercios(FILAS, { ...base, busqueda: '' }).map((f) => f.nombre)).toEqual([
      'Asadero',
      'Café Arábigo',
      'Heladería Polo',
    ])
  })

  it('con varias categorías aparece al filtrar por cualquiera y se busca por todas', () => {
    const filas = [fila({ id: 9, nombre: 'Barbería', categoriaIds: [4, 5], categorias: ['Belleza', 'Moda'] })]
    const base = { pestana: 'todos' as const, busqueda: '' }
    expect(filtrarComercios(filas, { ...base, categoriaId: 4 })).toHaveLength(1)
    expect(filtrarComercios(filas, { ...base, categoriaId: 5 })).toHaveLength(1)
    expect(filtrarComercios(filas, { ...base, categoriaId: 6 })).toHaveLength(0)
    expect(filtrarComercios(filas, { pestana: 'todos', busqueda: 'moda', categoriaId: null })).toHaveLength(1)
  })

  it('un comercio sin categorías no sale al filtrar por una, y sí sin filtro', () => {
    const filas = [fila({ id: 8, categoriaIds: [], categorias: [] })]
    const base = { pestana: 'todos' as const, busqueda: '' }
    expect(filtrarComercios(filas, { ...base, categoriaId: 1 })).toHaveLength(0)
    expect(filtrarComercios(filas, { ...base, categoriaId: null })).toHaveLength(1)
  })

  it('«ocultos»: activos que no se ven en NINGÚN portal', () => {
    const filas = [
      fila({ id: 4, visible: { publico: false, miembros: false } }),
      fila({ id: 5, visible: { publico: false, miembros: true } }),
      fila({ id: 6, activo: false, visible: { publico: false, miembros: false } }),
    ]
    expect(contarPorPestanaComercio(filas).ocultos).toBe(1)
    expect(leerPestanaComercio('ocultos')).toBe('ocultos')
    const base = { busqueda: '', categoriaId: null }
    expect(filtrarComercios(filas, { ...base, pestana: 'ocultos' }).map((f) => f.id)).toEqual([4])
  })
})
