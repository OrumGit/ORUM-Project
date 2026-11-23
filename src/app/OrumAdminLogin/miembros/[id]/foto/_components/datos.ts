import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type DatosFotoMiembro = {
  id: number
  nombre: string
  numeroMembresia: string
  fotoUrl: string | null
}

/**
 * Compartida por la pantalla completa y su gemela de `@modal`. Una sola
 * consulta para las dos: si cada una escribiera la suya, la interceptada
 * acabaría enseñando otra cosa y solo se vería al entrar por enlace directo.
 */
export async function cargarFotoMiembro(miembroId: number): Promise<DatosFotoMiembro | null> {
  if (!Number.isInteger(miembroId) || miembroId < 1) return null

  const admin = createAdminClient()
  const { data: miembro } = await admin
    .from('miembros')
    .select('id, nombres, apellidos, numero_membresia, foto_url')
    .eq('id', miembroId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!miembro) return null

  return {
    id: miembro.id,
    nombre: `${miembro.nombres} ${miembro.apellidos}`.trim(),
    numeroMembresia: miembro.numero_membresia,
    fotoUrl: miembro.foto_url,
  }
}
