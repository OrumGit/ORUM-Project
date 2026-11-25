import { describe, expect, it } from 'vitest'
import { entrarEnElSitio, esMarcaValida, esRutaDelPanel, marcaDeEquipo } from './marca-equipo'

const PUERTA = '/puerta-k3m9x2q8w7z1'

describe('marcaDeEquipo', () => {
  it('es siempre la misma para la misma puerta', async () => {
    const a = await marcaDeEquipo(PUERTA)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await marcaDeEquipo(PUERTA)).toBe(a)
  })

  it('cambia si cambia la puerta', async () => {
    expect(await marcaDeEquipo(PUERTA)).not.toBe(await marcaDeEquipo('/otra-puerta-k3m9x2q8'))
  })

  it('no deja ver la puerta', async () => {
    expect(await marcaDeEquipo(PUERTA)).not.toContain('puerta')
  })
})

describe('esMarcaValida', () => {
  it('acepta la marca de esta puerta', async () => {
    expect(await esMarcaValida(await marcaDeEquipo(PUERTA), PUERTA)).toBe(true)
  })

  it('rechaza la de otra puerta, una vacía o una inventada', async () => {
    expect(await esMarcaValida(await marcaDeEquipo('/otra-puerta-k3m9x2q8'), PUERTA)).toBe(false)
    expect(await esMarcaValida(undefined, PUERTA)).toBe(false)
    expect(await esMarcaValida('', PUERTA)).toBe(false)
    expect(await esMarcaValida('1', PUERTA)).toBe(false)
    expect(await esMarcaValida('0'.repeat(64), PUERTA)).toBe(false)
  })
})

describe('esRutaDelPanel', () => {
  it('el panel y lo que cuelga de él', () => {
    expect(esRutaDelPanel('/OrumAdminLogin')).toBe(true)
    expect(esRutaDelPanel('/OrumAdminLogin/miembros/nuevo')).toBe(true)
  })

  it('nada más', () => {
    expect(esRutaDelPanel('/')).toBe(false)
    expect(esRutaDelPanel('/OrumAdminLoginX')).toBe(false)
    expect(esRutaDelPanel('/miembros')).toBe(false)
    expect(esRutaDelPanel('/orumadminlogin')).toBe(false)
  })
})

describe('entrarEnElSitio', () => {
  it('sin sesión y con marca, en el panel: el formulario de entrada', () => {
    expect(entrarEnElSitio({ pathname: '/OrumAdminLogin', conSesion: false, marcaValida: true })).toBe(true)
    expect(entrarEnElSitio({ pathname: '/OrumAdminLogin/miembros', conSesion: false, marcaValida: true })).toBe(
      true,
    )
  })

  it('sin marca, como siempre: no se enseña nada', () => {
    expect(entrarEnElSitio({ pathname: '/OrumAdminLogin', conSesion: false, marcaValida: false })).toBe(false)
  })

  it('con sesión, el panel', () => {
    expect(entrarEnElSitio({ pathname: '/OrumAdminLogin', conSesion: true, marcaValida: true })).toBe(false)
  })

  it('fuera del panel, nunca', () => {
    expect(entrarEnElSitio({ pathname: '/miembros', conSesion: false, marcaValida: true })).toBe(false)
  })
})
