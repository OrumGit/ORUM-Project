import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRolMiembro } from '@/lib/miembros/requerir-miembro'
import { fotoDelMes } from '@/lib/miembros/foto-socio'

export type MiFotoDatos = {
  nombre: string
  fotoUrl: string | null
  /** Si todavía no gastó el cambio de foto de este mes. */
  puedeCambiar: boolean
  /** «el 1 de noviembre». */
  proximoCambio: string
}

/**
 * La ficha del socio de la sesión. No admite parámetro a propósito: el
 * identificador sale de la cookie, nunca de la URL.
 *
 * Usa `requireRolMiembro` y no `requireMiembroVigente`: cambiar la foto no es
 * un beneficio del club, y un socio con la membresía vencida que está a punto
 * de renovar no tiene por qué encontrarse la puerta cerrada aquí.
 */
export async function cargarMiFoto(): Promise<MiFotoDatos | null> {
  const perfil = await requireRolMiembro()

  const supabase = await createClient()
  const { data: miembro } = await supabase
    .from('miembros')
    .select('id, nombres, apellidos, foto_url')
    .eq('perfil_id', perfil.userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!miembro) return null

  // La bitácora no se lee con la sesión del socio: con la `service_role`,
  // y solo las filas de SU ficha, que acaba de salir de la sesión.
  const mes = await fotoDelMes(createAdminClient(), miembro.id)

  return {
    nombre: `${miembro.nombres} ${miembro.apellidos}`.trim(),
    fotoUrl: miembro.foto_url,
    ...mes,
  }
}
