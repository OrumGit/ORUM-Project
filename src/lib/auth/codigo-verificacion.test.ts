import { describe, expect, it } from 'vitest'
import { codigoCompleto, llenarCasillas, soloCifras } from './codigo-verificacion'

const vacias = ['', '', '', '', '', '']

describe('soloCifras', () => {
  it('quita lo que no es cifra y corta en seis', () => {
    expect(soloCifras('48 29-15x7')).toBe('482915')
  })
})

describe('codigoCompleto', () => {
  it('acepta seis cifras, con o sin espacios', () => {
    expect(codigoCompleto('482915')).toBe('482915')
    expect(codigoCompleto('482 915')).toBe('482915')
  })

  it('rechaza lo incompleto o con letras', () => {
    expect(codigoCompleto('48291')).toBeNull()
    expect(codigoCompleto('48291a')).toBeNull()
    expect(codigoCompleto('')).toBeNull()
  })
})

describe('llenarCasillas', () => {
  it('una cifra llena su casilla y pasa a la siguiente', () => {
    expect(llenarCasillas(vacias, 0, '4')).toEqual({ casillas: ['4', '', '', '', '', ''], foco: 1 })
  })

  it('pegar el código entero llena las seis', () => {
    expect(llenarCasillas(vacias, 0, '482915')).toEqual({
      casillas: ['4', '8', '2', '9', '1', '5'],
      foco: 5,
    })
  })

  it('pegar a mitad llena desde ahí y no se sale', () => {
    expect(llenarCasillas(vacias, 4, '7788').casillas).toEqual(['', '', '', '', '7', '7'])
  })

  it('borrar vacía la casilla y se queda en ella', () => {
    expect(llenarCasillas(['4', '8', '', '', '', ''], 1, '')).toEqual({
      casillas: ['4', '', '', '', '', ''],
      foco: 1,
    })
  })

  it('las letras no cuentan', () => {
    expect(llenarCasillas(vacias, 0, 'a').casillas).toEqual(vacias)
  })
})
