import { describe, it, expect } from 'vitest'
import {
  acotar,
  compararMeses,
  dentroDeLimites,
  diaSemana,
  esFechaValida,
  fechaCorta,
  fechaLarga,
  fechaPorTecla,
  moverMeses,
  nombreMes,
  semanasDelMes,
  sumarMeses,
} from './calendario'

describe('el calendario', () => {
  it('pinta noviembre de 2026 empezando en domingo 1, de lunes a domingo', () => {
    const semanas = semanasDelMes({ anio: 2026, mes: 11 })
    // El 1 de noviembre de 2026 es domingo: seis huecos antes.
    expect(semanas[0]).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(semanas.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null])
    expect(semanas).toHaveLength(6)
    expect(semanas.every((s) => s.length === 7)).toBe(true)
  })

  it('febrero de un año bisiesto tiene 29 días', () => {
    const dias = semanasDelMes({ anio: 2028, mes: 2 }).flat().filter(Boolean)
    expect(dias).toHaveLength(29)
    expect(dias.at(-1)).toBe('2028-02-29')
  })

  it('el día de la semana es ISO: lunes 1, domingo 7', () => {
    expect(diaSemana('2026-11-09')).toBe(1)
    expect(diaSemana('2026-11-15')).toBe(7)
  })

  it('suma y compara meses cruzando el año', () => {
    expect(sumarMeses({ anio: 2026, mes: 12 }, 1)).toEqual({ anio: 2027, mes: 1 })
    expect(sumarMeses({ anio: 2026, mes: 1 }, -1)).toEqual({ anio: 2025, mes: 12 })
    expect(compararMeses({ anio: 2026, mes: 11 }, { anio: 2027, mes: 1 })).toBeLessThan(0)
    expect(nombreMes({ anio: 2026, mes: 11 })).toBe('noviembre de 2026')
  })

  it('mover un mes conserva el día o cae al último del mes', () => {
    expect(moverMeses('2026-11-12', 1)).toBe('2026-12-12')
    expect(moverMeses('2027-01-31', 1)).toBe('2027-02-28')
    expect(moverMeses('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('las teclas mueven por días, semanas, extremos y meses', () => {
    expect(fechaPorTecla('2026-11-12', 'ArrowRight')).toBe('2026-11-13')
    expect(fechaPorTecla('2026-11-30', 'ArrowRight')).toBe('2026-12-01')
    expect(fechaPorTecla('2026-11-12', 'ArrowUp')).toBe('2026-11-05')
    expect(fechaPorTecla('2026-11-12', 'Home')).toBe('2026-11-09')
    expect(fechaPorTecla('2026-11-12', 'End')).toBe('2026-11-15')
    expect(fechaPorTecla('2026-11-12', 'PageDown')).toBe('2026-12-12')
    expect(fechaPorTecla('2026-11-12', 'PageUp', true)).toBe('2025-11-12')
    expect(fechaPorTecla('2026-11-12', 'Enter')).toBeNull()
  })

  it('respeta los límites', () => {
    expect(dentroDeLimites('2026-11-12', '2026-11-12', '2026-12-01')).toBe(true)
    expect(dentroDeLimites('2026-11-11', '2026-11-12')).toBe(false)
    expect(dentroDeLimites('2026-12-02', null, '2026-12-01')).toBe(false)
    expect(acotar('2026-11-01', '2026-11-12')).toBe('2026-11-12')
    expect(acotar('2027-01-01', null, '2026-12-31')).toBe('2026-12-31')
  })

  it('valida y escribe fechas', () => {
    expect(esFechaValida('2026-02-30')).toBe(false)
    expect(esFechaValida('2026-12-24')).toBe(true)
    expect(fechaCorta('2026-12-24')).toBe('24 dic 2026')
    expect(fechaLarga('2026-12-24')).toBe('jueves, 24 de diciembre de 2026')
  })
})
