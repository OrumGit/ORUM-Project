import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { calcularFechaInicioRenovacion, derivarEstadoMembresia, type EstadoMembresia } from '@/lib/miembros/membresias'
import { hoyISO } from '@/lib/shared/fecha'

export type DatosCortesia = {
  miembroId: number
  nombre: string
  /** El plan de la membresía vigente (o de la última), el que llevará la cortesía. */
  plan: string
  /** Fin de la vigente ('YYYY-MM-DD'), o `null` si no tiene ninguna vigente. */
  finVigente: string | null
  /** ¿La vigente ya es una cortesía? (se están sumando días a otros días regalados). */
  vigenteEsCortesia: boolean
  /** Día en que empezaría la cortesía: el siguiente al fin de la vigente, u hoy. */
  inicio: string
}

/**
 * Lo que necesita «Añadir días de cortesía»: el miembro, su membresía vigente
 * (derivada, nunca la columna en crudo) y desde qué día contarían los días.
 * `null` si el miembro no existe o nunca tuvo una membresía. La comparten la
 * pantalla y su gemela de `@modal`.
 */
export async function cargarCortesia(miembroId: number): Promise<DatosCortesia | null> {
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
      .select('estado, fecha_fin, plan_id, es_cortesia')
      .eq('miembro_id', miembroId)
      .order('fecha_fin', { ascending: false })
      .limit(1),
  ])
  if (!miembro) return null
  const ultima = membresias?.[0]
  if (!ultima) return null

  const hoy = hoyISO()
  const vigente = derivarEstadoMembresia(ultima.estado as EstadoMembresia, ultima.fecha_fin, hoy).activa
  const { data: plan } = await admin.from('planes_membresia').select('nombre').eq('id', ultima.plan_id).maybeSingle()

  return {
    miembroId: miembro.id,
    nombre: `${miembro.nombres} ${miembro.apellidos}`.trim(),
    plan: plan?.nombre ?? `Plan #${ultima.plan_id}`,
    finVigente: vigente ? ultima.fecha_fin : null,
    vigenteEsCortesia: vigente && ultima.es_cortesia === true,
    inicio: calcularFechaInicioRenovacion(hoy, vigente ? ultima.fecha_fin : null),
  }
}
