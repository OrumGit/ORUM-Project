import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { finDiaBogota, inicioDiaBogota } from '@/lib/shared/fecha'
import { leerEnPaginas } from '@/lib/shared/leer-en-paginas'
import type { RangoPeriodo } from '@/lib/shared/periodo'
import { ordenarRecientes, type VentaMembresia } from './ventas-membresias'

/*
  MEMBRESÍAS VENDIDAS POR UN EMPLEADO  ·  lectura para el panel (26/11/2026)
  ---------------------------------------------------------------------------
  Con la clave de servicio: la página es solo del administrador
  (`requireRol('super_admin')` en la página). `membresias.vendido_por` guarda
  el id del EMPLEADO (no el del perfil); `null` = sin empleado asignado, que
  Métricas llama «Super admin».

  Filtra por `created_at` (cuándo se registró la membresía), no por
  `fecha_inicio`: una renovación puede empezar días después de venderse.
  Se leen TODAS las del periodo por lotes (`leerEnPaginas`), para que la lista
  y los totales salgan de las mismas filas.
*/

type Fila = {
  id: number
  created_at: string
  tipo: 'nueva' | 'renovada'
  es_cortesia: boolean
  precio_pagado: number | string
  miembro_id: number
  miembros: { nombres: string; apellidos: string; numero_membresia: string } | null
  planes_membresia: { nombre: string } | null
}

/** `numeric` de Postgres → número; lo que no lo sea cuenta como 0. */
function aNumero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(n) ? n : 0
}

/**
 * Las membresías que vendió un empleado en el periodo, la más reciente
 * primero. `empleadoId` es el id de `empleados` (no el perfil). `null` =
 * las que no tienen empleado (super admin). `null` como resultado si falla.
 */
export async function cargarVentasMembresias(
  empleadoId: number | null,
  rango: RangoPeriodo,
): Promise<VentaMembresia[] | null> {
  const admin = createAdminClient()
  try {
    const filas = await leerEnPaginas<Fila>((inicio, fin) => {
      let consulta = admin
        .from('membresias')
        .select(
          `id, created_at, tipo, es_cortesia, precio_pagado, miembro_id,
           miembros ( nombres, apellidos, numero_membresia ), planes_membresia ( nombre )`,
        )
      consulta =
        empleadoId === null ? consulta.is('vendido_por', null) : consulta.eq('vendido_por', empleadoId)
      // `timestamptz`: los extremos con su hora de Colombia, nunca una cadena suelta.
      if (rango.desde) consulta = consulta.gte('created_at', inicioDiaBogota(rango.desde))
      if (rango.hasta) consulta = consulta.lte('created_at', finDiaBogota(rango.hasta))
      return consulta.order('id', { ascending: true }).range(inicio, fin) as unknown as PromiseLike<{
        data: Fila[] | null
        error: unknown
      }>
    })

    return ordenarRecientes(
      filas.map((f) => ({
        id: f.id,
        fechaHora: f.created_at,
        miembroId: f.miembro_id,
        miembro: f.miembros ? `${f.miembros.nombres} ${f.miembros.apellidos}`.trim() : `Miembro #${f.miembro_id}`,
        numeroMembresia: f.miembros?.numero_membresia ?? '—',
        plan: f.planes_membresia?.nombre ?? 'Sin plan',
        tipo: f.tipo,
        esCortesia: f.es_cortesia,
        precio: f.es_cortesia ? 0 : aNumero(f.precio_pagado),
      })),
    )
  } catch (e) {
    console.error(`[cargarVentasMembresias] empleado_id=${empleadoId ?? 'sin-empleado'}:`, e)
    return null
  }
}
