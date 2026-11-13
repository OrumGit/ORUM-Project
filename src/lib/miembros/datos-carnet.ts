import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { hoyISO } from '@/lib/shared/fecha'
import { derivarEstadoMembresia, type EstadoDerivado } from './membresias'
import { esMembresiaVigente } from './membresia-vigente'

/*
  LOS DATOS DEL CARNET PARA LA CABECERA  ·  29/09/2026
  ---------------------------------------------------------------------------
  El carnet dejó de ser solo una página: el botón «Carnet» de la cabecera lo
  abre encima de cualquier pantalla del portal. El layout lo necesita, pero
  NO puede usar `requireMiembroVigente`, porque ese layout también envuelve
  `/miembros/inactiva` y redirigiría en bucle. Esta función hace las mismas
  lecturas y devuelve `null` en vez de redirigir: sin membresía vigente no
  hay botón.

  `membresias.estado` en crudo, JAMÁS (CLAUDE.md): el estado se DERIVA con
  `derivarEstadoMembresia`, la misma función que usa el carnet de la página.
*/

export type DatosCarnet = {
  nombre: string
  /** `planes_membresia` sostiene varios planes; sin plan, un respaldo. */
  plan: string
  numeroMembresia: string
  estado: EstadoDerivado
  /** `fecha_fin` legible, formateada en UTC (es una fecha civil). */
  vigencia: string
  fotoUrl: string | null
}

/* UTC a propósito: `fecha_fin` es una fecha civil 'YYYY-MM-DD'. Leída en
   Bogotá (UTC−5) retrocedería un día y el carnet anunciaría el vencimiento
   antes de tiempo. */
const FECHA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return FECHA.format(new Date(Date.UTC(a, m - 1, d)))
}

export async function obtenerDatosCarnet(perfilId: string): Promise<DatosCarnet | null> {
  const supabase = await createClient()

  const { data: miembro } = await supabase
    .from('miembros')
    .select('id, nombres, apellidos, numero_membresia, foto_url')
    .eq('perfil_id', perfilId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!miembro) return null

  const { data: membresias } = await supabase
    .from('membresias')
    .select('plan_id, estado, fecha_fin')
    .eq('miembro_id', miembro.id)
    .order('fecha_fin', { ascending: false })
    .limit(1)
  const ultima = membresias?.[0]
  const hoy = hoyISO()
  if (!ultima || !esMembresiaVigente(ultima.estado, ultima.fecha_fin, hoy)) return null

  const { data: plan } = await supabase
    .from('planes_membresia')
    .select('nombre')
    .eq('id', ultima.plan_id)
    .maybeSingle()

  return {
    nombre: `${miembro.nombres} ${miembro.apellidos}`.trim(),
    plan: plan?.nombre ?? 'Membresía ORUM',
    numeroMembresia: miembro.numero_membresia,
    estado: derivarEstadoMembresia(ultima.estado, ultima.fecha_fin, hoy),
    vigencia: fechaLegible(ultima.fecha_fin),
    /* Una cadena vacía no es una foto: sería un `<img src="">`. */
    fotoUrl: (miembro.foto_url ?? '').trim() || null,
  }
}
