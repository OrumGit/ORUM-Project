// Validación de la firma de los webhooks de Mercado Pago.
//
// Cabecera `x-signature`: `ts=<unix>,v1=<hex>`.
// Manifest firmado: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
// HMAC-SHA256 con la clave secreta del panel.
//
// PENDIENTE DE VERIFICAR contra la documentación de webhooks antes de
// producción: el formato del manifest sale del esquema conocido de MP y no
// apareció en la búsqueda del MCP. Comprobar con una notificación real.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const TOLERANCIA_TS_SEG = 5 * 60

export type FirmaParseada = { ts: string; v1: string }

export function parsearXSignature(cabecera: string | null | undefined): FirmaParseada | null {
  if (!cabecera) return null
  let ts: string | undefined
  let v1: string | undefined
  for (const parte of cabecera.split(',')) {
    const i = parte.indexOf('=')
    if (i < 0) continue
    const clave = parte.slice(0, i).trim()
    const valor = parte.slice(i + 1).trim()
    if (clave === 'ts') ts = valor
    if (clave === 'v1') v1 = valor
  }
  if (!ts || !v1) return null
  return { ts, v1 }
}

export function construirManifest(args: { dataId: string; requestId: string; ts: string }): string {
  return `id:${args.dataId};request-id:${args.requestId};ts:${args.ts};`
}

export function calcularV1(manifest: string, secreto: string): string {
  return createHmac('sha256', secreto).update(manifest).digest('hex')
}

/**
 * true solo si la firma cuadra, el `ts` está dentro de la tolerancia y
 * la comparación es de tiempo constante.
 */
export function verificarFirma(args: {
  cabecera: string | null | undefined
  dataId: string | null | undefined
  requestId: string | null | undefined
  secreto: string
  ahoraSeg: number
  toleranciaSeg?: number
}): boolean {
  const firma = parsearXSignature(args.cabecera)
  if (!firma || !args.dataId || !args.requestId || !args.secreto) return false

  const tsNum = Number(firma.ts)
  if (!Number.isFinite(tsNum)) return false
  const tolerancia = args.toleranciaSeg ?? TOLERANCIA_TS_SEG
  if (Math.abs(args.ahoraSeg - tsNum) > tolerancia) return false

  const esperado = calcularV1(
    construirManifest({ dataId: args.dataId, requestId: args.requestId, ts: firma.ts }),
    args.secreto,
  )
  const a = Buffer.from(esperado, 'utf8')
  const b = Buffer.from(firma.v1, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
