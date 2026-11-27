import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { cargarVentasMembresias } from '@/lib/metricas/ventas-membresias-datos'
import { hoyISO } from '@/lib/shared/fecha'
import { leerPeriodo } from '@/lib/shared/periodo'
import { leerPagina } from '@/lib/miembros/listado'
import { PageHeader } from '@/components/ui/layout'
import { VentasMembresias } from '../../_components/ventas-membresias'

export const metadata = { title: 'Membresías vendidas · ORUM' }

export default async function VentasEmpleadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; p?: string }>
}) {
  await requireRol('super_admin')
  const { id: perfilId } = await params
  const consulta = await searchParams

  const admin = createAdminClient()
  const { data: empleado } = await admin
    .from('empleados')
    .select('id, nombres, apellidos')
    .eq('perfil_id', perfilId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!empleado) notFound()

  const nombre = `${empleado.nombres} ${empleado.apellidos}`.trim()
  const rango = leerPeriodo(consulta, hoyISO())
  const ventas = await cargarVentasMembresias(empleado.id, rango)

  return (
    <>
      <PageHeader title="Membresías vendidas" description={`Lo que ha vendido ${nombre}`} />
      <VentasMembresias
        base={`/OrumAdminLogin/usuarios/${perfilId}/ventas`}
        titulo={`vendidas por ${nombre}`}
        sinVentasTexto={`${nombre} todavía no ha vendido membresías.`}
        rango={rango}
        ventas={ventas}
        pagina={leerPagina(consulta.p)}
      />
    </>
  )
}
