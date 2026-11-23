import { describe, expect, it } from 'vitest'
import { leerEnPaginas } from './leer-en-paginas'

/** Una «tabla» de n filas que responde por rangos, como PostgREST. */
function tabla(n: number) {
  const filas = Array.from({ length: n }, (_, i) => i)
  const pedidos: [number, number][] = []
  const pedir = async (desde: number, hasta: number) => {
    pedidos.push([desde, hasta])
    return { data: filas.slice(desde, hasta + 1), error: null }
  }
  return { pedir, pedidos }
}

describe('leerEnPaginas', () => {
  it('trae todas las filas aunque pasen del tope de un lote', async () => {
    const { pedir, pedidos } = tabla(25)
    const filas = await leerEnPaginas(pedir, { porLote: 10 })
    expect(filas).toHaveLength(25)
    expect(pedidos).toEqual([
      [0, 9],
      [10, 19],
      [20, 29],
    ])
  })

  it('un múltiplo exacto pide un lote más, vacío, y para', async () => {
    const { pedir, pedidos } = tabla(20)
    expect(await leerEnPaginas(pedir, { porLote: 10 })).toHaveLength(20)
    expect(pedidos).toHaveLength(3)
  })

  it('una tabla vacía es una lista vacía', async () => {
    const { pedir } = tabla(0)
    expect(await leerEnPaginas(pedir, { porLote: 10 })).toEqual([])
  })

  it('un error de la base lanza (no devuelve una cifra corta)', async () => {
    const fallo = { message: 'timeout' }
    await expect(leerEnPaginas(async () => ({ data: null, error: fallo }))).rejects.toBe(fallo)
  })

  it('pasado el tope de lotes lanza en vez de cortar en silencio', async () => {
    const { pedir } = tabla(100)
    await expect(leerEnPaginas(pedir, { porLote: 10, maxLotes: 3 })).rejects.toThrow(/tiene que hacerla la base/)
  })
})
