import { describe, expect, it } from 'vitest'
import {
  BENEFICIOS_EN_EL_PORTAL_PUBLICO,
  beneficioLegible,
  beneficiosALaVista,
} from './beneficios-publicos'

describe('el interruptor de los beneficios del Portal Público', () => {
  it('hoy están a la vista (27/11/2026)', () => {
    expect(BENEFICIOS_EN_EL_PORTAL_PUBLICO).toBe('a-la-vista')
    expect(beneficiosALaVista()).toBe(true)
  })

  it('a la vista: el socio y quien no lo es leen el beneficio', () => {
    expect(beneficioLegible(true, 'a-la-vista')).toBe(true)
    expect(beneficioLegible(false, 'a-la-vista')).toBe(true)
  })

  it('oculto: solo el socio lo lee (la versión desenfocada se conserva)', () => {
    expect(beneficiosALaVista('oculto')).toBe(false)
    expect(beneficioLegible(true, 'oculto')).toBe(true)
    expect(beneficioLegible(false, 'oculto')).toBe(false)
  })
})
