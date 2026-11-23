import 'server-only'

import { obtenerPlanesPublicos } from '@/lib/publico/datos-publicos'
import { formatearPesos } from '@/lib/publico/planes'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CiudadRegistro, PlanRegistro } from './flujo-registro'

/*
  Lo que necesitan la ventana del registro y su página a pantalla completa:
  los planes de la portada (los mismos precios que la persona acaba de ver) y
  las ciudades. El plan de la URL (`?plan=`) solo vale si es uno de ellos.
*/

export type DatosRegistro = {
  planes: PlanRegistro[]
  ciudades: CiudadRegistro[]
  planInicial: number
}

export async function cargarDatosRegistro(planPedido: string | undefined): Promise<DatosRegistro | null> {
  const [publicos, { data: ciudades }] = await Promise.all([
    obtenerPlanesPublicos(),
    createAdminClient().from('ciudades').select('id, nombre').order('nombre'),
  ])
  if (publicos.length === 0) return null

  const planes: PlanRegistro[] = publicos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    precioTexto: formatearPesos(p.precio),
    periodo: p.periodo,
  }))

  const pedido = Number(planPedido)
  const planInicial =
    planes.find((p) => p.id === pedido)?.id ?? publicos.find((p) => p.destacado)?.id ?? planes[0].id

  return { planes, ciudades: ciudades ?? [], planInicial }
}
