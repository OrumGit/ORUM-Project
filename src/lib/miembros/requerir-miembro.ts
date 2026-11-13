import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfilActual, type PerfilActual } from '@/lib/auth/auth'
import { hoyISO } from '@/lib/shared/fecha'
import { esMembresiaVigente } from './membresia-vigente'
import type { EstadoMembresia, TipoMembresia } from '@/lib/supabase/database.types'

export type MiembroActual = {
  id: number
  nombres: string
  apellidos: string
  numeroMembresia: string
  membresiaVigente: {
    id: number
    planId: number
    tipo: TipoMembresia
    estado: EstadoMembresia
    fechaInicio: string
    fechaFin: string
  }
}

/**
 * Exige sesión activa con rol `miembro`. No valida el estado de la
 * membresía — eso lo hace `requireMiembroVigente`. La usan tanto el layout
 * de `/miembros` como `/miembros/inactiva` (que no puede exigir membresía
 * vigente sin crear un redirect en bucle).
 */
export async function requireRolMiembro(): Promise<PerfilActual> {
  const perfil = await getPerfilActual()

  if (!perfil || !perfil.activo) {
    redirect('/miembros/login')
  }
  if (perfil.rolCodigo !== 'miembro') {
    redirect('/miembros/login?error=sin_permiso')
  }

  return perfil
}

/**
 * Exige sesión activa con rol `miembro` Y una membresía vigente (RF-06).
 * Si no hay membresía vigente, redirige a `/miembros/inactiva`.
 */
export async function requireMiembroVigente(): Promise<MiembroActual> {
  const perfil = await requireRolMiembro()

  const supabase = await createClient()
  const { data: miembro, error: miembroError } = await supabase
    .from('miembros')
    .select('id, nombres, apellidos, numero_membresia')
    .eq('perfil_id', perfil.userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (miembroError) {
    console.error(
      `[requireMiembroVigente] Error consultando 'miembros' para perfil_id=${perfil.userId}:`,
      miembroError,
    )
  }

  if (!miembro) {
    redirect('/miembros/inactiva')
  }

  const { data: membresias, error: membresiasError } = await supabase
    .from('membresias')
    .select('id, plan_id, tipo, estado, fecha_inicio, fecha_fin')
    .eq('miembro_id', miembro.id)
    .order('fecha_fin', { ascending: false })
    .limit(1)

  if (membresiasError) {
    console.error(
      `[requireMiembroVigente] Error consultando 'membresias' para miembro_id=${miembro.id}:`,
      membresiasError,
    )
  }

  const ultima = membresias?.[0] ?? null
  const hoy = hoyISO()

  if (!ultima || !esMembresiaVigente(ultima.estado, ultima.fecha_fin, hoy)) {
    redirect('/miembros/inactiva')
  }

  return {
    id: miembro.id,
    nombres: miembro.nombres,
    apellidos: miembro.apellidos,
    numeroMembresia: miembro.numero_membresia,
    membresiaVigente: {
      id: ultima.id,
      planId: ultima.plan_id,
      tipo: ultima.tipo,
      estado: ultima.estado,
      fechaInicio: ultima.fecha_inicio,
      fechaFin: ultima.fecha_fin,
    },
  }
}
