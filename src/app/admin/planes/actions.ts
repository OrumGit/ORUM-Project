'use server'

import { leerPesos } from '@/lib/validacion/reglas'
import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'

export type PlanState = { error?: string; ok?: boolean }

/** Verifica que quien ejecuta la acción sea super_admin. */
async function exigirSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  return actor && actor.activo && actor.rolCodigo === 'super_admin' ? actor.userId : null
}

/** Lee y valida los campos comunes de un plan desde el formulario. */
function leerCampos(formData: FormData):
  | { ok: true; nombre: string; descripcion: string | null; precio: number; duracion: number }
  | { ok: false; error: string } {
  const nombre = String(formData.get('nombre') ?? '').trim()
  if (!nombre) return { ok: false, error: 'El nombre del plan es obligatorio.' }

  const precio = leerPesos(formData.get('precio'))
  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: 'El precio debe ser un número mayor o igual a 0.' }
  }

  const duracion = Number(formData.get('duracion_meses'))
  if (!Number.isInteger(duracion) || duracion < 1) {
    return { ok: false, error: 'La duración debe ser un número entero de meses (mínimo 1).' }
  }

  return {
    ok: true,
    nombre,
    descripcion: String(formData.get('descripcion') ?? '').trim() || null,
    precio,
    duracion,
  }
}

export async function editarPlan(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id) || id < 1) return { error: 'Falta el identificador del plan.' }

  const campos = leerCampos(formData)
  if (!campos.ok) return { error: campos.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('planes_membresia')
    .update({
      updated_by: actorId,
      nombre: campos.nombre,
      descripcion: campos.descripcion,
      precio: campos.precio,
      duracion_meses: campos.duracion,
    })
    .eq('id', id)
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  revalidatePath('/admin/planes')
  return { ok: true }
}
