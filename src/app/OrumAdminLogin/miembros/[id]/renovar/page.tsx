import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { hoyISO } from '@/lib/shared/fecha'
import { calcularFechaInicioRenovacion } from '@/lib/miembros/membresias'
import { FormCard } from '@/components/ui/form-card'
import { PageHeader } from '@/components/ui/layout'
import { RenovarForm } from '../_components/renovar-form'

export const metadata = { title: 'Renovar membresía · ORUM' }

export default async function RenovarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const perfil = await requireRol('super_admin', 'empleado')
  const { id } = await params
  const miembroId = Number(id)

  const admin = createAdminClient()
  const [{ data: miembro }, { data: planes }, { data: vigente }] = await Promise.all([
    admin
      .from('miembros')
      .select('id, nombres, apellidos')
      .eq('id', miembroId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('planes_membresia')
      .select('id, nombre, precio')
      .eq('activo', true)
      .is('deleted_at', null)
      .order('nombre'),
    // La membresía activa, para saber desde qué día contaría una cortesía.
    admin
      .from('membresias')
      .select('fecha_fin')
      .eq('miembro_id', miembroId)
      .eq('estado', 'activa')
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!miembro) notFound()

  return (
    <>
      <PageHeader
        title="Renovar membresía"
        description={`${miembro.nombres} ${miembro.apellidos}`.trim()}
      />
      <FormCard>
        <RenovarForm
          miembroId={miembro.id}
          planes={planes ?? []}
          puedeCortesia={perfil.rolCodigo === 'super_admin'}
          inicio={calcularFechaInicioRenovacion(hoyISO(), vigente?.fecha_fin ?? null)}
        />
      </FormCard>
    </>
  )
}
