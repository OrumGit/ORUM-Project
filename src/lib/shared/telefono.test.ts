import { describe, expect, it } from 'vitest'
import { telefonoLegible, telefonoParaMarcar } from './telefono'

describe('telefonoLegible', () => {
  it('agrupa un celular y un fijo de 10 cifras', () => {
    expect(telefonoLegible('3001325756')).toBe('300 132 5756')
    expect(telefonoLegible('(602) 234-5678')).toBe('602 234 5678')
  })

  it('quita el indicativo de Colombia', () => {
    expect(telefonoLegible('+57 300 132 5756')).toBe('300 132 5756')
  })

  it('lo que no es de 10 cifras queda como vino', () => {
    expect(telefonoLegible(' 123  456 ')).toBe('123 456')
  })
})

describe('telefonoParaMarcar', () => {
  it('solo cifras, y el + si lo trae', () => {
    expect(telefonoParaMarcar('300 132 5756')).toBe('3001325756')
    expect(telefonoParaMarcar('+57 300 132 5756')).toBe('+573001325756')
  })
})
