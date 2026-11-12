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
  /** Correo del registro: Mercado Pago lo usa como pagador. */
  emailPagador: string
  /** Página de ORUM a la que vuelve la persona después de pagar. */
  urlRetorno: string
  /** Id del registro pendiente, para casar la notificación con el registro. */
  referenciaExterna: string
}

export type CuerpoSuscripcion = {
  reason: string
  external_reference: string
  payer_email: string
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
  return {
    reason: args.razon.trim().slice(0, MAX_RAZON),
    external_reference: args.referenciaExterna,
    payer_email: args.emailPagador.trim().toLowerCase(),
    back_url: args.urlRetorno,
    status: 'pending',
    auto_recurring: {
      frequency: args.duracionMeses,
      frequency_type: 'months',
      transaction_amount: args.monto,
      currency_id: 'COP',
    },
  }
}
