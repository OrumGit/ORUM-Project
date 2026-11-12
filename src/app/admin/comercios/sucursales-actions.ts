'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import { aFilasRpc, leerHorarioDelFormulario } from '@/lib/comercios/horario-formulario'
import { leerHorarioDeSucursal } from '@/lib/comercios/horario-datos'
import type { HorarioSucursal } from '@/lib/comercios/horario'

async function exigirSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  return actor && actor.activo && actor.rolCodigo === 'super_admin' ? actor.userId : null
}

export type SucursalState = { error?: string; ok?: boolean }

/**
 * Guarda el horario de una sucursal ya guardada. Un horario vacío sobre una
 * sucursal que no tenía ninguno no llama a la base: así editar una sucursal no
 * falla en una base a la que aún no se aplicó la tabla de horarios.
 */
async function guardarHorario(
  admin: ReturnType<typeof createAdminClient>,
  sucursalId: number,
  horario: HorarioSucursal,
  actorId: string,
  prefijoError = 'La sucursal se guardó, pero no el horario',
): Promise<string | null> {
  if (horario.length === 0 && (await leerHorarioDeSucursal(admin, sucursalId)).length === 0) {
    return null
  }
  const { error } = await admin.rpc('reemplazar_horario_sucursal', {
    p_sucursal_id: sucursalId,
    p_filas: aFilasRpc(horario),
    p_actor: actorId,
  })
  return error ? mensajeDeError(prefijoError, error) : null
}

/** Lee y valida los campos de sucursal. `nombre` obligatorio en app (D4). */
function leerCamposSucursal(formData: FormData):
  | {
      ok: true
      nombre: string
      direccion: string | null
      telefono: string | null
      ciudad_id: number
      /** `null` = el formulario no mandó horario: no se toca. */
      horario: HorarioSucursal | null
    }
  | { ok: false; error: string } {
  const nombre = String(formData.get('nombre') ?? '').trim()
  if (!nombre) return { ok: false, error: 'El nombre de la sucursal es obligatorio.' }

  const ciudadRaw = String(formData.get('ciudad_id') ?? '').trim()
  const ciudad_id = Number(ciudadRaw)
  if (!Number.isInteger(ciudad_id) || ciudad_id < 1) return { ok: false, error: 'Selecciona una ciudad.' }

  const crudoHorario = formData.get('horario')
  let horario: HorarioSucursal | null = null
  if (crudoHorario !== null) {
    const leido = leerHorarioDelFormulario(String(crudoHorario))
    if (!leido.ok) return { ok: false, error: leido.error }
    horario = leido.horario
  }

  return {
    ok: true,
    nombre,
    direccion: String(formData.get('direccion') ?? '').trim() || null,
    telefono: String(formData.get('telefono') ?? '').trim() || null,
    ciudad_id,
    horario,
  }
}

export async function crearSucursal(_prev: SucursalState, formData: FormData): Promise<SucursalState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const comercioId = Number(formData.get('comercio_id'))
  if (!Number.isInteger(comercioId) || comercioId < 1) return { error: 'Falta el identificador del comercio.' }

  const campos = leerCamposSucursal(formData)
  if (!campos.ok) return { error: campos.error }

  const admin = createAdminClient()
  const { data: creada, error } = await admin
    .from('sucursales')
    .insert({
      updated_by: actorId,
      comercio_id: comercioId,
      nombre: campos.nombre,
      direccion: campos.direccion,
      telefono: campos.telefono,
      ciudad_id: campos.ciudad_id,
      activo: true,
    })
    .select('id')
    .single()
  if (error || !creada) return { error: mensajeDeError('No se pudo crear la sucursal', error) }

  const errorHorario = campos.horario
    ? await guardarHorario(
        admin,
        creada.id,
        campos.horario,
        actorId,
        'No se pudo guardar el horario y la sucursal no se creó',
      )
    : null
  if (errorHorario) {
    /* El formulario se queda abierto con el aviso: si la sucursal ya existiera,
       reintentar crearía otra igual. Se deshace para que «no se creó» sea
       verdad. */
    await admin.from('sucursales').delete().eq('id', creada.id)
    return { error: errorHorario }
  }

  revalidatePath(`/admin/comercios/${comercioId}`)

  updateTag('publico')
  return { ok: true }
}

export async function editarSucursal(_prev: SucursalState, formData: FormData): Promise<SucursalState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const id = Number(formData.get('id'))
  const comercioId = Number(formData.get('comercio_id'))
  if (!Number.isInteger(id) || id < 1) return { error: 'Falta el identificador de la sucursal.' }
  if (!Number.isInteger(comercioId) || comercioId < 1) return { error: 'Falta el identificador del comercio.' }

  const campos = leerCamposSucursal(formData)
  if (!campos.ok) return { error: campos.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('sucursales')
    .update({
      updated_by: actorId,
      nombre: campos.nombre,
      direccion: campos.direccion,
      telefono: campos.telefono,
      ciudad_id: campos.ciudad_id,
    })
    .eq('id', id)
    .eq('comercio_id', comercioId)
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  const errorHorario = campos.horario
    ? await guardarHorario(admin, id, campos.horario, actorId)
    : null

  revalidatePath(`/admin/comercios/${comercioId}`)

  updateTag('publico')
  return errorHorario ? { error: errorHorario } : { ok: true }
}

/** Activa o desactiva una sucursal (`sucursales.activo`). */
export async function cambiarEstadoSucursal(formData: FormData): Promise<void> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) redirect('/')

  const id = Number(formData.get('id'))
  const comercioId = Number(formData.get('comercio_id'))
  const activar = String(formData.get('activar') ?? '') === 'true'
  if (!Number.isInteger(id) || id < 1) redirect('/admin/comercios')
  if (!Number.isInteger(comercioId) || comercioId < 1) redirect('/admin/comercios')

  const admin = createAdminClient()
  const { error } = await admin.from('sucursales').update({ updated_by: actorId, activo: activar }).eq('id', id)

  if (!error) {
    revalidatePath(`/admin/comercios/${comercioId}`)
    updateTag('publico')
  }
  redirect(`/admin/comercios/${comercioId}?pestana=sucursales`)
}
