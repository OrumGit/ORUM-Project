import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type DatosReasignarNumero = {
  miembroId: number
  nombre: string
  numeroActual: string
  /** Ventas registradas: si hay alguna, la reasignación está bloqueada. */
  ventas: number
  /** Números libres del pozo, en orden. */
  libres: string[]
  /** Hay más libres de los que cabe en la lista (`LIMITE_LIBRES`). */
  libresRecortados: boolean
}

/** Tope de lectura del pozo: PostgREST corta en 1000 filas, así que se pide uno más para saber si sobra. */
const LIMITE_LIBRES = 1000

/**
 * Lo que necesita la ventana de reasignar el número. `null` si el miembro no
 * existe. La comparten la pantalla y su gemela de `@modal`.
 */
export async function cargarReasignarNumero(miembroId: number): Promise<DatosReasignarNumero | null> {
  if (!Number.isInteger(miembroId) || miembroId < 1) return null

  const admin = createAdminClient()
  const [{ data: miembro }, { count: ventas }, { data: pozo }] = await Promise.all([
    admin
      .from('miembros')
      .select('id, nombres, apellidos, numero_membresia')
      .eq('id', miembroId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.from('ventas').select('id', { count: 'exact', head: true }).eq('miembro_id', miembroId),
    admin
      .from('numeros_registro')
      .select('numero')
      .is('miembro_id', null)
      .order('numero', { ascending: true })
      .limit(LIMITE_LIBRES + 1),
  ])
  if (!miembro) return null

  const filas = pozo ?? []
  return {
    miembroId: miembro.id,
    nombre: `${miembro.nombres} ${miembro.apellidos}`.trim(),
    numeroActual: miembro.numero_membresia,
    ventas: ventas ?? 0,
    libres: filas.slice(0, LIMITE_LIBRES).map((f) => f.numero),
    libresRecortados: filas.length > LIMITE_LIBRES,
  }
}
