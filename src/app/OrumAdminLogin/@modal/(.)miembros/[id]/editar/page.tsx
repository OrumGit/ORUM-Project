import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { EditarMiembroForm } from '@/app/OrumAdminLogin/miembros/[id]/editar/_components/editar-miembro-form'

export default async function EditarMiembroInterceptado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin', 'empleado')
  const { id } = await params

  const admin = createAdminClient()
  const { data: miembro } = await admin
    .from('miembros')
    .select('id, perfil_id, nombres, apellidos, cedula, telefono, direccion, ciudad_id')
    .eq('id', Number(id))
    .is('deleted_at', null)
    .maybeSingle()

  if (!miembro) notFound()

  const { data: ciudades } = await admin
    .from('ciudades')
    .select('id, nombre')
    .order('nombre')

  let correo = ''
  if (miembro.perfil_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(miembro.perfil_id)
    correo = authUser.user?.email ?? ''
  }

  return (
    <OverlayRuta
      title="Editar miembro"
      description={`${miembro.nombres} ${miembro.apellidos}`.trim()}
      width="640px"
    >
      <EditarMiembroForm miembro={{ ...miembro, correo }} ciudades={ciudades ?? []} />
    </OverlayRuta>
  )
}