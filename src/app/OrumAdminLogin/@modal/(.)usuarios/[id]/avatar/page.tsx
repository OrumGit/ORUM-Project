import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { AvatarUsuario } from '@/app/OrumAdminLogin/usuarios/[id]/avatar/_components/avatar-usuario'
import { cargarAvatarUsuario } from '@/app/OrumAdminLogin/usuarios/[id]/avatar/_components/datos'

/**
 * Gemela interceptada del avatar. `medium`: el formulario es una sola fila y
 * conviene seguir viendo la lista de usuarios de detrás.
 */
export default async function AvatarUsuarioInterceptado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params

  const datos = await cargarAvatarUsuario(id)
  if (!datos) notFound()

  return (
    <OverlayRuta title="Avatar del usuario" description={datos.nombre} width="560px" detent="medium">
      <AvatarUsuario
        perfilId={datos.perfilId}
        nombre={datos.nombre}
        avatarUrl={datos.avatarUrl}
      />
    </OverlayRuta>
  )
}
