import { describe, expect, it } from 'vitest'
import { fetchConTiempoMaximo } from './fetch-con-tiempo'

// Un `fetch` que nunca responde: solo termina si alguien lo cancela.
const fetchColgado = ((_url: unknown, init?: RequestInit) =>
  new Promise<Response>((_resolver, rechazar) => {
    init?.signal?.addEventListener('abort', () => rechazar(init.signal?.reason))
  })) as typeof fetch

describe('fetchConTiempoMaximo', () => {
  it('pasa la URL y las opciones al fetch de base y devuelve su respuesta', async () => {
    let recibido: { url: unknown; metodo?: string } | null = null
    const base = (async (url: unknown, init?: RequestInit) => {
      recibido = { url, metodo: init?.method }
      return new Response('hola')
    }) as typeof fetch

    const res = await fetchConTiempoMaximo(1_000, base)('https://x.test/a', { method: 'POST' })

    expect(await res.text()).toBe('hola')
    expect(recibido).toEqual({ url: 'https://x.test/a', metodo: 'POST' })
  })

  it('corta una petición que nunca responde con un error de tiempo agotado', async () => {
    const f = fetchConTiempoMaximo(20, fetchColgado)
    await expect(f('https://x.test/a')).rejects.toMatchObject({ name: 'TimeoutError' })
  })

  it('sigue respetando la cancelación de quien llama', async () => {
    const f = fetchConTiempoMaximo(5_000, fetchColgado)
    const control = new AbortController()
    const promesa = f('https://x.test/a', { signal: control.signal })
    control.abort()
    await expect(promesa).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('una respuesta rápida no queda cancelada después', async () => {
    const base = (async () => new Response('ok')) as typeof fetch
    const res = await fetchConTiempoMaximo(20, base)('https://x.test/a')
    await new Promise((r) => setTimeout(r, 40))
    expect(await res.text()).toBe('ok')
  })
})
