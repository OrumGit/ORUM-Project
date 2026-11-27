import { requireRol } from '@/lib/auth/auth'
import { cargarVentasMembresias } from '@/lib/metricas/ventas-membresias-datos'
import { hoyISO } from '@/lib/shared/fecha'
import { leerPeriodo } from '@/lib/shared/periodo'
import { leerPagina } from '@/lib/miembros/listado'
import { PageHeader } from '@/components/ui/layout'
import { VentasMembresias } from '../../_components/ventas-membresias'

export const metadata = { title: 'Membresías vendidas por el super admin · ORUM' }

/*
  Las membresías sin empleado asignado (`vendido_por` nulo): las que registró
  el super administrador, que no aparece en la lista de Usuarios. Métricas las
  llama «Super admin».
*/
export default async function VentasSuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; p?: string }>
}) {
  await requireRol('super_admin')
  const consulta = await searchParams

  const rango = leerPeriodo(consulta, hoyISO())
  const ventas = await cargarVentasMembresias(null, rango)

  return (
    <>
      <PageHeader
        title="Membresías vendidas por el super admin"
        description="Las que se registraron sin un empleado asignado."
      />
      <VentasMembresias
        base="/OrumAdminLogin/usuarios/super-admin/ventas"
        titulo="vendidas por el super admin"
        sinVentasTexto="Todavía no hay membresías registradas por el super admin."
        rango={rango}
        ventas={ventas}
        pagina={leerPagina(consulta.p)}
      />
    </>
  )
}
