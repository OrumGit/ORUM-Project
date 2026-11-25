import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/layout'
import { cargarVentasEmpleado } from '@/lib/metricas/ventas-empleado-datos'
import { leerPagina } from '@/lib/miembros/listado'
import { hoyISO } from '@/lib/shared/fecha'
import { leerPeriodo } from '@/lib/shared/periodo'
import { VentasEmpleado } from './_components/ventas-empleado'

export const metadata = { title: 'Ventas del usuario · ORUM' }

/*
  LA PÁGINA DE UN USUARIO DEL PANEL: SUS VENTAS  ·  (25/11/2026)
  ---------------------------------------------------------------------------
  Se llega desde la lista de Usuarios (su nombre, o «Ver sus ventas» en el
  menú) y desde Métricas (el nombre en «Membresías vendidas por empleado»,
  con el mismo periodo). Solo el administrador mayor. El periodo y las
  páginas viven en la URL: `?periodo=hoy|semana|mes|30dias|anio`,
  `?desde=&hasta=`, `?p=` y `?pd=`.
*/

/** Un uuid de Supabase. Lo demás no es un usuario: 404 sin consultar. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function VentasUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; p?: string; pd?: string }>
}) {
  await requireRol('super_admin')
  const [{ id: perfilId }, busqueda] = await Promise.all([params, searchParams])
  if (!UUID.test(perfilId)) notFound()

  const admin = createAdminClient()
  const [{ data: empleado }, { data: perfil }, { data: authUser }] = await Promise.all([
    admin.from('empleados').select('id, nombres, apellidos').eq('perfil_id', perfilId).maybeSingle(),
    admin.from('perfiles').select('activo, rol_id').eq('id', perfilId).maybeSingle(),
    admin.auth.admin.getUserById(perfilId),
  ])
  if (!empleado) notFound()

  const nombre = `${empleado.nombres} ${empleado.apellidos}`.trim()
  const rango = leerPeriodo(busqueda, hoyISO())
  const [ventas, { data: rolFila }] = await Promise.all([
    cargarVentasEmpleado(empleado.id, rango),
    perfil
      ? admin.from('roles').select('nombre').eq('id', perfil.rol_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rol = rolFila?.nombre
  const descripcion = [
    rol,
    authUser?.user?.email,
    perfil && !perfil.activo ? 'Sin acceso al panel' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <PageHeader
        title={nombre}
        description={descripcion ? `${descripcion}. Cada membresía que registró, una por una.` : undefined}
        actions={
          <Button href={`/OrumAdminLogin/usuarios/${perfilId}/editar`} variant="secondary" icon={<Pencil size={16} />}>
            Editar usuario
          </Button>
        }
      />
      <VentasEmpleado
        perfilId={perfilId}
        nombre={empleado.nombres.trim() || nombre}
        rango={rango}
        ventas={ventas}
        pagina={leerPagina(busqueda.p)}
        paginaDias={leerPagina(busqueda.pd)}
      />
    </>
  )
}
