/**
 * Cuerpo de la preferencia de pago único (Checkout Pro). Pura: arma el JSON;
 * la llamada a la API está en `cliente.ts` (`crearPreferencia`).
 *
 * Un pago único sirve a cualquier medio que ofrezca Mercado Pago (tarjeta,
 * Efecty, PSE, Bancolombia). No hay autorización guardada ni renovación: cada
 * membresía se paga antes de vencer.
 *
 * El vencimiento del pago en efectivo NO se fija aquí: se usa el que pone Mercado
 * Pago (unos 6 días en Colombia). En el sandbox, `date_of_expiration` ni en la
 * raíz ni en el item cambió esa fecha (pruebas del 25/11/2026). ORUM guarda la
 * fecha que devuelve cada pago.
 */

export type ArgsPreferenciaPago = {
  /** Lo que la persona lee en la página de Mercado Pago. */
  titulo: string
  /** Monto a pagar, en pesos colombianos. */
  monto: number
  /** Id del registro pendiente: así el pago se casa con el registro. */
  referenciaExterna: string
  /** Página de ORUM a la que vuelve la persona después de pagar. */
  urlRetorno: string
  /** Dirección pública que Mercado Pago llama con los avisos del pago. */
  urlNotificacion: string
}

export type CuerpoPreferencia = {
  items: Array<{
    title: string
    quantity: 1
    unit_price: number
    currency_id: 'COP'
  }>
  external_reference: string
  notification_url: string
  back_urls: { success: string; pending: string; failure: string }
  auto_return: 'approved'
}

/** Mercado Pago limita el título de cada item. */
const MAX_TITULO = 120

export function construirPreferenciaPago(args: ArgsPreferenciaPago): CuerpoPreferencia {
  // Las tres páginas de vuelta van a la misma ruta de retorno: ella consulta el
  // estado real del pago y muestra el mensaje que corresponde.
  return {
    items: [
      {
        title: args.titulo.trim().slice(0, MAX_TITULO),
        quantity: 1,
        unit_price: args.monto,
        currency_id: 'COP',
      },
    ],
    external_reference: args.referenciaExterna,
    notification_url: args.urlNotificacion,
    back_urls: {
      success: args.urlRetorno,
      pending: args.urlRetorno,
      failure: args.urlRetorno,
    },
    auto_return: 'approved',
  }
}
