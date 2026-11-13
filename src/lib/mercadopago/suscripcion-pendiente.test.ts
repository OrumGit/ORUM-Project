import { describe, expect, it } from 'vitest'
import { construirCuerpoSuscripcion, correoPagador } from './suscripcion-pendiente'

const base = {
  razon: 'Membresía ORUM · Anual',
  monto: 250000,
  duracionMeses: 12,
  emailPagador: '  Ana.Perez@Gmail.COM ',
  urlRetorno: 'https://www.cluborum.com/registro/pago/retorno',
  referenciaExterna: '42',
}

describe('construirCuerpoSuscripcion', () => {
  it('crea la suscripción en pending, sin plan asociado, en COP', () => {
    const c = construirCuerpoSuscripcion(base)
    expect(c.status).toBe('pending')
    expect(c.auto_recurring).toEqual({
      frequency: 12,
      frequency_type: 'months',
      transaction_amount: 250000,
      currency_id: 'COP',
    })
    expect(c).not.toHaveProperty('preapproval_plan_id')
  })

  it('guarda la referencia del registro y la vuelta a ORUM', () => {
    const c = construirCuerpoSuscripcion(base)
    expect(c.external_reference).toBe('42')
    expect(c.back_url).toBe(base.urlRetorno)
  })

  it('normaliza el correo del pagador', () => {
    expect(construirCuerpoSuscripcion(base).payer_email).toBe('ana.perez@gmail.com')
  })

  it('limita la razón a 120 caracteres', () => {
    const c = construirCuerpoSuscripcion({ ...base, razon: 'x'.repeat(300) })
    expect(c.reason.length).toBe(120)
  })

  it('un plan mensual pide frecuencia de 1 mes', () => {
    const c = construirCuerpoSuscripcion({ ...base, duracionMeses: 1, monto: 30000 })
    expect(c.auto_recurring.frequency).toBe(1)
    expect(c.auto_recurring.transaction_amount).toBe(30000)
  })
})

describe('correoPagador', () => {
  it('usa el correo del registro si no hay correo de prueba', () => {
    expect(correoPagador('Persona@Correo.com ', undefined)).toBe('persona@correo.com')
    expect(correoPagador('persona@correo.com', '   ')).toBe('persona@correo.com')
  })

  it('usa el correo de prueba cuando está definido', () => {
    expect(correoPagador('persona@correo.com', ' test_user_1@testuser.com ')).toBe(
      'test_user_1@testuser.com',
    )
  })
})
