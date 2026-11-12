import { describe, expect, it } from 'vitest'
import { construirCorreoConfirmacionRegistro, enlaceConfirmacionRegistro } from './registro-correo'

describe('enlaceConfirmacionRegistro', () => {
  it('usa solo el origen cuando la base trae una ruta', () => {
    const e = enlaceConfirmacionRegistro('https://www.cluborum.com/activar-cuenta', 'tok123')
    expect(e).toBe('https://www.cluborum.com/registro/confirmar?token_hash=tok123&type=signup')
  })

  it('funciona con una base sin ruta y con barra final', () => {
    expect(enlaceConfirmacionRegistro('http://localhost:3000/', 'tok')).toBe(
      'http://localhost:3000/registro/confirmar?token_hash=tok&type=signup',
    )
  })
})

describe('construirCorreoConfirmacionRegistro', () => {
  const enlace = 'https://cluborum.com/registro/confirmar?token_hash=abc&type=signup'

  it('incluye el enlace en el texto y en el HTML', () => {
    const c = construirCorreoConfirmacionRegistro({ nombre: 'María', enlace })
    expect(c.texto).toContain(enlace)
    // En HTML el «&» del enlace se escapa como «&amp;».
    expect(c.html).toContain(`href="${enlace.replace(/&/g, '&amp;')}"`)
  })

  it('saluda con el nombre', () => {
    const c = construirCorreoConfirmacionRegistro({ nombre: 'María', enlace })
    expect(c.texto.startsWith('Hola María,')).toBe(true)
  })

  it('escapa el nombre en el HTML', () => {
    const c = construirCorreoConfirmacionRegistro({
      nombre: '<script>alert(1)</script>',
      enlace,
    })
    expect(c.html).not.toContain('<script>')
    expect(c.html).toContain('&lt;script&gt;')
  })

  it('sin nombre usa un saludo genérico', () => {
    const c = construirCorreoConfirmacionRegistro({ nombre: '  ', enlace })
    expect(c.texto.startsWith('Hola,')).toBe(true)
  })
})
