'use server'

/*
  MODERACIÓN DE RESEÑAS  ·  solo el super administrador
  ---------------------------------------------------------------------------
  Escriben con la `service_role`, así que lo que aquí se comprueba ES la
  política:

    · `exigirSuperAdmin()` al entrar: un empleado (o nadie) no pasa. El actor
      de la bitácora sale de la sesión, nunca del formulario.
    · Los dos ids llegan del formulario (entrada no confiable) y se leen
      estrictos. Cada escritura filtra por `id` Y `comercio_id`: un par
      manipulado no casa ninguna fila, y se pide `.select('id')` para
      contestar «No se encontró la reseña.» en vez de dar por buena una
      escritura que no ocurrió.
    · La bitácora guarda QUIÉN hizo QUÉ sobre QUÉ reseña y de qué comercio,
      jamás el texto ni el autor. Es de mejor esfuerzo, como
      `registrarActividad`: si falla se registra y no se deshace la acción.
    · Solo se toca `respuesta_admin` (el trigger de la base fecha
      `respuesta_admin_at`); `respuesta_comercio` no se toca nunca.
*/

import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { leerComercioId, leerResenaId } from '@/lib/resenas/acciones'
import { revisarRespuesta, type ResenaState } from '@/lib/resenas/resenas'

const SIN_PERMISO = 'No tienes permiso para realizar esta acción.'
const SIN_RESENA = 'No se encontró la reseña.'

async function exigirSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  return actor && actor.activo && actor.rolCodigo === 'super_admin' ? actor.userId : null
}

type Ids = { resenaId: number; comercioId: number }

function leerIds(formData: FormData): Ids | null {
  const resenaId = leerResenaId(formData.get('resena_id'))
  const comercioId = leerComercioId(formData.get('comercio_id'))
  return resenaId === null || comercioId === null ? null : { resenaId, comercioId }
}

async function anotar(
  actorId: string,
  accion: 'eliminar' | 'responder' | 'quitar_respuesta' | 'revisar',
  { resenaId, comercioId }: Ids,
) {
  const { error } = await createAdminClient()
    .from('bitacora_actividad')
    .insert({
      actor_id: actorId,
      accion,
      entidad: 'resena',
      entidad_id: resenaId,
      ...(accion === 'eliminar'
        ? { datos_anteriores: { comercio_id: comercioId } }
        : { datos_nuevos: { comercio_id: comercioId } }),
    })
  if (error) console.error('[resenas] bitácora:', error)
}

/** Lo que enseña una reseña en el panel: su ficha, el apartado y la portada (la alerta). */
function refrescar(comercioId: number) {
  revalidatePath(`/admin/comercios/${comercioId}`)
  revalidatePath('/admin/resenas')
  revalidatePath('/admin')
}

/**
 * La marca como revisada. Sin la columna (migración
 * `20261029120000_resenas_revisadas.sql` sin aplicar) contesta `'sin_columna'`.
 */
async function marcarRevisada(actorId: string, { resenaId, comercioId }: Ids): Promise<'ok' | 'sin_columna' | 'no_esta' | 'error'> {
  const { data, error } = await createAdminClient()
    .from('resenas')
    .update({ revisada_at: new Date().toISOString(), revisada_por: actorId })
    .eq('id', resenaId)
    .eq('comercio_id', comercioId)
    .select('id')
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204') return 'sin_columna'
    console.error('[resenas] marcar revisada:', error)
    return 'error'
  }
  return data && data.length > 0 ? 'ok' : 'no_esta'
}

async function escribirRespuestaAdmin(
  formData: FormData,
  accion: 'responder' | 'quitar_respuesta',
  valor: (formData: FormData) => { ok: true; texto: string | null } | { ok: false; error: string },
  falloGenerico: string,
): Promise<ResenaState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: SIN_PERMISO }

  const ids = leerIds(formData)
  if (!ids) return { error: SIN_RESENA }

  const v = valor(formData)
  if (!v.ok) return { error: v.error }

  const { data, error } = await createAdminClient()
    .from('resenas')
    .update({ respuesta_admin: v.texto })
    .eq('id', ids.resenaId)
    .eq('comercio_id', ids.comercioId)
    .select('id')

  if (error) {
    console.error('[resenas] respuesta de ORUM:', error)
    return { error: falloGenerico }
  }
  if (!data || data.length === 0) return { error: SIN_RESENA }

  await anotar(actorId, accion, ids)
  // Responder ES revisarla: la alerta de la portada se va. Si aún no existe
  // la columna, no pasa nada (sin ella, la respuesta ya cuenta como revisión).
  if (accion === 'responder') await marcarRevisada(actorId, ids)
  refrescar(ids.comercioId)
  return { ok: true }
}

/** Guarda (o reemplaza) la respuesta de ORUM a una reseña. */
export async function responderComoAdmin(
  _prev: ResenaState,
  formData: FormData,
): Promise<ResenaState> {
  return escribirRespuestaAdmin(
    formData,
    'responder',
    (f) => {
      const crudo = f.get('respuesta')
      const r = revisarRespuesta(typeof crudo === 'string' ? crudo : '')
      return r.ok ? { ok: true, texto: r.respuesta } : { ok: false, error: r.error }
    },
    'No pudimos guardar la respuesta. Inténtalo de nuevo.',
  )
}

/** Quita la respuesta de ORUM (la reseña se queda). */
export async function quitarRespuestaAdmin(
  _prev: ResenaState,
  formData: FormData,
): Promise<ResenaState> {
  return escribirRespuestaAdmin(
    formData,
    'quitar_respuesta',
    () => ({ ok: true, texto: null }),
    'No pudimos quitar la respuesta. Inténtalo de nuevo.',
  )
}

/** Borra la reseña para siempre. No se puede deshacer. */
export async function eliminarResena(
  _prev: ResenaState,
  formData: FormData,
): Promise<ResenaState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: SIN_PERMISO }

  const ids = leerIds(formData)
  if (!ids) return { error: SIN_RESENA }

  const { data, error } = await createAdminClient()
    .from('resenas')
    .delete()
    .eq('id', ids.resenaId)
    .eq('comercio_id', ids.comercioId)
    .select('id')

  if (error) {
    console.error('[resenas] eliminar:', error)
    return { error: 'No pudimos eliminar la reseña. Inténtalo de nuevo.' }
  }
  if (!data || data.length === 0) return { error: SIN_RESENA }

  await anotar(actorId, 'eliminar', ids)
  refrescar(ids.comercioId)
  return { ok: true }
}

/**
 * «Ya la revisé»: la reseña de calificación baja deja de estar por revisar y
 * sale de la alerta de la portada (29/10/2026). Si el socio cambia sus
 * estrellas o su mensaje, la base la vuelve a dejar por revisar.
 */
export async function marcarResenaRevisada(_prev: ResenaState, formData: FormData): Promise<ResenaState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: SIN_PERMISO }

  const ids = leerIds(formData)
  if (!ids) return { error: SIN_RESENA }

  const r = await marcarRevisada(actorId, ids)
  if (r === 'sin_columna') {
    return {
      error:
        'Falta aplicar en la base el script 20261029120000_resenas_revisadas.sql. Mientras tanto, responder como ORUM la da por revisada.',
    }
  }
  if (r === 'no_esta') return { error: SIN_RESENA }
  if (r === 'error') return { error: 'No pudimos marcarla como revisada. Inténtalo de nuevo.' }

  await anotar(actorId, 'revisar', ids)
  refrescar(ids.comercioId)
  return { ok: true }
}
