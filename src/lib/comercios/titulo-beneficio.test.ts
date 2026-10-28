import { describe, expect, it } from 'vitest'
import { asuntoDelTitulo, titularBeneficio } from './titulo-beneficio'

describe('asuntoDelTitulo', () => {
  it('quita el valor repetido y el conector', () => {
    expect(asuntoDelTitulo('10% de descuento', '10% de descuento en brunch')).toBe('Brunch')
    expect(asuntoDelTitulo('10% de descuento', '10% DE DESCUENTO - toda la carta')).toBe('Toda la carta')
    expect(asuntoDelTitulo('2x1', '2x1: en cócteles')).toBe('Cócteles')
    // «en» es un conector solo si va suelto: «ensaladas» no pierde su «en».
    expect(asuntoDelTitulo('10% de descuento', '10% de descuento ensaladas')).toBe('Ensaladas')
  })

  it('deja el título si no repite el valor', () => {
    expect(asuntoDelTitulo('Regalo', 'Bebida GRATIS')).toBe('Bebida GRATIS')
    expect(asuntoDelTitulo('10% de descuento', 'brunch')).toBe('Brunch')
  })

  it('si el título es solo el valor, no queda asunto', () => {
    expect(asuntoDelTitulo('10% de descuento', '10% de descuento')).toBe('')
    expect(asuntoDelTitulo('Regalo', '  ')).toBe('')
  })

  it('no corta a mitad de palabra cuando solo empieza igual', () => {
    expect(asuntoDelTitulo('Regalo', 'Regalos de cumpleaños')).toBe('Regalos de cumpleaños')
  })
})

describe('titularBeneficio', () => {
  it('devuelve las dos partes', () => {
    expect(titularBeneficio('Regalo', 'Mimosa GRATIS en tu cumpleaños')).toEqual({
      valor: 'Regalo',
      asunto: 'Mimosa GRATIS en tu cumpleaños',
    })
  })
})
