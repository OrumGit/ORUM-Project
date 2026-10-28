import { describe, expect, it } from 'vitest'
import {
  MOTIVOS_REVOCACION,
  NOTA_REVOCACION_MAXIMA,
  esMotivoRevocacion,
  resumirRevocacion,
  revisarRevocacion,
} from './revocacion'

describe('revisarRevocacion', () => {
  it('pide un motivo de la lista', () => {
    expect(revisarRevocacion(null, '')).toMatchObject({ ok: false, campo: 'motivo' })
    expect(revisarRevocacion('porque si', '')).toMatchObject({ ok: false, campo: 'motivo' })
  })

  it('con un motivo de la lista, la nota es opcional', () => {
    expect(revisarRevocacion('uso_indebido', '')).toEqual({ ok: true, motivo: 'uso_indebido', nota: null })
    expect(revisarRevocacion('uso_indebido', '  prestó el carnet  ')).toEqual({
      ok: true,
      motivo: 'uso_indebido',
      nota: 'prestó el carnet',
    })
  })

  it('con «Otro motivo» la nota es obligatoria', () => {
    expect(revisarRevocacion('otro', '   ')).toMatchObject({ ok: false, campo: 'nota' })
    expect(revisarRevocacion('otro', 'cerró su cuenta')).toMatchObject({ ok: true, nota: 'cerró su cuenta' })
  })

  it('la nota tiene tope', () => {
    expect(revisarRevocacion('otro', 'a'.repeat(NOTA_REVOCACION_MAXIMA + 1))).toMatchObject({
      ok: false,
      campo: 'nota',
    })
    expect(revisarRevocacion('otro', 'a'.repeat(NOTA_REVOCACION_MAXIMA))).toMatchObject({ ok: true })
  })
})

describe('esMotivoRevocacion', () => {
  it('reconoce los de la lista y nada más', () => {
    for (const m of MOTIVOS_REVOCACION) expect(esMotivoRevocacion(m)).toBe(true)
    expect(esMotivoRevocacion('cancelada')).toBe(false)
    expect(esMotivoRevocacion(3)).toBe(false)
  })
})

describe('resumirRevocacion', () => {
  it('dice el motivo y la nota', () => {
    expect(resumirRevocacion('solicitud_miembro', null)).toBe('Membresía revocada — Lo pidió el miembro')
    expect(resumirRevocacion('otro', 'cerró su cuenta')).toBe('Membresía revocada — Otro motivo: cerró su cuenta')
    expect(resumirRevocacion('???', '')).toBe('Membresía revocada — sin motivo')
  })
})
