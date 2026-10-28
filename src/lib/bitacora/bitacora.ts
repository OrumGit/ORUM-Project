import { createAdminClient } from '@/lib/supabase/admin'
import { resumirRevocacion } from '../miembros/revocacion'

type Admin = ReturnType<typeof createAdminClient>

export type DatosEvento = Record<string, unknown> | null

const ETIQUETAS_CAMPO: Record<string, string> = {
  nombres: 'nombres',
  apellidos: 'apellidos',
  cedula: 'cédula',
  telefono: 'teléfono',
  direccion: 'dirección',
  ciudad_id: 'ciudad',
}

function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '(vacío)'
  return String(valor)
}

/**
 * Arma el texto legible de un evento de bitácora, reutilizado tanto en la
 * ficha del miembro como en el listado global (`/admin/bitacora`).
 */
export function resumirEventoBitacora(
  accion: string,
  datosAnteriores: DatosEvento,
  datosNuevos: DatosEvento,
): string {
  if (accion === 'alta') {
    const n = datosNuevos ?? {}
    const cobro = n.es_cortesia === true ? 'cortesía' : `$${formatearValor(n.precio_pagado)}`
    return `Miembro registrado — plan ${formatearValor(n.plan_nombre)}, ${cobro}`
  }

  if (accion === 'renovacion') {
    const n = datosNuevos ?? {}
    const cortesia = n.es_cortesia === true ? ' (cortesía)' : ''
    return `Membresía renovada${cortesia} — plan ${formatearValor(n.plan_nombre)}, vence ${formatearValor(n.fecha_fin)}`
  }

  if (accion === 'edicion') {
    const antes = datosAnteriores ?? {}
    const despues = datosNuevos ?? {}
    const cambios = Object.keys(despues)
      .filter((campo) => antes[campo] !== despues[campo])
      .map((campo) => ETIQUETAS_CAMPO[campo] ?? campo)
    if (cambios.length === 0) return 'Datos editados (sin cambios detectados)'
    return `Datos editados — ${cambios.join(', ')}`
  }

  if (accion === 'reenvio_activacion') return 'Correo de activación reenviado'

  if (accion === 'revocacion') return resumirRevocacion(datosNuevos?.motivo, datosNuevos?.nota)

  return `Evento: ${accion}`
}

export type AccionBitacora = 'alta' | 'edicion' | 'renovacion' | 'reenvio_activacion' | 'revocacion'

export type RegistrarActividadInput = {
  actorId: string | null
  accion: AccionBitacora
  /** Por defecto `miembro`. Solo ese se muestra en la bitácora del panel. */
  entidad?: 'miembro' | 'comercio' | 'empleado'
  entidadId: number
  datosAnteriores?: DatosEvento
  datosNuevos?: DatosEvento
}

/**
 * Escribe un evento en `bitacora_actividad` para un miembro (`entidad` fijo).
 * Best-effort: si el insert falla, se loguea el error a consola pero nunca se
 * propaga — la auditoría no debe bloquear la operación principal que la
 * dispara (alta/edición/renovación de un miembro).
 */
export async function registrarActividad(admin: Admin, input: RegistrarActividadInput): Promise<void> {
  try {
    const { error } = await admin.from('bitacora_actividad').insert({
      actor_id: input.actorId,
      accion: input.accion,
      entidad: input.entidad ?? 'miembro',
      entidad_id: input.entidadId,
      datos_anteriores: input.datosAnteriores ?? null,
      datos_nuevos: input.datosNuevos ?? null,
    })
    if (error) {
      console.error('No se pudo registrar el evento en bitacora_actividad:', error.message)
    }
  } catch (err) {
    console.error('No se pudo registrar el evento en bitacora_actividad:', err)
  }
}
