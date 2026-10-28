import { describe, expect, it } from 'vitest'
import { esCalificacionBaja, leerFiltroResenas, necesitaRevision, textoPorRevisar } from './moderacion'

describe('necesitaRevision', () => {
  const base = { revisadaAt: null, respuestaAdmin: null }

  it('solo las de menos de 4 estrellas', () => {
    expect(necesitaRevision({ ...base, estrellas: 3 }, true)).toBe(true)
    expect(necesitaRevision({ ...base, estrellas: 1 }, true)).toBe(true)
    expect(necesitaRevision({ ...base, estrellas: 4 }, true)).toBe(false)
    expect(necesitaRevision({ ...base, estrellas: 5 }, true)).toBe(false)
  })

  it('una revisada ya no pide revisión', () => {
    expect(necesitaRevision({ estrellas: 2, revisadaAt: '2026-10-29T10:00:00Z', respuestaAdmin: null }, true)).toBe(
      false,
    )
  })

  it('sin la columna, cuenta como revisada si ORUM la respondió', () => {
    expect(necesitaRevision({ estrellas: 2, revisadaAt: null, respuestaAdmin: 'Lo vemos' }, false)).toBe(false)
    expect(necesitaRevision({ estrellas: 2, revisadaAt: null, respuestaAdmin: null }, false)).toBe(true)
  })
})

describe('leerFiltroResenas', () => {
  it('admite los de la lista y cae en «todas»', () => {
    expect(leerFiltroResenas('por_revisar')).toBe('por_revisar')
    expect(leerFiltroResenas('bajas')).toBe('bajas')
    expect(leerFiltroResenas('cualquiera')).toBe('todas')
    expect(leerFiltroResenas(undefined)).toBe('todas')
  })
})

describe('textos', () => {
  it('calificación baja y conteo', () => {
    expect(esCalificacionBaja(3)).toBe(true)
    expect(esCalificacionBaja(4)).toBe(false)
    expect(textoPorRevisar(1)).toBe('1 reseña por revisar')
    expect(textoPorRevisar(3)).toBe('3 reseñas por revisar')
  })
})
