import { describe, expect, it } from 'vitest'
import {
  elegirNumeroMercadoPago,
  elegirSufijo,
  esNumeroMercadoPagoValido,
  prefijoSiguiente,
} from './numero-mercadopago'

/** Todos los números de un prefijo, ocupados. */
function bloqueLleno(prefijo: string): string[] {
  return Array.from({ length: 10_000 }, (_, s) => prefijo + String(s).padStart(4, '0'))
}

describe('prefijoSiguiente', () => {
  it('avanza de uno en uno', () => {
    expect(prefijoSiguiente('0001')).toBe('0002')
    expect(prefijoSiguiente('0100')).toBe('0101')
  })

  it('salta el prefijo reservado 0009', () => {
    expect(prefijoSiguiente('0008')).toBe('0010')
  })

  it('devuelve null después de 9999', () => {
    expect(prefijoSiguiente('9999')).toBeNull()
    expect(prefijoSiguiente('9998')).toBe('9999')
  })
})

describe('esNumeroMercadoPagoValido', () => {
  it('acepta exactamente 8 dígitos', () => {
    expect(esNumeroMercadoPagoValido('00010000')).toBe(true)
    expect(esNumeroMercadoPagoValido('0001000')).toBe(false)
    expect(esNumeroMercadoPagoValido('000100001')).toBe(false)
    expect(esNumeroMercadoPagoValido('0001ABCD')).toBe(false)
  })
})

describe('elegirSufijo', () => {
  it('devuelve un sufijo libre dentro del prefijo', () => {
    const usados = new Set(['00010000'])
    const sufijo = elegirSufijo('0001', usados, () => 0)
    expect(sufijo).not.toBe('0000')
    expect(sufijo).toMatch(/^\d{4}$/)
  })

  it('recorre los libres cuando el azar siempre cae en uno ocupado', () => {
    const usados = new Set(bloqueLleno('0001').filter((n) => n !== '00019999'))
    expect(elegirSufijo('0001', usados, () => 0)).toBe('9999')
  })

  it('devuelve null si el bloque está lleno', () => {
    const usados = new Set(bloqueLleno('0001'))
    expect(elegirSufijo('0001', usados, () => 0.5)).toBeNull()
  })
})

describe('elegirNumeroMercadoPago', () => {
  it('empieza en 0001 con el pozo vacío', () => {
    const numero = elegirNumeroMercadoPago(new Set(), () => 0)
    expect(numero).not.toBeNull()
    expect(numero!.slice(0, 4)).toBe('0001')
  })

  it('nunca asigna el prefijo reservado 0009', () => {
    // Pozo lleno de 0001 a 0008: el siguiente tiene que ser 0010.
    const usados = new Set<string>()
    for (let p = 1; p <= 8; p++) {
      for (const n of bloqueLleno(String(p).padStart(4, '0'))) usados.add(n)
    }
    const numero = elegirNumeroMercadoPago(usados, () => 0)
    expect(numero).not.toBeNull()
    expect(numero!.slice(0, 4)).toBe('0010')
  })

  it('pasa al siguiente prefijo cuando el activo está lleno', () => {
    const usados = new Set(bloqueLleno('0001'))
    const numero = elegirNumeroMercadoPago(usados, () => 0)
    expect(numero!.slice(0, 4)).toBe('0002')
  })

  it('no repite un número ya usado', () => {
    const usados = new Set(['00010000', '00010001'])
    const numero = elegirNumeroMercadoPago(usados, () => 0)
    expect(usados.has(numero!)).toBe(false)
  })

  it('cuenta también números de otro origen en el mismo prefijo', () => {
    // Un número manual en 0002 no debe pasar por alto ese prefijo.
    const usados = new Set(bloqueLleno('0001'))
    usados.add('00020000')
    const numero = elegirNumeroMercadoPago(usados, () => 0)
    expect(numero!.slice(0, 4)).toBe('0002')
    expect(numero).not.toBe('00020000')
  })
})
