import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { hoyISO } from '@/lib/shared/fecha'
import { leerEnPaginas } from '@/lib/shared/leer-en-paginas'
import { derivarEstadoMembresia, type EstadoMembresia } from './membresias'
import type { FilaMiembro } from './listado'

/*
  LA CARGA DE LA LISTA DE MIEMBROS DEL PANEL (15/10/2026)
  ---------------------------------------------------------------------------
  Las pestañas cuentan TODOS los miembros por estado, y el estado se deriva
  de la membresía más reciente (`derivarEstadoMembresia`). Sin una vista en la
  base que lo calcule, la forma correcta es traer las dos tablas y cruzarlas
  aquí. Se pide por PÁGINAS de 1000 filas: PostgREST corta cada respuesta en
  ese tope, y un `.in(...)` con mil ids rompería la longitud de la URL.

  A la escala del club (unos miles de miembros) son pocas peticiones y caben
  holgadas en memoria. Si algún día pasa de decenas de miles, esto se cambia
  por una vista o una función en la base que devuelva ya el estado.
*/

type Admin = ReturnType<typeof createAdminClient>

// `leerEnPaginas` (lib/shared): de 1000 en 1000, con tope y lanzando si falla.
const todas = leerEnPaginas

export type PlanFiltro = { id: number; nombre: string }

export async function cargarListadoMiembros(): Promise<{ filas: FilaMiembro[]; planes: PlanFiltro[] }> {
  const admin: Admin = createAdminClient()

  const [miembros, membresias, { data: planes }] = await Promise.all([
    todas((desde, hasta) =>
      admin
        .from('miembros')
        .select('id, numero_membresia, nombres, apellidos, cedula, telefono, foto_url')
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(desde, hasta),
    ),
    todas((desde, hasta) =>
      admin
        .from('membresias')
        .select('id, miembro_id, estado, fecha_fin, plan_id')
        .order('fecha_fin', { ascending: false })
        .order('id', { ascending: false })
        .range(desde, hasta),
    ),
    admin.from('planes_membresia').select('id, nombre').order('nombre'),
  ])

  const nombrePlan = new Map((planes ?? []).map((p) => [p.id, p.nombre]))
  const hoy = hoyISO()

  // Ya vienen de la más reciente a la más antigua: la primera de cada
  // miembro es la que manda.
  const ultima = new Map<number, { estado: EstadoMembresia; fecha_fin: string; plan_id: number | null }>()
  for (const m of membresias) {
    if (!ultima.has(m.miembro_id)) {
      ultima.set(m.miembro_id, {
        estado: m.estado as EstadoMembresia,
        fecha_fin: m.fecha_fin,
        plan_id: m.plan_id,
      })
    }
  }

  const filas: FilaMiembro[] = miembros.map((m) => {
    const u = ultima.get(m.id)
    return {
      id: m.id,
      numeroMembresia: m.numero_membresia,
      nombre: `${m.nombres} ${m.apellidos}`.trim(),
      cedula: m.cedula,
      telefono: (m.telefono ?? '').trim() || null,
      fotoUrl: (m.foto_url ?? '').trim() || null,
      plan: u?.plan_id != null ? (nombrePlan.get(u.plan_id) ?? null) : null,
      planId: u?.plan_id ?? null,
      estado: u ? derivarEstadoMembresia(u.estado, u.fecha_fin, hoy) : null,
      fechaFin: u?.fecha_fin ?? null,
    }
  })

  return { filas, planes: planes ?? [] }
}
