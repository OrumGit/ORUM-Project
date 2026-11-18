/**
 * Cuerpo de la suscripción que se crea al pagar (modelo B: sin plan asociado).
 * Pura: arma el JSON; la llamada a la API está en `cliente.ts`.
 *
 * Queda en `pending`: Mercado Pago devuelve un enlace (`init_point`) donde la
 * persona mete su tarjeta. Nada se cobra hasta que ella completa ese paso.
 */

export type ArgsSuscripcionPendiente = {
  /** Lo que la persona lee en la página de Mercado Pago, p. ej. «Membresía ORUM · Anual». */
  razon: string
  /** Monto por periodo, en pesos colombianos. */
  monto: number
  /** Duración del periodo del plan, en meses (1 = mensual, 12 = anual). */
  duracionMeses: number
  /**
   * Correo del pagador, o `null` para no fijarlo (solo en pruebas): Mercado
   * Pago entonces deja que la persona pague con cualquier cuenta de prueba.
   */
  emailPagador: string | null
  /** Página de ORUM a la que vuelve la persona después de pagar. */
  urlRetorno: string
  /** Id del registro pendiente, para casar la notificación con el registro. */
  referenciaExterna: string
}

export type CuerpoSuscripcion = {
  reason: string
  external_reference: string
  /** Ausente cuando no se fija el pagador (modo de prueba). */
  payer_email?: string
  back_url: string
  status: 'pending'
  auto_recurring: {
    frequency: number
    frequency_type: 'months'
    transaction_amount: number
    currency_id: 'COP'
  }
}

const MAX_RAZON = 120

export function construirCuerpoSuscripcion(args: ArgsSuscripcionPendiente): CuerpoSuscripcion {
  const cuerpo: CuerpoSuscripcion = {
    reason: args.razon.trim().slice(0, MAX_RAZON),
    external_reference: args.referenciaExterna,
    back_url: args.urlRetorno,
    status: 'pending',
    auto_recurring: {
      frequency: args.duracionMeses,
      frequency_type: 'months',
      transaction_amount: args.monto,
      currency_id: 'COP',
    },
  }
  if (args.emailPagador !== null) {
    cuerpo.payer_email = args.emailPagador.trim().toLowerCase()
  }
  return cuerpo
}

/**
 * Correo que se fija como pagador de la suscripción. Mercado Pago exige
 * `payer_email` al crearla, así que siempre se envía. En producción es el del
 * registro. En pruebas, `MP_PAGADOR_PRUEBA` (solo Preview) pone el correo de un
 * comprador de prueba: con credenciales de prueba el pagador tiene que ser uno.
 */
export function correoPagador(correoRegistro: string, correoPrueba: string | undefined): string {
  const prueba = correoPrueba?.trim()
  return (prueba ? prueba : correoRegistro).trim().toLowerCase()
}
