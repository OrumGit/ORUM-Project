'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import { expandirRango } from '@/lib/miembros/numeros-registro'

type Admin = ReturnType<typeof createAdminClient>

const RUTA = '/admin/miembros/numeros'

/** Solo el super_admin carga o depura el pozo. El empleado únicamente asigna al vender. */
async function esSuperAdmin(): Promise<boolean> {
  const actor = await getPerfilActual()
  return !!actor && actor.activo && actor.rolCodigo === 'super_admin'
}

async function empleadoIdDe(admin: Admin, perfilId: string): Promise<number | null> {
  const { data } = await admin
    .from('empleados')
    .select('id')
    .eq('perfil_id', perfilId)
    .is('deleted_at', null)
    .maybeSingle()
  return data?.id ?? null
}

export type CargarRangoState = {
  error?: string
  ok?: boolean
  creados?: number
  omitidos?: number
}

/**
 * Carga en el pozo todos los números de un rango inclusivo `desde`–`hasta`.
 * Salta los que ya estén en el pozo y los que ya sean `numero_membresia` de un
 * miembro existente, así recargar un rango solapado no falla ni duplica.
 */
export async function cargarRangoNumeros(
  _prev: CargarRangoState,
  formData: FormData,
): Promise<CargarRangoState> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') {
    return { error: 'No tienes permiso para realizar esta acción.' }
  }

  const desde = String(formData.get('desde') ?? '').trim()
  const hasta = String(formData.get('hasta') ?? '').trim()

  const rango = expandirRango(desde, hasta)
  if (!rango.ok) return { error: rango.error }

  const admin = createAdminClient()
  const primero = rango.numeros[0]
  const ultimo = rango.numeros[rango.numeros.length - 1]

  // Todos los números son de 8 dígitos, así que el orden lexicográfico del
  // texto coincide con el numérico: un `gte`/`lte` acota bien el rango.
  const [{ data: enMiembros }, empleadoId] = await Promise.all([
    admin
      .from('miembros')
      .select('numero_membresia')
      .gte('numero_membresia', primero)
      .lte('numero_membresia', ultimo),
    empleadoIdDe(admin, actor.userId),
  ])

  const tomados = new Set((enMiembros ?? []).map((m) => m.numero_membresia))
  const candidatos = rango.numeros.filter((n) => !tomados.has(n))

  if (candidatos.length === 0) {
    return { ok: true, creados: 0, omitidos: rango.numeros.length }
  }

  // `ignoreDuplicates`: los que ya estén en el pozo (choque de PK) se omiten en
  // silencio; `data` trae solo las filas realmente insertadas.
  const { data: insertados, error } = await admin
    .from('numeros_registro')
    .upsert(
      candidatos.map((numero) => ({ numero, creado_por: empleadoId })),
      { onConflict: 'numero', ignoreDuplicates: true },
    )
    .select('numero')
  if (error) return { error: mensajeDeError('No se pudieron cargar los números', error) }

  const creados = insertados?.length ?? 0
  revalidatePath(RUTA)
  return { ok: true, creados, omitidos: rango.numeros.length - creados }
}

/**
 * Quita un número del pozo. Solo si sigue libre: uno ya asignado a un miembro
 * es su número de carné y no se puede borrar desde aquí.
 */
export async function eliminarNumeroRegistro(formData: FormData): Promise<void> {
  if (!(await esSuperAdmin())) redirect('/')

  const numero = String(formData.get('numero') ?? '').trim()
  if (!numero) redirect(RUTA)

  const admin = createAdminClient()
  await admin
    .from('numeros_registro')
    .delete()
    .eq('numero', numero)
    .is('miembro_id', null)

  revalidatePath(RUTA)
  redirect(RUTA)
}
