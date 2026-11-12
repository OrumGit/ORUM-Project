import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type DatosAvatarUsuario = {
  perfilId: string
  nombre: string
  email: string
  avatarUrl: string | null
}

/**
 * Datos del avatar de un usuario del club.
 *
 * Compartida por la pantalla completa y su gemela de `@modal`: dos consultas
 * distintas para lo mismo acaban divergiendo sin que nadie lo vea.
 *
 * El nombre sale de `empleados`; si el perfil todavía no tiene ficha de
 * empleado, se cae al correo — que es lo que ya hace el resto del panel.
 */
export async function cargarAvatarUsuario(
  perfilId: string,
): Promise<DatosAvatarUsuario | null> {
  if (!perfilId) return null

  const admin = createAdminClient()

  const [{ data: perfil }, { data: empleado }, { data: auth }] = await Promise.all([
    admin.from('perfiles').select('id, avatar_url').eq('id', perfilId).maybeSingle(),
    admin
      .from('empleados')
      .select('nombres, apellidos')
      .eq('perfil_id', perfilId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.auth.admin.getUserById(perfilId),
  ])

  if (!perfil) return null

  const email = auth.user?.email ?? ''
  const nombre = empleado
    ? `${empleado.nombres} ${empleado.apellidos}`.trim()
    : email || 'Usuario'

  return { perfilId: perfil.id, nombre, email, avatarUrl: perfil.avatar_url }
}
