import { describe, it, expect } from 'vitest'
import {
  expandirRango,
  esNumeroRegistroValido,
  MAX_NUMEROS_POR_CARGA,
  buscarNumeros,
  numerosCoinciden,
  pareceTextoPegado,
  soloCifras,
} from './numeros-registro'

describe('esNumeroRegistroValido', () => {
  it('acepta exactamente 8 dígitos', () => {
    expect(esNumeroRegistroValido('00000042')).toBe(true)
  })

  it('rechaza menos de 8 dígitos', () => {
    expect(esNumeroRegistroValido('42')).toBe(false)
  })

  it('rechaza más de 8 dígitos', () => {
    expect(esNumeroRegistroValido('000000042')).toBe(false)
  })

  it('rechaza letras o guiones', () => {
    expect(esNumeroRegistroValido('ORUM-042')).toBe(false)
  })
})

describe('expandirRango', () => {
  it('expande un rango pequeño, con relleno a 8 dígitos', () => {
    expect(expandirRango('00000001', '00000004')).toEqual({
      ok: true,
      numeros: ['00000001', '00000002', '00000003', '00000004'],
    })
  })

  it('un rango de un solo número devuelve ese número', () => {
    expect(expandirRango('00000500', '00000500')).toEqual({
      ok: true,
      numeros: ['00000500'],
    })
  })

  it('no se deja engañar por los ceros a la izquierda (base 10, no octal)', () => {
    expect(expandirRango('00000008', '00000010')).toEqual({
      ok: true,
      numeros: ['00000008', '00000009', '00000010'],
    })
  })

  it('rechaza un extremo que no tiene 8 dígitos', () => {
    const r = expandirRango('1', '00000010')
    expect(r.ok).toBe(false)
  })

  it('rechaza cuando el inicio es mayor que el fin', () => {
    const r = expandirRango('00000010', '00000001')
    expect(r.ok).toBe(false)
  })

  it('rechaza un rango que supera el tope por carga', () => {
    const r = expandirRango('00000001', String(MAX_NUMEROS_POR_CARGA + 2).padStart(8, '0'))
    expect(r.ok).toBe(false)
  })

  it('acepta un rango que llega justo al tope', () => {
    const r = expandirRango('00000001', String(MAX_NUMEROS_POR_CARGA).padStart(8, '0'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.numeros).toHaveLength(MAX_NUMEROS_POR_CARGA)
  })
})

describe('soloCifras', () => {
  it('quita lo que no es cifra y corta en 8', () => {
    expect(soloCifras(' 0001-2345 ')).toBe('00012345')
    expect(soloCifras('1234567890')).toBe('12345678')
    expect(soloCifras('abc')).toBe('')
  })
})

describe('buscarNumeros', () => {
  const libres = ['00010000', '00012345', '00020001', '00112345', '01200000']

  it('sin nada escrito, los primeros de la lista', () => {
    expect(buscarNumeros(libres, '', 2)).toEqual({ numeros: ['00010000', '00012345'], total: 5 })
  })

  it('primero los que empiezan así, después los que lo contienen', () => {
    expect(buscarNumeros(libres, '0001').numeros).toEqual(['00010000', '00012345', '00020001'])
    expect(buscarNumeros(libres, '12345').numeros).toEqual(['00012345', '00112345'])
  })

  it('el número completo da solo ese', () => {
    expect(buscarNumeros(libres, '00012345')).toEqual({ numeros: ['00012345'], total: 1 })
  })

  it('ignora espacios y guiones al buscar', () => {
    expect(buscarNumeros(libres, '0001 2345').numeros).toEqual(['00012345'])
  })

  it('nada casa: lista vacía', () => {
    expect(buscarNumeros(libres, '999')).toEqual({ numeros: [], total: 0 })
  })

  it('corta en el tope pero cuenta todos', () => {
    expect(buscarNumeros(libres, '0', 2)).toEqual({ numeros: ['00010000', '00012345'], total: 5 })
  })
})

describe('numerosCoinciden', () => {
  it('iguales y válidos', () => {
    expect(numerosCoinciden('00012345', '00012345')).toBe(true)
  })

  it('una cifra distinta no coincide', () => {
    expect(numerosCoinciden('00012345', '00012346')).toBe(false)
  })

  it('sin número elegido nunca coincide', () => {
    expect(numerosCoinciden('', '')).toBe(false)
    expect(numerosCoinciden('123', '123')).toBe(false)
  })
})

describe('pareceTextoPegado', () => {
  it('una cifra más es teclear', () => {
    expect(pareceTextoPegado('0009', '00090')).toBe(false)
    expect(pareceTextoPegado('', '0')).toBe(false)
  })

  it('varias cifras de golpe es pegar', () => {
    expect(pareceTextoPegado('', '00090160')).toBe(true)
    expect(pareceTextoPegado('0009', '00090160')).toBe(true)
    expect(pareceTextoPegado('', '12')).toBe(true)
  })

  it('borrar o reemplazar por una cifra no es pegar', () => {
    expect(pareceTextoPegado('00090160', '0009016')).toBe(false)
    expect(pareceTextoPegado('00090160', '5')).toBe(false)
    expect(pareceTextoPegado('00090160', '')).toBe(false)
  })

  it('lo que no son cifras no cuenta', () => {
    expect(pareceTextoPegado('0009', '0009 ')).toBe(false)
  })
})
