import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  armarTopCalificados,
  armarTopVentas,
  type ComercioDelTop,
  type TopComercios,
} from './top-comercios'

type Cliente = SupabaseClient<Database>

/**
 * Lee las dos listas del top (funciones `top_comercios_calificados` y
 * `top_comercios_ventas`) y las cruza con el catálogo que el Inicio ya tiene.
 *
 * NUNCA lanza. El esquema se aplica a mano y el código puede llegar antes:
 * si una función no existe o falla, esa lista queda vacía y la otra se
 * conserva; si fallan las dos devuelve `null` y el Inicio no pinta el bloque,
 * que es mejor que una pantalla rota.
 */
export async function leerTopComercios(
  cliente: Cliente,
  comercios: readonly ComercioDelTop[],
): Promise<TopComercios | null> {
  try {
    const porId = new Map(comercios.map((c) => [c.id, c]))
    const [calificados, ventas] = await Promise.all([
      cliente.rpc('top_comercios_calificados'),
      cliente.rpc('top_comercios_ventas'),
    ])

    const fallaCalificados = calificados.error !== null || !calificados.data
    const fallaVentas = ventas.error !== null || !ventas.data
    if (fallaCalificados && fallaVentas) return null

    return {
      calificados: fallaCalificados ? [] : armarTopCalificados(calificados.data ?? [], porId),
      ventas: fallaVentas ? [] : armarTopVentas(ventas.data ?? [], porId),
    }
  } catch {
    return null
  }
}
