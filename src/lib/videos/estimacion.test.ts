import { describe, it, expect } from 'vitest'
import { MAXIMO_MUESTRAS, agregarMuestra, estimarRestante, suavizarRestante, textoRestante, type Muestra } from './estimacion'

describe('cuánto falta', () => {
  it('no se atreve muy pronto ni sin avance', () => {
    expect(estimarRestante([])).toBeNull()
    expect(estimarRestante([{ t: 0, p: 0 }, { t: 1, p: 0.1 }])).toBeNull()
    expect(estimarRestante([{ t: 0, p: 0.2 }, { t: 5, p: 0.2 }])).toBeNull()
  })

  it('a ritmo constante, lo que falta es lineal', () => {
    // 10 % cada 2 s → del 40 % al 100 % faltan 12 s.
    const muestras = [0, 2, 4, 6, 8].map((t) => ({ t, p: t * 0.05 }))
    expect(estimarRestante(muestras)).toBeCloseTo(12, 5)
  })

  it('mira solo los últimos segundos: un arranque lento no pesa', () => {
    const lento = [{ t: 0, p: 0 }, { t: 10, p: 0.01 }]
    const rapido = [12, 14, 16, 18, 20].map((t) => ({ t, p: 0.01 + (t - 10) * 0.05 }))
    // Ritmo de la ventana: 5 % por segundo; en 0,51 faltan 9,8 s.
    expect(estimarRestante([...lento, ...rapido])).toBeCloseTo(9.8, 1)
  })

  it('un arranque lento y luego rápido llega cerca de la verdad en pocos segundos', () => {
    // 10 s al 0,2 %/s y después 10 %/s: lo que se enseña, segundo a segundo.
    let muestras: Muestra[] = []
    let mostrado: number | null = null
    let p = 0
    for (let t = 0; t <= 16; t += 0.25) {
      p = Math.min(1, p + (t < 10 ? 0.0005 : 0.025))
      muestras = agregarMuestra(muestras, { t, p })
      if (Number.isInteger(t)) mostrado = suavizarRestante(mostrado, estimarRestante(muestras), 1)
    }
    // A los 16 s va por el 62 % y faltan ~3,8 s: lo enseñado no anda lejos.
    expect(mostrado).not.toBeNull()
    expect(mostrado!).toBeLessThan(10)
  })

  it('cientos de avisos por segundo no se comen la historia', () => {
    // 8 s de avisos cada 2 ms, a 5 % por segundo.
    let muestras: Muestra[] = []
    for (let t = 0; t <= 8; t += 0.002) muestras = agregarMuestra(muestras, { t, p: t * 0.05 })
    expect(muestras.length).toBeLessThanOrEqual(MAXIMO_MUESTRAS)
    expect(muestras[muestras.length - 1].t - muestras[0].t).toBeGreaterThan(7)
    // Del 40 % al 100 % a 5 %/s faltan 12 s.
    expect(estimarRestante(muestras)).toBeCloseTo(12, 0)
  })

  it('guarda como mucho las últimas', () => {
    let muestras: Muestra[] = []
    for (let i = 0; i < 300; i++) muestras = agregarMuestra(muestras, { t: i, p: i / 300 })
    expect(muestras).toHaveLength(MAXIMO_MUESTRAS)
    expect(muestras[0].t).toBe(300 - MAXIMO_MUESTRAS)
  })

  it('terminado es cero', () => {
    expect(estimarRestante([{ t: 0, p: 0.5 }, { t: 3, p: 1 }])).toBe(0)
  })

  it('suaviza: baja deprisa si se acelera, sube con calma si se frena, nunca negativo', () => {
    expect(suavizarRestante(null, 40, 1)).toBe(40)
    // Se esperaban 39 y dice 20 (va más rápido): 39·0,4 + 20·0,6 = 27,6.
    expect(suavizarRestante(40, 20, 1)).toBeCloseTo(27.6, 5)
    // Se esperaban 19 y dice 40 (se frenó): 19·0,7 + 40·0,3 = 25,3.
    expect(suavizarRestante(20, 40, 1)).toBeCloseTo(25.3, 5)
    expect(suavizarRestante(10, null, 1)).toBe(9)
    expect(suavizarRestante(0.5, null, 2)).toBe(0)
    expect(suavizarRestante(null, null, 1)).toBeNull()
  })

  it('lo dice en palabras, redondeado', () => {
    expect(textoRestante(null)).toBe('Calculando cuánto falta…')
    expect(textoRestante(3)).toBe('Ya casi termina')
    expect(textoRestante(33)).toBe('Faltan unos 35 s')
    expect(textoRestante(6)).toBe('Faltan unos 5 s')
    expect(textoRestante(70)).toBe('Falta cerca de 1 min')
    expect(textoRestante(140)).toBe('Faltan unos 2,5 min')
    expect(textoRestante(300)).toBe('Faltan unos 5 min')
  })
})
