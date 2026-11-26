import type { EstadoMembresia } from '@/lib/supabase/database.types'

/**
 * Vigencia real de una membresía. `estado` no se actualiza solo al pasar
 * `fecha_fin` (no hay job automático), por eso se comprueban ambas cosas.
 * Todas las fechas en formato 'YYYY-MM-DD'.
 *
 * Misma regla que `membresia_con_acceso` en la base: la caja y el portal no
 * pueden discrepar.
 */
export function esMembresiaVigente(
  estado: EstadoMembresia,
  fechaFin: string,
  hoy: string,
): boolean {
  return estado === 'activa' && fechaFin >= hoy
}
