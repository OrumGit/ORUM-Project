'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import { validarValorPromocion } from '@/lib/comercios/promociones'
import { leerDiasDelFormulario } from '@/lib/comercios/dias-promocion'
import {
  diasDeFranjas,
  leerFranjasDelFormulario,
  type FranjasPromocion,
} from '@/lib/comercios/franjas-promocion'
import { leerRestricciones } from '@/lib/comercios/restricciones-promocion'
import { leerPesos } from '@/lib/validacion/reglas'
import type { TipoBeneficioCodigo } from '@/lib/supabase/database.types'

async function exigirSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  return actor && actor.activo && actor.rolCodigo === 'super_admin' ? actor.userId : null
}

export type PromocionState = { error?: string; ok?: boolean }

function leerCamposPromocion(formData: FormData):
  | {
      ok: true
      titulo: string
      descripcion: string | null
      tipo_beneficio_id: number
      valor: number | null
      fecha_inicio: string | null
      fecha_fin: string | null
      dias_semana: number[] | null
      restricciones: string | null
      franjas_horarias: FranjasPromocion
    }
  | { ok: false; error: string } {
  const titulo = String(formData.get('titulo') ?? '').trim()
  if (!titulo) return { ok: false, error: 'El título de la promoción es obligatorio.' }

  const tipoRaw = String(formData.get('tipo_beneficio_id') ?? '').trim()
  const tipo_beneficio_id = Number(tipoRaw)
  if (!Number.isInteger(tipo_beneficio_id) || tipo_beneficio_id < 1) {
    return { ok: false, error: 'Selecciona un tipo de beneficio.' }
  }

  const valorRaw = String(formData.get('valor') ?? '').trim()
  // «15 %», «$ 20.000»: se acepta como lo escribe la gente.
  const valor = valorRaw ? leerPesos(valorRaw.replace('%', '')) : null
  if (valorRaw && !Number.isFinite(valor)) return { ok: false, error: 'El valor debe ser un número.' }

  const restricciones = leerRestricciones(String(formData.get('restricciones') ?? ''))
  if (!restricciones.ok) return { ok: false, error: restricciones.error }

  // «Solo en ciertos horarios»: las franjas, cada una con sus días. Con el
  // interruptor apagado no se manda nada y vale todo el día.
  const franjas = leerFranjasDelFormulario(String(formData.get('franjas_horarias') ?? ''))
  if (!franjas.ok) return { ok: false, error: franjas.error }

  return {
    ok: true,
    titulo,
    descripcion: String(formData.get('descripcion') ?? '').trim() || null,
    tipo_beneficio_id,
    valor,
    fecha_inicio: String(formData.get('fecha_inicio') ?? '').trim() || null,
    fecha_fin: String(formData.get('fecha_fin') ?? '').trim() || null,
    // Nada marcado (o los siete) = vale todos los días: se guarda null. Con
    // franjas, los días son los de las franjas juntas: lo que ya sabía de
    // días (la caja, «Solo martes…») sigue diciendo la verdad.
    dias_semana: franjas.valor
      ? diasDeFranjas(franjas.valor)
      : leerDiasDelFormulario(formData.getAll('dias_semana').map(String)),
    restricciones: restricciones.valor,
    franjas_horarias: franjas.valor,
  }
}

/** El error de PostgREST cuando la columna `franjas_horarias` aún no existe. */
function faltaColumnaFranjas(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error && (error.code === '42703' || error.code === 'PGRST204') && error.message?.includes('franjas_horarias'),
  )
}

const AVISO_MIGRACION_FRANJAS =
  'Para guardar horarios en una promoción falta aplicar la migración 20261028120000_promociones_franjas_horarias.sql en Supabase. Sin horarios, la promoción sí se puede guardar.'

/**
 * Escribe la promoción con sus franjas. La migración se aplica a mano: si la
 * columna todavía no existe y la promoción no lleva franjas, se escribe sin
 * ella (como antes); si lleva, se avisa en vez de perderlas en silencio.
 */
async function escribirConFranjas(
  escribir: (conFranjas: boolean) => PromiseLike<{ error: { code?: string; message?: string } | null }>,
  franjas: FranjasPromocion,
): Promise<{ error: { code?: string; message?: string } | null; aviso?: string }> {
  const primero = await escribir(true)
  if (!faltaColumnaFranjas(primero.error)) return primero
  if (franjas) return { error: null, aviso: AVISO_MIGRACION_FRANJAS }
  return escribir(false)
}

