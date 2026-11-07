/*
  Barrera de compilación, no un ruego.

  Debajo hay un comentario que dice "no importes esto desde un Client
  Component". Un comentario no impide nada: basta un `'use client'` añadido
  por descuido en la cadena de importaciones para que la `service_role` —que
  ignora TODAS las políticas RLS— acabe en un bundle del navegador. Sería el
  fallo más grave posible en este proyecto y no daría ningún síntoma.

  `server-only` convierte ese descuido en un error de build.
*/
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { fetchConTiempoMaximo } from '@/lib/shared/fetch-con-tiempo'
import type { Database } from './database.types'

/**
 * Cliente de Supabase con la clave `service_role`.
 *
 * ⚠️ SOLO se puede usar en el servidor (Server Actions / Route Handlers).
 * La `service_role key` ignora las políticas RLS y tiene acceso total, por eso
 * NUNCA debe llegar al navegador: no importes este archivo desde un Client
 * Component (los que llevan 'use client'). Solo desde Server Actions o Route
 * Handlers.
 *
 * Se usa, sobre todo, para la Admin API de Auth (crear usuarios, cambiar
 * contraseñas, desactivar accesos) que no está disponible con la anon key.
 */
export function createAdminClient(opciones?: {
  /**
   * Techo de espera por petición. Sin él, `fetch` espera sin límite y una
   * función de Vercel puede quedar colgada 300 s si Supabase no contesta (visto
   * en la prueba de carga del 06/11/2026). Lo pide la capa de datos de la
   * fachada; las acciones del panel y el Auth siguen sin límite, como antes.
   */
  tiempoMaximoMs?: number
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(opciones?.tiempoMaximoMs
      ? { global: { fetch: fetchConTiempoMaximo(opciones.tiempoMaximoMs) } }
      : {}),
  })
}
