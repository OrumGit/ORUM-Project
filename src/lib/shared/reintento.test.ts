import { describe, expect, it } from 'vitest'
import { conReintentoUnico, pausaDeReintento } from './reintento'

describe('pausaDeReintento', () => {
  it('con el azar al mínimo da el mínimo', () => {
    expect(pausaDeReintento(200, 400, () => 0)).toBe(200)
  })
  it('con el azar a la mitad da el punto medio', () => {
    expect(pausaDeReintento(200, 400, () => 0.5)).toBe(300)
  })
  it('con el azar al máximo no llega a pasar el tope', () => {
    expect(pausaDeReintento(200, 400, () => 0.999999)).toBeLessThanOrEqual(400)
  })
  it('sin azar propio queda dentro del rango', () => {
    for (let i = 0; i < 50; i++) {
      const p = pausaDeReintento(200, 400)
      expect(p).toBeGreaterThanOrEqual(200)
      expect(p).toBeLessThanOrEqual(400)
    }
  })
})

describe('conReintentoUnico', () => {
  it('si la lectura funciona, la llama una vez y no espera', async () => {
    let llamadas = 0
    const esperas: number[] = []
    const valor = await conReintentoUnico(async () => ++llamadas, {
      pausaMs: () => 300,
      esperar: async (ms) => void esperas.push(ms),
    })
    expect(valor).toBe(1)
    expect(esperas).toEqual([])
  })

  it('si falla una vez, espera la pausa y reintenta', async () => {
    let llamadas = 0
    const esperas: number[] = []
    const valor = await conReintentoUnico(
      async () => {
        llamadas++
        if (llamadas === 1) throw new Error('522')
        return 'ok'
      },
      { pausaMs: () => 300, esperar: async (ms) => void esperas.push(ms) },
    )
    expect(valor).toBe('ok')
    expect(llamadas).toBe(2)
    expect(esperas).toEqual([300])
  })

  it('si falla dos veces, lanza el SEGUNDO error y no reintenta más', async () => {
    let llamadas = 0
    await expect(
      conReintentoUnico(
        async () => {
          llamadas++
          throw new Error(`fallo ${llamadas}`)
        },
        { pausaMs: () => 0, esperar: async () => {} },
      ),
    ).rejects.toThrow('fallo 2')
    expect(llamadas).toBe(2)
  })

  it('no reintenta cuando el error lo desaconseja', async () => {
    let llamadas = 0
    const esperas: number[] = []
    await expect(
      conReintentoUnico(
        async () => {
          llamadas++
          throw new Error('circuito abierto')
        },
        {
          pausaMs: () => 300,
          esperar: async (ms) => void esperas.push(ms),
          noReintentar: (e) => e instanceof Error && e.message === 'circuito abierto',
        },
      ),
    ).rejects.toThrow('circuito abierto')
    expect(llamadas).toBe(1)
    expect(esperas).toEqual([])
  })
})
