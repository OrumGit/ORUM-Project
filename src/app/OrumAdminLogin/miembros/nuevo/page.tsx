import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listarNumerosDisponibles } from '@/lib/miembros/pozo-numeros'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { MiembroForm } from '../_components/miembro-form'

export const metadata = { title: 'Registrar miembro · ORUM' }

export default async function NuevoMiembroPage() {
  const perfil = await requireRol('super_admin', 'empleado')

  const admin = createAdminClient()
  const [{ data: ciudades }, { data: planes }, numerosDisponibles] = await Promise.all([
    admin.from('ciudades').select('id, nombre').order('nombre'),
    admin
      .from('planes_membresia')
      .select('id, nombre, precio')
      .eq('activo', true)
      .is('deleted_at', null)
      .order('nombre'),
    listarNumerosDisponibles(),
  ])

  return (
    <>
      <PageHeader
        title="Registrar miembro"
        description="Crea el cliente, su cuenta de acceso y su primera membresía en un solo paso."
      />
      <FormCard>
        <MiembroForm
          ciudades={ciudades ?? []}
          planes={planes ?? []}
          numerosDisponibles={numerosDisponibles}
          puedeCortesia={perfil.rolCodigo === 'super_admin'}
        />
      </FormCard>
    </>
  )
}
