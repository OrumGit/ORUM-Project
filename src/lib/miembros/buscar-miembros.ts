import { createAdminClient } from '@/lib/supabase/admin'
import {
  derivarEstadoMembresia,
  venceAtDe,
  type EstadoDerivado,
  type EstadoMembresia,
} from '@/lib/miembros/membresias'
import { hoyISO } from '@/lib/shared/fecha'

/*
  Búsqueda de miembros compartida por la paleta de comandos y la lista de
  `/OrumAdminLogin/miembros`. Vive aquí para que exista UNA sola definición de qué
  significa buscar un miembro y de cómo se calcula su estado.
*/

export type MiembroEncontrado = {
  id: number
  numeroMembresia: string
  nombre: string
  cedula: string
  /** Foto del socio. Sin ella el avatar pinta iniciales. */
  fotoUrl: string | null
  plan: string | null
  /** `null` si el miembro nunca ha tenido membresía. */
  estado: EstadoDerivado | null
}

/**
 * Limpia el término de búsqueda.
 *
 * Quita los caracteres que son ESTRUCTURA del filtro `.or(...)` de PostgREST
 * (comas, paréntesis, comodines). Sin esto, buscar "Pérez, Juan" rompe la
 * consulta en lugar de buscar ese texto.
 */
export function limpiarTermino(entrada: string): string {
  return entrada.replace(/[,()%*\\]/g, ' ').trim()
}

/**
 * Busca miembros por número de membresía, cédula, nombres o apellidos.
 *
 * El estado se DERIVA de `estado` + `fecha_fin` (ver `derivarEstadoMembresia`),
 * nunca se lee la columna `estado` en crudo: esa columna no se actualiza al
 * vencer la fecha y mostraría "Activa" sobre quien no paga.
 *
 * @param termino  Texto libre. Vacío devuelve los primeros resultados.
 * @param limite   Máximo de filas. La paleta pide pocas; la lista, más.
 */
export async function buscarMiembros(
  termino: string,
  limite = 100,
): Promise<MiembroEncontrado[]> {
  const admin = createAdminClient()

  let consulta = admin
    .from('miembros')
    .select('id, numero_membresia, nombres, apellidos, cedula, foto_url')
    .is('deleted_at', null)

  const limpio = limpiarTermino(termino)
  if (limpio) {
    consulta = consulta.or(
      `numero_membresia.ilike.%${limpio}%,cedula.ilike.%${limpio}%,nombres.ilike.%${limpio}%,apellidos.ilike.%${limpio}%`,
    )
  }

  const { data: miembros } = await consulta.order('apellidos').limit(limite)
  if (!miembros || miembros.length === 0) return []

  // Membresía más reciente de cada miembro, sea cual sea su estado: hace falta
  // para poder decir "Inactiva · vencida", no solo "sin membresía".
  const ids = miembros.map((m) => m.id)
  const { data: membresias } = await admin
    .from('membresias')
    // `*`: trae `vence_at` (cortesías por horas) si la migración está aplicada.
    .select('*, planes_membresia(nombre)')
    .in('miembro_id', ids)
    .order('fecha_fin', { ascending: false })

  type FilaMembresia = {
    miembro_id: number
    estado: EstadoMembresia
    fecha_fin: string
    planes_membresia: { nombre: string } | { nombre: string }[] | null
  }

  const hoy = hoyISO()
  const porMiembro = new Map<number, { estado: EstadoDerivado; plan: string | null }>()

  for (const fila of (membresias ?? []) as FilaMembresia[]) {
    // Ya vienen ordenadas por fecha_fin descendente: la primera de cada
    // miembro es la más reciente y es la que manda.
    if (porMiembro.has(fila.miembro_id)) continue

    const relacion = fila.planes_membresia
    const plan = Array.isArray(relacion) ? (relacion[0]?.nombre ?? null) : (relacion?.nombre ?? null)

    porMiembro.set(fila.miembro_id, {
      estado: derivarEstadoMembresia(fila.estado, fila.fecha_fin, hoy, venceAtDe(fila)),
      plan,
    })
  }

  return miembros.map((m) => {
    const encontrado = porMiembro.get(m.id)
    return {
      id: m.id,
      numeroMembresia: m.numero_membresia,
      nombre: `${m.nombres} ${m.apellidos}`.trim(),
      cedula: m.cedula,
      fotoUrl: (m.foto_url ?? '').trim() || null,
      plan: encontrado?.plan ?? null,
      estado: encontrado?.estado ?? null,
    }
  })
}
