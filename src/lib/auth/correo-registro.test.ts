import { describe, expect, it } from 'vitest'
import { correoParaRegistro, normalizarCorreo } from './correo-registro'

describe('normalizarCorreo', () => {
  it('pasa a minúsculas y quita espacios de los extremos', () => {
    expect(normalizarCorreo('  Ana.Perez@Gmail.COM ')).toBe('ana.perez@gmail.com')
  })

  it('deja igual un correo ya normalizado', () => {
    expect(normalizarCorreo('ana@gmail.com')).toBe('ana@gmail.com')
  })
})

describe('correoParaRegistro', () => {
  it('acepta un correo real y lo devuelve normalizado', () => {
    expect(correoParaRegistro('Ana.Perez@Gmail.com')).toEqual({
      ok: true,
      correo: 'ana.perez@gmail.com',
    })
  })

  it('rechaza una forma que no es correo', () => {
    const r = correoParaRegistro('ana@gmail')
    expect(r.ok).toBe(false)
  })

  it('rechaza un correo vacío', () => {
    expect(correoParaRegistro('   ').ok).toBe(false)
  })

  it('rechaza un dominio mal escrito', () => {
    const r = correoParaRegistro('ana@gmial.com')
    expect(r.ok).toBe(false)
  })

  it('rechaza un correo desechable', () => {
    const r = correoParaRegistro('ana@10minutemail.com')
    expect(r.ok).toBe(false)
  })
})
