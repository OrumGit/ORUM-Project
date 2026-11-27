import { describe, expect, it } from 'vitest'
import {
  arranqueAppPanel,
  esLlaveValida,
  llaveAppPanel,
  llaveDelArchivo,
  rutaManifiestoPanel,
} from './app-panel'
import { marcaDeEquipo } from './marca-equipo'

const PUERTA = '/equipo-prueba123'
const OTRA = '/equipo-otra456'

describe('llaveAppPanel', () => {
  it('es hex de 40 y estable para la misma puerta', async () => {
    const a = await llaveAppPanel(PUERTA)
    expect(a).toMatch(/^[0-9a-f]{40}$/)
    expect(await llaveAppPanel(PUERTA)).toBe(a)
  })

  it('cambia con la puerta y no es la marca del dispositivo', async () => {
    const a = await llaveAppPanel(PUERTA)
    expect(await llaveAppPanel(OTRA)).not.toBe(a)
    expect((await marcaDeEquipo(PUERTA)).startsWith(a)).toBe(false)
  })
})

describe('esLlaveValida', () => {
  it('acepta solo la llave de esa puerta', async () => {
    const llave = await llaveAppPanel(PUERTA)
    expect(await esLlaveValida(llave, PUERTA)).toBe(true)
    expect(await esLlaveValida(llave, OTRA)).toBe(false)
  })

  it('rechaza lo vacío, lo corto y lo que no es', async () => {
    expect(await esLlaveValida(null, PUERTA)).toBe(false)
    expect(await esLlaveValida('', PUERTA)).toBe(false)
    expect(await esLlaveValida('abc', PUERTA)).toBe(false)
    expect(await esLlaveValida('0'.repeat(40), PUERTA)).toBe(false)
  })
})

describe('direcciones de la app', () => {
  it('el manifiesto vive en una dirección que sale de la llave', async () => {
    const llave = await llaveAppPanel(PUERTA)
    const ruta = await rutaManifiestoPanel(PUERTA)
    expect(ruta).toBe(`/app-panel/${llave}.webmanifest`)
    expect(ruta).not.toContain(PUERTA)
    expect(llaveDelArchivo(ruta.split('/').pop()!)).toBe(llave)
  })

  it('la app abre en el panel con su llave', () => {
    expect(arranqueAppPanel('abc123')).toBe('/OrumAdminLogin?app=abc123')
  })

  it('llaveDelArchivo solo lee «<hex>.webmanifest»', () => {
    expect(llaveDelArchivo('abc.json')).toBeNull()
    expect(llaveDelArchivo('ABC.webmanifest')).toBeNull()
    expect(llaveDelArchivo('../x.webmanifest')).toBeNull()
  })
})
