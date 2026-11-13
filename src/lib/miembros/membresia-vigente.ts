import type { EstadoMembresia } from '@/lib/supabase/database.types'

/**
 * Vigencia real de una membresía. `estado` no se actualiza solo al pasar
 * `fecha_fin` (no hay job automático), por eso se comprueban ambas cosas.
 * Todas las fechas en formato 'YYYY-MM-DD'.
 */
export function esMembresiaVigente(
  estado: EstadoMembresia,
  fechaFin: string,
  hoy: string,
  /** Las cortesías por horas vencen en este instante (ver `cortesia.ts`). */
  venceAt: string | null = null,
  ahora: Date = new Date(),
): boolean {
  if (venceAt && new Date(venceAt).getTime() <= ahora.getTime()) return false
  return estado === 'activa' && fechaFin >= hoy
}
