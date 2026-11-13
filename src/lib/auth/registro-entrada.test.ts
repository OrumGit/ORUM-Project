import { describe, expect, it } from 'vitest'
import { validarEntradaRegistro, type EntradaRegistro } from './registro-entrada'

const valida: EntradaRegistro = {
  nombres: 'María',
  apellidos: 'Gómez Ruiz',
  cedula: '1.023.456.789',
  correo: '  Maria.Gomez@Gmail.com ',
  telefono: '316 529 4870',
  ciudadId: '11',
  direccion: 'Cra 15 # 93-47',
  contrasena: 'Montaña-Rio-Verde-42',
  planId: '3',
  terminosAceptados: true,
}

describe('validarEntradaRegistro', () => {
  it('acepta una entrada correcta y la normaliza', () => {
    const r = validarEntradaRegistro(valida)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.datos).toEqual({
      nombres: 'María',
      apellidos: 'Gómez Ruiz',
      cedula: '1023456789',
      correo: 'maria.gomez@gmail.com',
      telefono: '3165294870',
      ciudadId: 11,
      direccion: 'Cra 15 # 93-47',
      contrasena: 'Montaña-Rio-Verde-42',
      planId: 3,
    })
  })

  it('el teléfono es opcional', () => {
    const r = validarEntradaRegistro({ ...valida, telefono: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.telefono).toBeNull()
  })

  it('exige aceptar los términos', () => {
    const r = validarEntradaRegistro({ ...valida, terminosAceptados: false })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.terminos).toBeDefined()
  })

  it('marca el campo de correo con forma inválida', () => {
    const r = validarEntradaRegistro({ ...valida, correo: 'maria@gmail' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.correo).toBeDefined()
  })

  it('rechaza una cédula con letras', () => {
    const r = validarEntradaRegistro({ ...valida, cedula: '10A23456' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.cedula).toBeDefined()
  })

  it('rechaza un nombre con números', () => {
    const r = validarEntradaRegistro({ ...valida, nombres: 'Mar1a' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.nombres).toBeDefined()
  })

  it('rechaza una contraseña corta', () => {
    const r = validarEntradaRegistro({ ...valida, contrasena: 'corta1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.contrasena).toBeDefined()
  })

  it('rechaza una contraseña que contiene el correo o el nombre', () => {
    const r = validarEntradaRegistro({ ...valida, contrasena: 'MariaGomez2026!!' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.contrasena).toBeDefined()
  })

  it('exige la ciudad', () => {
    const r = validarEntradaRegistro({ ...valida, ciudadId: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.ciudadId).toBeDefined()
  })

  it('exige una dirección con número', () => {
    const vacia = validarEntradaRegistro({ ...valida, direccion: '  ' })
    expect(vacia.ok).toBe(false)
    if (!vacia.ok) expect(vacia.errores.direccion).toBeDefined()
    const sinNumero = validarEntradaRegistro({ ...valida, direccion: 'Calle larga sin numero' })
    expect(sinNumero.ok).toBe(false)
    if (!sinNumero.ok) expect(sinNumero.errores.direccion).toBeDefined()
  })

  it('rechaza un plan que no es un identificador válido', () => {
    const r = validarEntradaRegistro({ ...valida, planId: 'abc' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errores.planId).toBeDefined()
  })

  it('reporta todos los errores a la vez', () => {
    const r = validarEntradaRegistro({
      ...valida,
      nombres: '',
      correo: 'mal',
      terminosAceptados: false,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.errores).sort()).toEqual(['correo', 'nombres', 'terminos'])
    }
  })
})
