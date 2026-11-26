// Cliente de la API de Mercado Pago. Solo servidor: usa el Access Token.
//
// Se llama con REST (fetch) y no con el SDK `mercadopago`: son tres lecturas
// y no hace falta una dependencia más. El plan (§3.1) mencionaba el SDK; si se
// quiere cambiar, solo cambian estas tres funciones.

import 'server-only'

import type { PagoMP } from './notificacion'
import type { CuerpoPreferencia } from './preferencia-pago'

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
    // El cuerpo dice QUÉ campo rechaza (back_url, payer_email…): sin él, el log solo dice «400».
    const detalle = (await respuesta.text().catch(() => '')).slice(0, 400)
    throw new ErrorMercadoPago(
      respuesta.status,
      `Mercado Pago respondió ${respuesta.status} en ${ruta}${detalle ? `: ${detalle}` : ''}`,
    )
  }
  return (await respuesta.json()) as T
}

/** Pago concreto (`/v1/payments/{id}`). Fuente de verdad del estado aprobado/rechazado. */
export function obtenerPago(id: string): Promise<PagoMP> {
  return leer<PagoMP>(`/v1/payments/${encodeURIComponent(id)}`)
}

async function escribir<T>(metodo: 'POST' | 'PUT', ruta: string, cuerpo: unknown): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN.')

  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
  })
  if (!respuesta.ok) {
    // El cuerpo dice QUÉ campo rechaza (back_url, payer_email…): sin él, el log solo dice «400».
    const detalle = (await respuesta.text().catch(() => '')).slice(0, 400)
    throw new ErrorMercadoPago(
      respuesta.status,
      `Mercado Pago respondió ${respuesta.status} en ${ruta}${detalle ? `: ${detalle}` : ''}`,
    )
  }
  return (await respuesta.json()) as T
}

/** Crea una preferencia de pago único (Checkout Pro) y devuelve su id y el enlace de pago (`init_point`). */
export function crearPreferencia(
  cuerpo: CuerpoPreferencia,
): Promise<{ id: string; init_point: string }> {
  return escribir('POST', '/checkout/preferences', cuerpo)
}

/** Pagos de una referencia externa (el id del registro en pago único), el más reciente primero. */
export function buscarPagosPorReferencia(
  referencia: string,
): Promise<{ results?: Array<{ id: number | string; status?: string | null }> }> {
  return leer(
    `/v1/payments/search?external_reference=${encodeURIComponent(referencia)}&sort=date_created&criteria=desc`,
  )
}
