// Cliente de la API de Mercado Pago. Solo servidor: usa el Access Token.
//
// Se llama con REST (fetch) y no con el SDK `mercadopago`: son tres lecturas
// y no hace falta una dependencia más. El plan (§3.1) mencionaba el SDK; si se
// quiere cambiar, solo cambian estas tres funciones.

import 'server-only'

import type { CobroRecurrenteMP, PagoMP, SuscripcionMP } from './notificacion'

const BASE = 'https://api.mercadopago.com'
const TIEMPO_MAXIMO_MS = 10_000

/** Error de la API con su código HTTP. 404 significa que el recurso no existe. */
export class ErrorMercadoPago extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorMercadoPago'
  }
}

async function leer<T>(ruta: string): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN.')

  const respuesta = await fetch(`${BASE}${ruta}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
  })
  if (!respuesta.ok) {
    throw new ErrorMercadoPago(respuesta.status, `Mercado Pago respondió ${respuesta.status} en ${ruta}`)
  }
  return (await respuesta.json()) as T
}

/** Pago concreto (`/v1/payments/{id}`). Fuente de verdad del estado aprobado/rechazado. */
export function obtenerPago(id: string): Promise<PagoMP> {
  return leer<PagoMP>(`/v1/payments/${encodeURIComponent(id)}`)
}

/** Cuota de una suscripción (`/authorized_payments/{id}`). */
export function obtenerCobroRecurrente(id: string): Promise<CobroRecurrenteMP> {
  return leer<CobroRecurrenteMP>(`/authorized_payments/${encodeURIComponent(id)}`)
}

/** Suscripción (`/preapproval/{id}`). */
export function obtenerSuscripcion(id: string): Promise<SuscripcionMP> {
  return leer<SuscripcionMP>(`/preapproval/${encodeURIComponent(id)}`)
}