export async function crearPromocion(_prev: PromocionState, formData: FormData): Promise<PromocionState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const comercioId = Number(formData.get('comercio_id'))
  if (!Number.isInteger(comercioId) || comercioId < 1) return { error: 'Falta el identificador del comercio.' }

  const campos = leerCamposPromocion(formData)
  if (!campos.ok) return { error: campos.error }

  const admin = createAdminClient()

  const { data: tipo } = await admin
    .from('tipos_beneficio')
    .select('id, codigo')
    .eq('id', campos.tipo_beneficio_id)
    .maybeSingle()
  if (!tipo) return { error: 'El tipo de beneficio seleccionado no existe.' }

  const validacion = validarValorPromocion(tipo.codigo as TipoBeneficioCodigo, campos.valor)
  if (!validacion.ok) return { error: validacion.error }

  const fila = {
    comercio_id: comercioId,
    tipo_beneficio_id: campos.tipo_beneficio_id,
    titulo: campos.titulo,
    descripcion: campos.descripcion,
    valor: campos.valor,
    fecha_inicio: campos.fecha_inicio,
    fecha_fin: campos.fecha_fin,
    dias_semana: campos.dias_semana,
    restricciones: campos.restricciones,
    activo: true,
  }
  const { error, aviso } = await escribirConFranjas(
    (conFranjas) =>
      admin
        .from('promociones')
        .insert({
          ...fila,
          updated_by: actorId,
          ...(conFranjas ? { franjas_horarias: campos.franjas_horarias } : {}),
        }),
    campos.franjas_horarias,
  )
  if (aviso) return { error: aviso }
  if (error) return { error: mensajeDeError('No se pudo crear la promoción', error) }

  revalidatePath(`/admin/comercios/${comercioId}`)

  updateTag('publico')
  return { ok: true }
}

export async function editarPromocion(_prev: PromocionState, formData: FormData): Promise<PromocionState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const id = Number(formData.get('id'))
  const comercioId = Number(formData.get('comercio_id'))
  if (!Number.isInteger(id) || id < 1) return { error: 'Falta el identificador de la promoción.' }
  if (!Number.isInteger(comercioId) || comercioId < 1) return { error: 'Falta el identificador del comercio.' }

  const campos = leerCamposPromocion(formData)
  if (!campos.ok) return { error: campos.error }

  const admin = createAdminClient()

  const { data: tipo } = await admin
    .from('tipos_beneficio')
    .select('id, codigo')
    .eq('id', campos.tipo_beneficio_id)
    .maybeSingle()
  if (!tipo) return { error: 'El tipo de beneficio seleccionado no existe.' }

  const validacion = validarValorPromocion(tipo.codigo as TipoBeneficioCodigo, campos.valor)
  if (!validacion.ok) return { error: validacion.error }

  const cambios = {
    tipo_beneficio_id: campos.tipo_beneficio_id,
    titulo: campos.titulo,
    descripcion: campos.descripcion,
    valor: campos.valor,
    fecha_inicio: campos.fecha_inicio,
    fecha_fin: campos.fecha_fin,
    dias_semana: campos.dias_semana,
    restricciones: campos.restricciones,
  }
  const { error, aviso } = await escribirConFranjas(
    (conFranjas) =>
      admin
        .from('promociones')
        .update({
          ...cambios,
          updated_by: actorId,
          ...(conFranjas ? { franjas_horarias: campos.franjas_horarias } : {}),
        })
        .eq('id', id)
        .eq('comercio_id', comercioId),
    campos.franjas_horarias,
  )
  if (aviso) return { error: aviso }
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  revalidatePath(`/admin/comercios/${comercioId}`)

  updateTag('publico')
  return { ok: true }
}

/** Activa o desactiva una promoción (`promociones.activo`). */
export async function cambiarEstadoPromocion(formData: FormData): Promise<void> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) redirect('/login?error=sin_permiso')

  const id = Number(formData.get('id'))
  const comercioId = Number(formData.get('comercio_id'))
  const activar = String(formData.get('activar') ?? '') === 'true'
  if (!Number.isInteger(id) || id < 1) redirect('/admin/comercios')
  if (!Number.isInteger(comercioId) || comercioId < 1) redirect('/admin/comercios')

  const admin = createAdminClient()
  const { error } = await admin.from('promociones').update({ updated_by: actorId, activo: activar }).eq('id', id)

  if (!error) {
    revalidatePath(`/admin/comercios/${comercioId}`)
    updateTag('publico')
  }
  redirect(`/admin/comercios/${comercioId}?pestana=promociones`)
}
