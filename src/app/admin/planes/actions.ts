'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath, updateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'

export type PlanState = { error?: string; ok?: boolean }

const MAX_DESCRIPCION = 200

/** Verifica que quien ejecuta la acción sea super_admin. */
async function exigirSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  return actor && actor.activo && actor.rolCodigo === 'super_admin' ? actor.userId : null
}

/**
 * Guarda SOLO la descripción del plan (07/11/2026: «al administrador
 * únicamente le permitamos editar la descripción»). Aunque el formulario
 * mandara nombre, precio o duración, aquí no se leen ni se escriben.
 */
export async function editarPlan(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id) || id < 1) return { error: 'Falta el identificador del plan.' }

  const descripcion = String(formData.get('descripcion') ?? '').trim() || null
  if (descripcion && descripcion.length > MAX_DESCRIPCION) {
    return { error: `La descripción puede tener hasta ${MAX_DESCRIPCION} caracteres.` }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('planes_membresia')
    .update({ updated_by: actorId, descripcion })
    .eq('id', id)
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  revalidatePath('/admin/planes')
  // La portada pública enseña la descripción de cada plan: que se vea ya.
  updateTag('publico')
  return { ok: true }
}
