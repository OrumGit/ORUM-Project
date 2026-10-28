import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { derivarEstadoMembresia, type EstadoMembresia } from '@/lib/miembros/membresias'
import { hoyISO } from '@/lib/shared/fecha'

export type DatosRevocacion = {
  miembroId: number
  nombre: string
  membresiaId: number
  plan: string
  /** 'YYYY-MM-DD'. */
  fechaFin: string
  diasRestantes: number
}

/**
 * Lo que necesita la ventana de revocar: el miembro y su membresía VIGENTE
 * (derivada, nunca la columna en crudo). `null` si no tiene ninguna vigente:
 * no hay nada que revocar. La comparten la pantalla y su gemela de `@modal`.
 */
export async function cargarRevocacion(miembroId: number): Promise<DatosRevocacion | null> {
  if (!Number.isInteger(miembroId) || miembroId < 1) return null

  const admin = createAdminClient()
  const [{ data: miembro }, { data: membresias }] = await Promise.all([
    admin
      .from('miembros')
      .select('id, nombres, apellidos')
      .eq('id', miembroId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('membresias')
      .select('id, estado, fecha_fin, plan_id')
      .eq('miembro_id', miembroId)
      .eq('estado', 'activa')
      .order('fecha_fin', { ascending: false })
      .limit(1),
  ])
  if (!miembro) return null

  const hoy = hoyISO()
  const fila = membresias?.[0]
  if (!fila) return null
  const derivado = derivarEstadoMembresia(fila.estado as EstadoMembresia, fila.fecha_fin, hoy)
  if (!derivado.activa) return null

  const { data: plan } = await admin.from('planes_membresia').select('nombre').eq('id', fila.plan_id).maybeSingle()

  return {
    miembroId: miembro.id,
    nombre: `${miembro.nombres} ${miembro.apellidos}`.trim(),
    membresiaId: fila.id,
    plan: plan?.nombre ?? `Plan #${fila.plan_id}`,
    fechaFin: fila.fecha_fin,
    diasRestantes: derivado.diasRestantes,
  }
}
