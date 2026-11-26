import { describe, expect, it } from 'vitest'
import { leerNotificacion } from './notificacion'

describe('leerNotificacion', () => {
  it('toma el tipo, el recurso y el id de la notificación del cuerpo', () => {
    const n = leerNotificacion(
      { id: 987, type: 'payment', action: 'payment.updated', live_mode: true, data: { id: '555' } },
      null,
    )
    expect(n).toEqual({
      idNotificacion: '987',
      tipo: 'payment',
      accion: 'payment.updated',
      recursoId: '555',
      liveMode: true,
    })
  })

  it('prefiere el data.id de la URL (el que viaja firmado)', () => {
    const n = leerNotificacion({ type: 'payment', data: { id: '111' } }, '222')
    expect(n?.recursoId).toBe('222')
  })

  it('sin id de notificación, la clave sale del tipo, el recurso y la acción', () => {
    const n = leerNotificacion({ type: 'subscription_preapproval', action: 'updated', data: { id: 'abc' } }, null)
    expect(n?.idNotificacion).toBe('subscription_preapproval:abc:updated')
  })

  it('devuelve null si no hay tipo o recurso', () => {
    expect(leerNotificacion({ data: { id: '1' } }, null)).toBeNull()
    expect(leerNotificacion({ type: 'payment' }, null)).toBeNull()
    expect(leerNotificacion(null, null)).toBeNull()
    expect(leerNotificacion('texto', null)).toBeNull()
  })

  it('live_mode solo es true si viene explícitamente true', () => {
    expect(leerNotificacion({ type: 'payment', data: { id: '1' } }, null)?.liveMode).toBe(false)
  })
})

