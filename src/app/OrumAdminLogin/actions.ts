'use server'

import { requireRol } from '@/lib/auth/auth'
import { buscarMiembros, type MiembroEncontrado } from '@/lib/miembros/buscar-miembros'

/**
 * Búsqueda de miembros para el buscador del panel (`BuscadorPanel`).
 *
 * Reutiliza `buscarMiembros`, la misma función que consumirá la lista de
 * `/OrumAdminLogin/miembros`: una sola definición de qué significa buscar un miembro.
 *
 * Verifica el rol al entrar, como todas las server actions: ocultar el buscador
 * en la interfaz no protegería este endpoint.
 */
export async function buscarMiembrosAction(termino: string): Promise<MiembroEncontrado[]> {
  await requireRol('super_admin', 'empleado')

  // Con menos de dos caracteres cualquier término devuelve casi toda la tabla:
  // ni ayuda a quien busca ni conviene a la base de datos.
  if (termino.trim().length < 2) return []

  return buscarMiembros(termino, 8)
}
