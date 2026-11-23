import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { leerHorarioDeSucursal } from '@/lib/comercios/horario-datos'
import { SucursalForm } from '../../_components/sucursal-form'

export const metadata = { title: 'Editar sucursal · ORUM' }

export default async function EditarSucursalPage({
  params,
}: {
  params: Promise<{ id: string; sucursalId: string }>
}) {
  await requireRol('super_admin')
  const { id, sucursalId } = await params
  const comercioId = Number(id)

  const admin = createAdminClient()
  const [{ data: sucursal }, { data: ciudades }, horario] = await Promise.all([
    admin
      .from('sucursales')
      .select('id, nombre, direccion, telefono, ciudad_id')
      .eq('id', Number(sucursalId))
      .eq('comercio_id', comercioId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.from('ciudades').select('id, nombre').order('nombre'),
    leerHorarioDeSucursal(admin, Number(sucursalId)),
  ])
  if (!sucursal) notFound()

  return (
    <>
      <PageHeader title="Editar sucursal" description={sucursal.nombre ?? undefined} />
      <FormCard>
        <SucursalForm
          comercioId={comercioId}
          ciudades={ciudades ?? []}
          sucursal={{ ...sucursal, nombre: sucursal.nombre ?? '' }}
          horario={horario}
        />
      </FormCard>
    </>
  )
}
