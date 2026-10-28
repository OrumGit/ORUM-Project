import { describe, expect, it } from 'vitest'
import { diaBogota, etiquetaDia, primerosYOtros, serieVentas } from './graficas'

describe('diaBogota', () => {
  it('las ventas de la noche son del día de Colombia, no del de UTC', () => {
    expect(diaBogota('2026-10-29T03:30:00Z')).toBe('2026-10-28')
    expect(diaBogota('2026-10-29T05:00:00Z')).toBe('2026-10-29')
  })
})

describe('serieVentas', () => {
  const ventas = [
    { fecha_hora: '2026-10-01T15:00:00Z', valor_final: 10000 },
    { fecha_hora: '2026-10-01T23:00:00Z', valor_final: 5000 },
    { fecha_hora: '2026-10-03T02:00:00Z', valor_final: 7000 }, // 2 oct en Bogotá
  ]

  it('por día, con los días sin ventas en cero', () => {
    const s = serieVentas(ventas, '2026-10-01', '2026-10-04')
    expect(s.unidad).toBe('dia')
    expect(s.puntos.map((p) => [p.clave, p.cantidad, p.monto])).toEqual([
      ['2026-10-01', 2, 15000],
      ['2026-10-02', 1, 7000],
      ['2026-10-03', 0, 0],
      ['2026-10-04', 0, 0],
    ])
    expect(s.puntos[0].etiqueta).toBe('1 oct')
  })

  it('un periodo largo se agrupa por semanas que empiezan el lunes', () => {
    const s = serieVentas(ventas, '2026-08-01', '2026-10-29')
    expect(s.unidad).toBe('semana')
    // 1 ago 2026 es sábado: la primera «semana» empieza ese día.
    expect(s.puntos[0].clave).toBe('2026-08-01')
    expect(s.puntos[1].clave).toBe('2026-08-03')
    const semana = s.puntos.find((p) => p.clave === '2026-09-28')
    expect(semana).toMatchObject({ cantidad: 3, monto: 22000, etiqueta: 'Semana del 28 sept' })
  })

  it('fuera del periodo no cuenta, y un rango al revés no tiene puntos', () => {
    expect(serieVentas(ventas, '2026-10-02', '2026-10-02').puntos[0].cantidad).toBe(1)
    expect(serieVentas(ventas, '2026-10-05', '2026-10-01').puntos).toEqual([])
  })
})

describe('etiquetaDia', () => {
  it('día y mes corto', () => {
    expect(etiquetaDia('2026-12-31')).toBe('31 dic')
  })
})

describe('primerosYOtros', () => {
  const barras = Array.from({ length: 10 }, (_, i) => ({ clave: String(i), etiqueta: `C${i}`, valor: i + 1 }))

  it('ordena de mayor a menor y suma el resto en «Otros»', () => {
    const r = primerosYOtros(barras, 4)
    expect(r.map((b) => b.etiqueta)).toEqual(['C9', 'C8', 'C7', 'Otros (7)'])
    expect(r[3].valor).toBe(7 + 6 + 5 + 4 + 3 + 2 + 1)
  })

  it('si caben, no hay «Otros»', () => {
    expect(primerosYOtros(barras.slice(0, 3), 4)).toHaveLength(3)
  })
})
