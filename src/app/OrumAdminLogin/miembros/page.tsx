import { requireRol } from '@/lib/auth/auth'
import { cargarListadoMiembros } from '@/lib/miembros/cargar-listado'
import { ListaMiembros, type ParamsMiembros } from './_components/lista-miembros'

export const metadata = { title: 'Miembros · ORUM' }

/*
  La página solo CONSULTA; lo que se pinta es `ListaMiembros`, que no lee
  nada (así `/dev/shell` puede enseñarla con datos falsos, sin sesión).
*/
export default async function MiembrosPage({
  searchParams,
}: {
  searchParams: Promise<ParamsMiembros>
}) {
  const perfil = await requireRol('super_admin', 'empleado')
  const { filas, planes } = await cargarListadoMiembros()
  return (
    <ListaMiembros
      filas={filas}
      planes={planes}
      params={await searchParams}
      esSuperAdmin={perfil.rolCodigo === 'super_admin'}
    />
  )
}
