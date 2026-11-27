import { describe, expect, it } from 'vitest'
import type { TipoBeneficioCodigo } from '@/lib/supabase/database.types'
import { armarBeneficiosFicha, type FilaPromocionFicha } from './beneficios-ficha'

const TIPOS = new Map<number, TipoBeneficioCodigo>([
  [1, 'porcentaje'],
  [2, 'monto_fijo'],
  [3, 'dos_por_uno'],
  [4, 'regalo'],
])
const HOY = '2026-11-27'

function fila(cambios: Partial<FilaPromocionFicha> = {}): FilaPromocionFicha {
  return {
    id: 1,
    tipo_beneficio_id: 1,
    titulo: '10% de descuento en tu compra',
    descripcion: 'En toda la carta.',
    valor: 10,
    activo: true,
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-12-31',
    dias_semana: null,
    restricciones: 'No acumulable.',
    ...cambios,
  }
}

describe('armarBeneficiosFicha', () => {
  it('arma el beneficio entero: valor, asunto, descripción, cuándo y condiciones', () => {
    const [b] = armarBeneficiosFicha([fila()], TIPOS, HOY)
    expect(b.id).toBe(1)
    expect(b.tipo).toBe('porcentaje')
    expect(b.valor).toBe('10% de descuento')
    expect(b.descripcion).toBe('En toda la carta.')
    expect(b.restricciones).toBe('No acumulable.')
    expect(b.cuando.length).toBeGreaterThan(0)
    expect(b.franjas).toBeNull()
  })

  it('deja fuera lo inactivo, lo caducado y lo que aún no empieza', () => {
    const r = armarBeneficiosFicha(
      [
        fila({ id: 1 }),
        fila({ id: 2, activo: false }),
        fila({ id: 3, fecha_fin: '2026-11-26' }),
        fila({ id: 4, fecha_inicio: '2026-11-28' }),
      ],
      TIPOS,
      HOY,
    )
    expect(r.map((b) => b.id)).toEqual([1])
  })

  it('vale el último y el primer día de la vigencia', () => {
    const r = armarBeneficiosFicha(
      [fila({ id: 1, fecha_fin: HOY }), fila({ id: 2, fecha_inicio: HOY })],
      TIPOS,
      HOY,
    )
    expect(r.map((b) => b.id)).toEqual([1, 2])
  })

  it('un tipo desconocido no se enseña', () => {
    expect(armarBeneficiosFicha([fila({ tipo_beneficio_id: 99 })], TIPOS, HOY)).toEqual([])
  })

  it('sin la columna de franjas (base sin migración) vale todo el día', () => {
    const [b] = armarBeneficiosFicha([fila()], TIPOS, HOY)
    expect(b.franjas).toBeNull()
  })

  it('lee las franjas cuando las hay', () => {
    const [b] = armarBeneficiosFicha(
      [fila({ dias_semana: [2], franjas_horarias: [{ dias: [2], desde: '08:00', hasta: '09:30' }] })],
      TIPOS,
      HOY,
    )
    expect(b.franjas).toEqual([{ dias: [2], desde: '08:00', hasta: '09:30' }])
    expect(b.dias).toEqual([2])
  })

  it('cada tipo dice su valor', () => {
    const r = armarBeneficiosFicha(
      [
        fila({ id: 1, tipo_beneficio_id: 2, valor: 5000, titulo: 'Descuento' }),
        fila({ id: 2, tipo_beneficio_id: 3, valor: null, titulo: '2x1' }),
        fila({ id: 3, tipo_beneficio_id: 4, valor: null, titulo: 'Postre gratis' }),
      ],
      TIPOS,
      HOY,
    )
    expect(r.map((b) => b.tipo)).toEqual(['monto_fijo', 'dos_por_uno', 'regalo'])
    expect(r.every((b) => b.valor.length > 0)).toBe(true)
  })
})
