import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RolCodigo } from '@/lib/supabase/database.types'

/**
 * Información del usuario autenticado y su perfil/rol.
 */
export type PerfilActual = {
  userId: string
  email: string | null
  rolId: number
  rolCodigo: RolCodigo
  rolNombre: string
  activo: boolean
}

/**
 * Devuelve el usuario autenticado junto con su perfil y rol, o `null` si no hay
 * sesión válida (o el perfil está inactivo / no existe).
 *
 * Se apoya en `supabase.auth.getUser()`, que valida el token contra Supabase
 * (no confía solo en la cookie). A propósito NO es `getClaims()`: este es el
 * punto donde se decide el acceso, y `getClaims()` no ve un cierre de sesión
 * ni un bloqueo hasta que el token caduca.
 *
 * Va envuelta en `cache()` de React (08/11/2026): el layout de cada portal y su
 * página piden el perfil en la misma petición, y cada pedido repetía la
 * llamada a Auth y las dos consultas (`perfiles`, `roles`). `cache()` solo
 * deduplica DENTRO de una petición, así que no reutiliza nada entre usuarios
 * ni entre peticiones: la validación sigue haciéndose en cada una.
 */
export const getPerfilActual = cache(async (): Promise<PerfilActual | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol_id, activo')
    .eq('id', user.id)
    .single()

  if (!perfil) return null

  const { data: rol } = await supabase
    .from('roles')
    .select('codigo, nombre')
    .eq('id', perfil.rol_id)
    .single()

  if (!rol) return null

  return {
    userId: user.id,
    email: user.email ?? null,
    rolId: perfil.rol_id,
    rolCodigo: rol.codigo,
    rolNombre: rol.nombre,
    activo: perfil.activo,
  }
})

/**
 * Exige que haya un usuario autenticado, activo y con uno de los roles
 * permitidos. Si no se cumple, «página no encontrada» (11/11/2026): antes
 * redirigía a `/login`, y así cualquiera que escribiera `/admin` descubría
 * la puerta del panel, que ahora vive en una dirección secreta
 * (`lib/auth/ruta-panel.ts`). Devuelve el perfil cuando todo está en orden
 * (útil para usarlo en la misma página).
 *
 * Uso típico al inicio de un Server Component:
 *   const perfil = await requireRol('super_admin')
 */
export async function requireRol(
  ...rolesPermitidos: RolCodigo[]
): Promise<PerfilActual> {
  const perfil = await getPerfilActual()

  if (!perfil || !perfil.activo) {
    notFound()
  }

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(perfil.rolCodigo)) {
    // Autenticado pero sin permiso para esta sección: tampoco se le cuenta que existe.
    notFound()
  }

  return perfil
}
