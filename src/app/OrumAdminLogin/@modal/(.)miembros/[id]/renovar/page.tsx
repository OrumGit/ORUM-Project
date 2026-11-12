import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { RenovarForm } from '@/app/OrumAdminLogin/miembros/[id]/_components/renovar-form'

/**
 * Renovar membresía, interceptado.
 *
 * Antes este formulario vivía como una sección al final de la ficha, y el
 * menú de la lista apuntaba a `#renovar` — un ancla que no existía, porque
 * `Section` no acepta `id`. El resultado: "Renovar membresía" te dejaba
 * arriba de la ficha, a buscar el formulario a ojo.
 *
 * `detent="medium"`: son dos campos. Deja ver detrás a quién se le está
 * renovando, que es justo lo que conviene confirmar antes de cobrar.
 */
export default async function RenovarInterceptado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const perfil = await requireRol('super_admin', 'empleado')
  const { id } = await params
  const miembroId = Number(id)

  const admin = createAdminClient()
  const [{ data: miembro }, { data: planes }] = await Promise.all([
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
  ])

  if (!miembro) notFound()

  return (
    <OverlayRuta
      title="Renovar membresía"
      description={`${miembro.nombres} ${miembro.apellidos}`.trim()}
      width="520px"
      detent="medium"
    >
      <RenovarForm
        miembroId={miembro.id}
        planes={planes ?? []}
        puedeCortesia={perfil.rolCodigo === 'super_admin'}
      />
    </OverlayRuta>
  )
}
