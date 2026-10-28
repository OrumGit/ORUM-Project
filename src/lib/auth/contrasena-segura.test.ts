import { describe, expect, it } from 'vitest'
import {
  BYTES_MAXIMOS,
  LONGITUD_MINIMA,
  evaluarFortaleza,
  largo,
  palabrasDeContexto,
  requisitos,
  revisarContrasena,
} from './contrasena-segura'
import { vecesEnRango } from './rango-filtradas'

const motivo = (v: string, contexto: string[] = []) => {
  const r = revisarContrasena(v, contexto)
  return r.ok ? 'ok' : r.motivo
}

describe('revisarContrasena: lo que pide NIST SP 800-63B-4', () => {
  it('el mínimo es de 12 caracteres, contados como los cuenta una persona', () => {
    expect(LONGITUD_MINIMA).toBe(12)
    expect(motivo('arepa y cafe')).toBe('ok') // 12 justos, con espacios
    expect(motivo('arepa y caf')).toBe('corta')
    // «ñ» y las tildes cuentan como un carácter, compuestas o no.
    expect(largo('niño')).toBe(4)
    expect(largo('niño')).toBe(4)
  })

  it('dice cuántos faltan', () => {
    const r = revisarContrasena('mi casita')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.mensaje).toMatch(/faltan 3/)
  })

  it('NO exige mezclas: una frase en minúsculas vale', () => {
    expect(motivo('mi perro toby come arepas')).toBe('ok')
    expect(motivo('caminatasporelparque')).toBe('ok')
  })

  it('acepta espacios, emojis y cualquier letra', () => {
    expect(motivo('el café de la mañana ☕')).toBe('ok')
  })

  it('no trunca en silencio: avisa pasados los 72 bytes de bcrypt', () => {
    expect(BYTES_MAXIMOS).toBe(72)
    expect(motivo('palabra '.repeat(10))).toBe('larga') // 80 bytes
    expect(motivo('palabra '.repeat(8).trim())).not.toBe('larga') // 63 bytes
  })

  it('rechaza repeticiones y series del teclado o del alfabeto', () => {
    expect(motivo('aaaaaaaaaaaa')).toBe('repetida')
    expect(motivo('abcabcabcabc')).toBe('repetida')
    expect(motivo('121212121212')).toBe('repetida')
    expect(motivo('123456789012')).toBe('secuencia')
    expect(motivo('qwertyuiopas')).toBe('secuencia')
    expect(motivo('abcdefghijklm')).toBe('secuencia')
    expect(motivo('987654321098')).toBe('secuencia')
  })

  it('rechaza las comunes aunque las decoren con números y símbolos', () => {
    expect(motivo('Contraseña2024!')).toBe('comun')
    expect(motivo('Colombia123456*')).toBe('comun')
    expect(motivo('password123456')).toBe('comun')
    expect(motivo('ColombiaColombia')).toBe('comun')
    expect(motivo('TeAmoAmor2024')).toBe('comun')
    expect(motivo('Millonarios1946')).toBe('comun')
  })

  it('rechaza el nombre del servicio (NIST lo pide)', () => {
    expect(motivo('ClubOrum2026!!')).toBe('comun')
    expect(motivo('orumorum1234')).toBe('comun')
  })

  it('una común DENTRO de una frase no la tumba', () => {
    expect(motivo('mi equipo es millonarios desde niño')).toBe('ok')
    expect(motivo('colombia tiene montañas verdes')).toBe('ok')
  })
})

describe('el contexto de la persona', () => {
  const contexto = palabrasDeContexto(['maria.perez@gmail.com', 'María José', 'Pérez Gómez', '1043567289'])

  it('saca palabras del correo, el nombre y la cédula, plegadas', () => {
    expect(contexto).toEqual(
      expect.arrayContaining(['mariaperez', 'maria', 'perez', 'jose', 'gomez', '1043567289']),
    )
    expect(contexto).not.toContain('gmail') // solo lo de antes de la @
  })

  it('rechaza el nombre o la cédula decorados', () => {
    expect(motivo('MariaPerez1990', contexto)).toBe('personal')
    expect(motivo('maria.jose.perez', contexto)).toBe('personal')
    expect(motivo('1043567289**', contexto)).toBe('personal')
  })

  it('una frase que solo menciona el nombre pasa', () => {
    expect(motivo('maria toma cafe en el parque', contexto)).toBe('ok')
  })
})

describe('la guía del campo', () => {
  it('los tres requisitos se encienden según la revisión', () => {
    expect(requisitos('').every((r) => !r.cumple)).toBe(true)
    expect(requisitos('mi perro toby come arepas').every((r) => r.cumple)).toBe(true)
    const comun = requisitos('Contraseña2024!')
    expect(comun.find((r) => r.clave === 'largo')?.cumple).toBe(true)
    expect(comun.find((r) => r.clave === 'comun')?.cumple).toBe(false)
  })

  it('el medidor premia el largo, no la mezcla', () => {
    expect(evaluarFortaleza('').nivel).toBe('vacia')
    expect(evaluarFortaleza('corta').nivel).toBe('insegura')
    expect(evaluarFortaleza('Contraseña2024!').nivel).toBe('insegura')
    expect(evaluarFortaleza('arepa y cafe').nivel).toBe('aceptable')
    expect(evaluarFortaleza('mi perro toby come').nivel).toBe('buena')
    expect(evaluarFortaleza('mi perro toby come arepas').nivel).toBe('excelente')
  })

  it('solo una revisada es válida', () => {
    expect(evaluarFortaleza('123456789012').valida).toBe(false)
    expect(evaluarFortaleza('arepa y cafe').valida).toBe(true)
  })
})

describe('vecesEnRango: la respuesta de Pwned Passwords', () => {
  const cuerpo = [
    '0018A45C4D1DEF81644B54AB7F969B88D65:1',
    '00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2',
    '011053FD0102E94D6AE2F8B83D76FAF94F6:0',
  ].join('\r\n')

  it('encuentra el sufijo, sin importar mayúsculas', () => {
    expect(vecesEnRango('00d4f6e8fa6eecad2a3aa415eec418d38ec', cuerpo)).toBe(2)
  })

  it('el relleno (:0) y lo que no está cuentan como cero', () => {
    expect(vecesEnRango('011053FD0102E94D6AE2F8B83D76FAF94F6', cuerpo)).toBe(0)
    expect(vecesEnRango('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', cuerpo)).toBe(0)
  })
})
