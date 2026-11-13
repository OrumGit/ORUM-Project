import { describe, expect, it } from 'vitest'
import { datosEstructuradosSitio, REDES_SOCIALES, URL_SITIO } from './sitio'

type Nodo = Record<string, unknown>

function nodos(): Nodo[] {
  return (datosEstructuradosSitio() as { '@graph': Nodo[] })['@graph']
}

describe('datosEstructuradosSitio', () => {
  it('declara la organización y el sitio con la URL canónica', () => {
    const tipos = nodos().map((n) => n['@type'])
    expect(tipos).toEqual(['Organization', 'WebSite'])
    for (const n of nodos()) expect(n.url).toBe(URL_SITIO)
  })

  it('el sitio apunta a la organización por @id', () => {
    const sitio = nodos().find((n) => n['@type'] === 'WebSite')!
    expect(sitio.publisher).toEqual({ '@id': `${URL_SITIO}/#organizacion` })
  })

  it('sin redes configuradas no escribe sameAs', () => {
    if (REDES_SOCIALES.length > 0) return
    const org = nodos().find((n) => n['@type'] === 'Organization')!
    expect('sameAs' in org).toBe(false)
  })
})
