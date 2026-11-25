import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { finDiaBogota, inicioDiaBogota } from '@/lib/shared/fecha'
import { leerEnPaginas } from '@/lib/shared/leer-en-paginas'
import type { RangoPeriodo } from '@/lib/shared/periodo'
import type { VentaEmpleado } from './ventas-empleado'

/*
  LAS VENTAS DE UN EMPLEADO  ·  lectura para el panel (25/11/2026)
  ---------------------------------------------------------------------------
  Con la clave de servicio: la página es solo del administrador
  (`requireRol('super_admin')`). Las membresías que registró el empleado
  (`vendido_por`), con su miembro y su plan, dentro del periodo por
  `created_at` —el instante de la venta—, de la más reciente a la más
  antigua. Se leen TODAS por lotes (`leerEnPaginas`): las cifras, los grupos
  y la tabla salen de las mismas filas. También las de miembros ya borrados:
  la venta ocurrió.
*/

type Fila = {
  id: number
  created_at: string
  miembro_id: number
  tipo: 'nueva' | 'renovada'
  fecha_inicio: string
  fecha_fin: string
  precio_pagado: number | string
  es_cortesia: boolean | null
  miembros: { nombres: string; apellidos: string; numero_membresia: string | null } | null
  planes_membresia: { nombre: string } | null
}

/** `numeric` de Postgres → número; lo que no lo sea cuenta como 0. */
function aNumero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(n) ? n : 0
}

/** Las ventas del empleado en el periodo, de la más reciente a la más antigua. `null` si falla. */
export async function cargarVentasEmpleado(
  empleadoId: number,
  rango: RangoPeriodo,
): Promise<VentaEmpleado[] | null> {
  const admin = createAdminClient()
  try {
    const filas = await leerEnPaginas<Fila>((inicio, fin) => {
      let consulta = admin
        .from('membresias')
        .select(
          `id, created_at, miembro_id, tipo, fecha_inicio, fecha_fin, precio_pagado, es_cortesia,
           miembros ( nombres, apellidos, numero_membresia ), planes_membresia ( nombre )`,
        )
        .eq('vendido_por', empleadoId)
      // `timestamptz`: los extremos con su hora de Colombia, nunca una cadena suelta.
      if (rango.desde) consulta = consulta.gte('created_at', inicioDiaBogota(rango.desde))
      if (rango.hasta) consulta = consulta.lte('created_at', finDiaBogota(rango.hasta))
      return consulta
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(inicio, fin) as unknown as PromiseLike<{ data: Fila[] | null; error: unknown }>
    })

    return filas.map((f) => ({
      id: f.id,
      fechaHora: f.created_at,
      miembroId: f.miembro_id,
      miembro: f.miembros
        ? `${f.miembros.nombres} ${f.miembros.apellidos}`.trim()
        : `Miembro #${f.miembro_id}`,
      numero: f.miembros?.numero_membresia ?? null,
      plan: f.planes_membresia?.nombre ?? '',
      tipo: f.tipo,
      precio: aNumero(f.precio_pagado),
      esCortesia: f.es_cortesia === true,
      inicio: f.fecha_inicio,
      fin: f.fecha_fin,
    }))
  } catch (e) {
    console.error(`[cargarVentasEmpleado] empleado_id=${empleadoId}:`, e)
    return null
  }
}
