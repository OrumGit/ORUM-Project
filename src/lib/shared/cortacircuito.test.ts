import { describe, expect, it } from 'vitest'
import { CortacircuitoAbierto, crearCortacircuito } from './cortacircuito'

// Reloj a mano: las pruebas no esperan de verdad ni dependen de la hora.
function reloj(inicio = 1_000) {
  let t = inicio
  return {
    ahora: () => t,
    avanzar: (ms: number) => {
      t += ms
    },
  }
}

describe('crearCortacircuito', () => {
  it('deja pasar una lectura que funciona y devuelve su valor', async () => {
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: reloj().ahora })
    await expect(c.ejecutar('catalogo', async () => 42)).resolves.toBe(42)
  })

  it('tras un fallo relanza el MISMO error', async () => {
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: reloj().ahora })
    const causa = new Error('522')
    await expect(c.ejecutar('catalogo', async () => Promise.reject(causa))).rejects.toBe(causa)
  })

  it('durante el enfriamiento NO vuelve a llamar a la lectura y lanza CortacircuitoAbierto', async () => {
    const r = reloj()
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: r.ahora })
    let llamadas = 0
    const lectura = async () => {
      llamadas++
      throw new Error('522')
    }
    await expect(c.ejecutar('catalogo', lectura)).rejects.toThrow('522')
    r.avanzar(5_000)
    await expect(c.ejecutar('catalogo', lectura)).rejects.toBeInstanceOf(CortacircuitoAbierto)
    expect(llamadas).toBe(1)
  })

  it('el error de circuito abierto dice la clave y cuánto falta', async () => {
    const r = reloj()
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: r.ahora })
    await expect(c.ejecutar('planes', async () => Promise.reject(new Error('x')))).rejects.toThrow()
    r.avanzar(4_000)
    const error = await c.ejecutar('planes', async () => 1).catch((e) => e)
    expect(error).toBeInstanceOf(CortacircuitoAbierto)
    expect(error.clave).toBe('planes')
    expect(error.reintentoEnMs).toBe(11_000)
  })

  it('al cumplirse el enfriamiento vuelve a intentar (justo en el límite)', async () => {
    const r = reloj()
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: r.ahora })
    await expect(c.ejecutar('catalogo', async () => Promise.reject(new Error('x')))).rejects.toThrow()
    r.avanzar(15_000)
    await expect(c.ejecutar('catalogo', async () => 'ok')).resolves.toBe('ok')
  })

  it('un nuevo fallo tras el enfriamiento reinicia la cuenta', async () => {
    const r = reloj()
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: r.ahora })
    await expect(c.ejecutar('catalogo', async () => Promise.reject(new Error('1')))).rejects.toThrow('1')
    r.avanzar(15_000)
    await expect(c.ejecutar('catalogo', async () => Promise.reject(new Error('2')))).rejects.toThrow('2')
    r.avanzar(14_999)
    await expect(c.ejecutar('catalogo', async () => 'ok')).rejects.toBeInstanceOf(CortacircuitoAbierto)
  })

  it('un éxito cierra el circuito: un fallo posterior empieza un enfriamiento nuevo', async () => {
    const r = reloj()
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: r.ahora })
    await expect(c.ejecutar('catalogo', async () => Promise.reject(new Error('x')))).rejects.toThrow()
    r.avanzar(15_000)
    await expect(c.ejecutar('catalogo', async () => 'ok')).resolves.toBe('ok')
    // sin fallo vigente, otra lectura buena pasa de inmediato
    await expect(c.ejecutar('catalogo', async () => 'ok2')).resolves.toBe('ok2')
  })

  it('cada clave tiene su propio circuito', async () => {
    const c = crearCortacircuito({ enfriamientoMs: 15_000, ahora: reloj().ahora })
    await expect(c.ejecutar('catalogo', async () => Promise.reject(new Error('x')))).rejects.toThrow()
    await expect(c.ejecutar('planes', async () => 'ok')).resolves.toBe('ok')
  })
})
