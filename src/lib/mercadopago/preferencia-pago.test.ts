import { describe, expect, it } from 'vitest'
import { construirPreferenciaPago } from './preferencia-pago'

const base = {
  titulo: 'Membresía ORUM · Anual',
  monto: 250000,
  referenciaExterna: '42',
  urlRetorno: 'https://www.cluborum.com/registro/pago/retorno',
  urlNotificacion: 'https://www.cluborum.com/api/mercadopago/webhook',
}

describe('construirPreferenciaPago', () => {
  it('es un pago único en COP, sin suscripción ni autorización guardada', () => {
    const c = construirPreferenciaPago(base)
    expect(c.items).toEqual([
      { title: 'Membresía ORUM · Anual', quantity: 1, unit_price: 250000, currency_id: 'COP' },
    ])
    expect(c).not.toHaveProperty('auto_recurring')
    expect(c).not.toHaveProperty('preapproval_plan_id')
  })

  it('casa el pago con el registro y fija el aviso de notificación', () => {
    const c = construirPreferenciaPago(base)
    expect(c.external_reference).toBe('42')
    expect(c.notification_url).toBe(base.urlNotificacion)
  })

  it('vuelve a la misma ruta de retorno en las tres salidas y aprueba solo auto-retorno', () => {
    const c = construirPreferenciaPago(base)
    expect(c.back_urls).toEqual({
      success: base.urlRetorno,
      pending: base.urlRetorno,
      failure: base.urlRetorno,
    })
    expect(c.auto_return).toBe('approved')
  })

  it('no fija vencimiento: se usa el que pone Mercado Pago', () => {
    const c = construirPreferenciaPago(base)
    expect(c).not.toHaveProperty('date_of_expiration')
    expect(c.items[0]).not.toHaveProperty('date_of_expiration')
  })

  it('recorta el título al límite de Mercado Pago', () => {
    const c = construirPreferenciaPago({ ...base, titulo: ' ' + 'A'.repeat(200) + ' ' })
    expect(c.items[0].title.length).toBe(120)
    expect(c.items[0].title.startsWith('A')).toBe(true)
  })
})
