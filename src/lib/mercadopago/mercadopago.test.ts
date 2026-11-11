import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { accionCobro, accionSuscripcion } from './estados'
import { graciaHasta, graciaVencida, sumarDiasCivil } from './periodo'
import { parsearXSignature, verificarFirma, construirManifest } from './firma'

describe('periodo (fechas civiles)', () => {
  it('suma días cruzando fin de mes y de año', () => {
    expect(sumarDiasCivil('2026-01-30', 3)).toBe('2026-02-02')
    expect(sumarDiasCivil('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('la gracia son 3 días después de fecha_fin', () => {
    expect(graciaHasta('2026-11-30')).toBe('2026-12-03')
  })

  it('no se retrasa un día por zona horaria (sin tocar la hora local)', () => {
    expect(sumarDiasCivil('2026-03-01', 0)).toBe('2026-03-01')
  })

  it('la gracia vence el día siguiente al último día de gracia', () => {
    expect(graciaVencida('2026-12-03', '2026-12-03')).toBe(false)
    expect(graciaVencida('2026-12-03', '2026-12-04')).toBe(true)
  })

  it('rechaza fechas mal formadas', () => {
    expect(() => sumarDiasCivil('2026/12/03', 1)).toThrow()
  })
})

describe('firma (x-signature)', () => {
  const secreto = 'secreto-de-prueba'
  const ahora = 1_800_000_000
  const dataId = '123456'
  const requestId = 'req-abc'

  // Firma calculada a mano, sin usar la función del módulo.
  const manifest = `id:${dataId};request-id:${requestId};ts:${ahora};`
  const v1 = createHmac('sha256', secreto).update(manifest).digest('hex')
  const cabecera = `ts=${ahora},v1=${v1}`

  it('acepta una firma correcta dentro de la tolerancia', () => {
    expect(
      verificarFirma({ cabecera, dataId, requestId, secreto, ahoraSeg: ahora + 10 }),
    ).toBe(true)
  })

  it('rechaza si cambia el data.id', () => {
    expect(
      verificarFirma({ cabecera, dataId: '999', requestId, secreto, ahoraSeg: ahora }),
    ).toBe(false)
  })

  it('rechaza si cambia el request-id', () => {
    expect(
      verificarFirma({ cabecera, dataId, requestId: 'otro', secreto, ahoraSeg: ahora }),
    ).toBe(false)
  })

  it('rechaza con otra clave secreta', () => {
    expect(
      verificarFirma({ cabecera, dataId, requestId, secreto: 'otra', ahoraSeg: ahora }),
    ).toBe(false)
  })

  it('rechaza un ts fuera de la ventana (repetición antigua)', () => {
    expect(
      verificarFirma({ cabecera, dataId, requestId, secreto, ahoraSeg: ahora + 3600 }),
    ).toBe(false)
  })

  it('rechaza cabeceras ausentes o incompletas', () => {
    expect(verificarFirma({ cabecera: null, dataId, requestId, secreto, ahoraSeg: ahora })).toBe(false)
    expect(verificarFirma({ cabecera: 'ts=1', dataId, requestId, secreto, ahoraSeg: ahora })).toBe(false)
    expect(verificarFirma({ cabecera, dataId: null, requestId, secreto, ahoraSeg: ahora })).toBe(false)
  })

  it('parsea la cabecera y arma el manifest en el orden esperado', () => {
    expect(parsearXSignature('ts=5, v1=ab')).toEqual({ ts: '5', v1: 'ab' })
    expect(construirManifest({ dataId: 'd', requestId: 'r', ts: '7' })).toBe(
      'id:d;request-id:r;ts:7;',
    )
  })
})

describe('estados de suscripción y cobro', () => {
  it('authorized activa la renovación; paused y canceled la desactivan', () => {
    expect(accionSuscripcion('authorized')).toEqual({ tipo: 'sincronizar_renovacion', renovacionActiva: true })
    expect(accionSuscripcion('paused')).toEqual({ tipo: 'sincronizar_renovacion', renovacionActiva: false })
    expect(accionSuscripcion('canceled')).toEqual({ tipo: 'sincronizar_renovacion', renovacionActiva: false })
    expect(accionSuscripcion('cancelled')).toEqual({ tipo: 'sincronizar_renovacion', renovacionActiva: false })
  })

  it('pending no cambia nada en ORUM', () => {
    expect(accionSuscripcion('pending').tipo).toBe('ignorar')
  })

  it('un estado desconocido se ignora sin lanzar', () => {
    expect(accionSuscripcion('algo_nuevo').tipo).toBe('ignorar')
    expect(accionCobro(undefined).tipo).toBe('ignorar')
  })

  it('solo el estado del pago (approved/rejected) aprueba o rechaza', () => {
    expect(accionCobro('approved')).toEqual({ tipo: 'registrar_aprobado' })
    expect(accionCobro('rejected')).toEqual({ tipo: 'registrar_rechazado' })
  })

  it('una cuota processed NO aprueba: hay que consultar su pago (puede estar rechazada tras agotar reintentos)', () => {
    expect(accionCobro('processed')).toEqual({ tipo: 'consultar_pago' })
    expect(accionCobro('recycling')).toEqual({ tipo: 'consultar_pago' })
    expect(accionCobro('processed').tipo).not.toBe('registrar_aprobado')
  })

  it('en espera no toca la membresía; reembolso y contracargo van a revisión', () => {
    expect(accionCobro('waiting for gateway').tipo).toBe('consultar_pago')
    expect(accionCobro('in_process').tipo).toBe('esperar')
    expect(accionCobro('refunded').tipo).toBe('revisar_manual')
    expect(accionCobro('charged_back').tipo).toBe('revisar_manual')
  })
})
