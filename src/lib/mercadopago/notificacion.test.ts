import { describe, expect, it } from 'vitest'
import { argsRegistrarCobro, leerNotificacion, preapprovalDePago } from './notificacion'

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

describe('argsRegistrarCobro', () => {
  it('mapea un pago aprobado a los argumentos de registrar_cobro_mp', () => {
    expect(
      argsRegistrarCobro(
        { id: 42, status: 'approved', status_detail: 'accredited', transaction_amount: 25000, currency_id: 'COP' },
        'pre-1',
      ),
    ).toEqual({
      p_payment_id: '42',
      p_preapproval_id: 'pre-1',
      p_monto: 25000,
      p_moneda: 'COP',
      p_estado_mp: 'approved',
      p_status_detail: 'accredited',
    })
  })

  it('usa COP y detalle nulo cuando no vienen', () => {
    const a = argsRegistrarCobro({ id: '7', status: 'rejected', transaction_amount: 0 }, 'pre-1')
    expect(a?.p_moneda).toBe('COP')
    expect(a?.p_status_detail).toBeNull()
  })

  it('no registra sin id de suscripción, sin estado o con monto inválido', () => {
    expect(argsRegistrarCobro({ id: 1, status: 'approved', transaction_amount: 10 }, '')).toBeNull()
    expect(argsRegistrarCobro({ id: 1, transaction_amount: 10 }, 'pre-1')).toBeNull()
    expect(argsRegistrarCobro({ id: 1, status: 'approved' }, 'pre-1')).toBeNull()
    expect(argsRegistrarCobro({ id: 1, status: 'approved', transaction_amount: -5 }, 'pre-1')).toBeNull()
    expect(argsRegistrarCobro({ id: 1, status: 'approved', transaction_amount: NaN }, 'pre-1')).toBeNull()
  })
})

describe('preapprovalDePago', () => {
  it('lee el preapproval_id de los metadatos', () => {
    expect(preapprovalDePago({ id: 1, metadata: { preapproval_id: 'pre-9' } })).toBe('pre-9')
  })

  it('devuelve null si no está o no es texto', () => {
    expect(preapprovalDePago({ id: 1 })).toBeNull()
    expect(preapprovalDePago({ id: 1, metadata: { preapproval_id: 5 } })).toBeNull()
    expect(preapprovalDePago({ id: 1, metadata: { preapproval_id: '' } })).toBeNull()
  })
})
