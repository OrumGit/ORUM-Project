import { describe, expect, it } from 'vitest'
import { registrosReemplazables, type RegistroPrevio } from './registro-reintento'

const base = (extra: Partial<RegistroPrevio>): RegistroPrevio => ({
  authUserId: 'u',
  correoConfirmado: false,
  conFicha: false,
  conPago: false,
  ...extra,
})

describe('registrosReemplazables', () => {
  it('un registro que no llegó a nada se reemplaza', () => {
    expect(registrosReemplazables([base({ authUserId: 'a' })])).toEqual(['a'])
  })

  it('nunca uno con el correo ya confirmado: es una cuenta', () => {
    expect(registrosReemplazables([base({ correoConfirmado: true })])).toEqual([])
  })

  it('nunca uno con ficha de socio', () => {
    expect(registrosReemplazables([base({ conFicha: true })])).toEqual([])
  })

  it('nunca uno con un pago abierto en Mercado Pago', () => {
    expect(registrosReemplazables([base({ conPago: true })])).toEqual([])
  })

  it('de varios, solo los que se pueden', () => {
    expect(
      registrosReemplazables([
        base({ authUserId: 'borrar' }),
        base({ authUserId: 'cuenta', correoConfirmado: true }),
      ]),
    ).toEqual(['borrar'])
  })
})
