'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import { mensajeDeError } from '@/lib/shared/errores'
import { registrarActividad } from '@/lib/bitacora/bitacora'
import { revisarReasignacion } from '@/lib/miembros/reasignacion-numero'

export type ReasignarNumeroState = { error?: string; ok?: boolean }

/**
 * Cambia el número de membresía de un miembro (19/11/2026). Solo el
 * administrador, y solo si el miembro no tiene ventas: una venta ya quedó
 * atada a ese número. El número nuevo sale del pozo y el anterior vuelve a él.
 * El orden importa: primero se reclama el nuevo (con guard), luego se cambia
 * al miembro, y al final se libera el anterior. Si el cambio del miembro falla,
 * el reclamo se deshace.
 */
export async function reasignarNumeroMembresia(
  _prev: ReasignarNumeroState,
  formData: FormData,
): Promise<ReasignarNumeroState> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') {
    return { error: 'Solo el administrador puede reasignar números de membresía.' }
  }

  const miembroId = Number(formData.get('miembro_id'))
  if (!Number.isInteger(miembroId) || miembroId < 1) {
    return { error: 'Falta el identificador del miembro.' }
  }
  const numeroNuevo = String(formData.get('numero_nuevo') ?? '').trim()

  const admin = createAdminClient()
  const [{ data: miembro, error: errMiembro }, { count: ventas, error: errVentas }] = await Promise.all([
    admin
      .from('miembros')
      .select('id, numero_membresia')
      .eq('id', miembroId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.from('ventas').select('id', { count: 'exact', head: true }).eq('miembro_id', miembroId),
  ])
  if (errMiembro) return { error: mensajeDeError('No se pudo leer al miembro', errMiembro) }
  if (!miembro) return { error: 'No encontramos ese miembro.' }
  // Sin el conteo de ventas no se puede decidir: no se reasigna «a ciegas».
  if (errVentas) return { error: mensajeDeError('No se pudo revisar sus ventas', errVentas) }

  const numeroActual = miembro.numero_membresia
  const revision = revisarReasignacion({ numeroActual, numeroNuevo, ventas: ventas ?? 0 })
  if (!revision.ok) return { error: revision.error }

  // 1) Reclamar el número nuevo del pozo. El guard `miembro_id is null` impide
  //    tomar uno que otra asignación acaba de ocupar.
  const { data: reclamado, error: errReclamar } = await admin
    .from('numeros_registro')
    .update({ miembro_id: miembroId, asignado_at: new Date().toISOString() })
    .eq('numero', numeroNuevo)
    .is('miembro_id', null)
    .select('numero')
    .maybeSingle()
  if (errReclamar) return { error: mensajeDeError('No se pudo reservar el número', errReclamar) }
  if (!reclamado) {
    return { error: 'Ese número no está disponible en el pozo. Elige otro.' }
  }

  const deshacerReclamo = () =>
    admin
      .from('numeros_registro')
      .update({ miembro_id: null, asignado_at: null })
      .eq('numero', numeroNuevo)
      .eq('miembro_id', miembroId)

  // 2) Cambiar el número del miembro. El índice único de `numero_membresia`
  //    rechaza un duplicado (23505).
  const { error: errCambio } = await admin
    .from('miembros')
    .update({ numero_membresia: numeroNuevo, updated_by: actor.userId })
    .eq('id', miembroId)
  if (errCambio) {
    await deshacerReclamo()
    return {
      error:
        errCambio.code === '23505'
          ? 'Ese número acaba de asignarse a otro miembro. Elige otro.'
          : mensajeDeError('No se pudo cambiar el número', errCambio),
    }
  }

  // 3) Devolver el número anterior al pozo.
  const { error: errLiberar } = await admin
    .from('numeros_registro')
    .update({ miembro_id: null, asignado_at: null })
    .eq('numero', numeroActual)
    .eq('miembro_id', miembroId)
  if (errLiberar) {
    console.error('[numeros] el número anterior no se liberó en el pozo', errLiberar)
  }

  await registrarActividad(admin, {
    actorId: actor.userId,
    accion: 'edicion',
    entidadId: miembroId,
    datosAnteriores: { numero_membresia: numeroActual },
    datosNuevos: { numero_membresia: numeroNuevo },
  })

  revalidatePath('/OrumAdminLogin/miembros')
  revalidatePath(`/OrumAdminLogin/miembros/${miembroId}`)
  revalidatePath('/OrumAdminLogin/miembros/numeros')
  if (errLiberar) {
    return {
      error: `El número cambió a ${numeroNuevo}, pero no se pudo devolver ${numeroActual} al pozo. Avísale al equipo técnico.`,
    }
  }
  return { ok: true }
}
