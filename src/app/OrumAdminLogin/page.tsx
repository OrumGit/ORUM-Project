import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { horaBogota, hoyISO, saludoPorHora, sumarDiasISO } from '@/lib/shared/fecha'
import { resumirEventoBitacora } from '@/lib/bitacora/bitacora'
import { obtenerAlertaResenas } from '@/lib/resenas/datos-panel'
import {
  DIAS_POR_VENCER,
  InicioPanel,
  type ActividadPanel,
  type VencimientoPanel,
} from './_components/inicio-panel'

export const metadata = { title: 'Inicio · ORUM' }

/*
  LA PORTADA DEL PANEL  ·  rediseño del 04/10/2026
  ---------------------------------------------------------------------------
  Aquí solo los DATOS; lo que se pinta es `InicioPanel`, que no consulta nada
  (así `/dev/shell` puede enseñarla con cifras falsas, sin sesión).
*/

/**
 * Cifras del panel.
 *
 * Se consultan con `count: 'exact', head: true`: la base de datos devuelve
 * solo el número, sin traer ninguna fila.
 *
 * "Membresías vigentes" filtra por `estado = 'activa'` **y** `fecha_fin >= hoy`,
 * la misma regla que aplica `derivarEstadoMembresia`. Contar solo por `estado`
 * daría un número inflado, porque esa columna no se actualiza al vencer. Las
 * «por vencer» son las vigentes cuyo `fecha_fin` cae en los próximos 30 días.
 */
async function obtenerCifras() {
  const admin = createAdminClient()
  const hoy = hoyISO()
  const limite = sumarDiasISO(hoy, DIAS_POR_VENCER)

  const [miembros, vigentes, porVencer, comercios] = await Promise.all([
    admin
      .from('miembros')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    admin
      .from('membresias')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy),
    admin
      .from('membresias')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy)
      .lte('fecha_fin', limite),
    admin
      .from('comercios')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)
      .is('deleted_at', null),
  ])

  return {
    miembros: miembros.count ?? 0,
    vigentes: vigentes.count ?? 0,
    porVencer: porVencer.count ?? 0,
    comercios: comercios.count ?? 0,
  }
}

/** Días hacia delante de «Vencen esta semana». */
const DIAS_SEMANA = 7

/**
 * Quién vence en los próximos siete días, el más urgente primero. Solo las
 * vigentes (`estado = 'activa'` y `fecha_fin >= hoy`), con la regla de
 * `derivarEstadoMembresia`.
 */
async function obtenerVencimientos(): Promise<VencimientoPanel[]> {
  const admin = createAdminClient()
  const hoy = hoyISO()
  const { data: membresias } = await admin
    .from('membresias')
    .select('miembro_id, fecha_fin')
    .eq('estado', 'activa')
    .gte('fecha_fin', hoy)
    .lte('fecha_fin', sumarDiasISO(hoy, DIAS_SEMANA))
    .order('fecha_fin', { ascending: true })
    .limit(12)
  if (!membresias || membresias.length === 0) return []

  const { data: miembros } = await admin
    .from('miembros')
    .select('id, nombres, apellidos, numero_membresia, foto_url')
    .in('id', [...new Set(membresias.map((f) => f.miembro_id))])
    .is('deleted_at', null)
  const porId = new Map((miembros ?? []).map((m) => [m.id, m]))

  const diaUTC = (iso: string) => {
    const [a, m, d] = iso.split('-').map(Number)
    return Date.UTC(a, m - 1, d)
  }
  const vistos = new Set<number>()
  const lista: VencimientoPanel[] = []
  for (const fila of membresias) {
    const m = porId.get(fila.miembro_id)
    if (!m || vistos.has(m.id)) continue
    vistos.add(m.id)
    lista.push({
      miembroId: m.id,
      nombre: `${m.nombres} ${m.apellidos}`.trim(),
      numero: m.numero_membresia,
      fotoUrl: (m.foto_url ?? '').trim() || null,
      dias: Math.round((diaUTC(fila.fecha_fin) - diaUTC(hoy)) / 86_400_000),
    })
    if (lista.length === 6) break
  }
  return lista
}

/** «hace 12 min», «ayer, 6:10 p. m.», en la zona del negocio. */
function cuandoFue(fechaISO: string, ahora: Date): string {
  const instante = new Date(fechaISO)
  const minutos = Math.round((ahora.getTime() - instante.getTime()) / 60_000)
  if (minutos < 1) return 'Hace un momento'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 12) return `Hace ${horas} h`
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(instante)
}

/** Los cinco últimos movimientos sobre miembros, de la bitácora. */
async function obtenerActividad(ahora: Date): Promise<ActividadPanel[]> {
  const admin = createAdminClient()
  const { data: eventos } = await admin
    .from('bitacora_actividad')
    .select('id, actor_id, entidad_id, accion, datos_anteriores, datos_nuevos, fecha_hora')
    .eq('entidad', 'miembro')
    .order('fecha_hora', { ascending: false })
    .limit(5)
  if (!eventos || eventos.length === 0) return []

  const idsMiembros = [...new Set(eventos.map((e) => e.entidad_id).filter((v): v is number => v !== null))]
  const idsActores = [...new Set(eventos.map((e) => e.actor_id).filter((v): v is string => !!v))]
  const [{ data: miembros }, { data: empleados }] = await Promise.all([
    idsMiembros.length
      ? admin.from('miembros').select('id, nombres, apellidos').in('id', idsMiembros)
      : Promise.resolve({ data: [] as { id: number; nombres: string; apellidos: string }[] }),
    idsActores.length
      ? admin.from('empleados').select('perfil_id, nombres, apellidos').in('perfil_id', idsActores)
      : Promise.resolve({ data: [] as { perfil_id: string; nombres: string; apellidos: string }[] }),
  ])
  const nombreMiembro = new Map((miembros ?? []).map((m) => [m.id, `${m.nombres} ${m.apellidos}`.trim()]))
  const nombreActor = new Map((empleados ?? []).map((e) => [e.perfil_id, `${e.nombres} ${e.apellidos}`.trim()]))

  return eventos.map((e) => ({
    id: e.id,
    quien: (e.actor_id && nombreActor.get(e.actor_id)) || 'Alguien del equipo',
    que: resumirEventoBitacora(e.accion, e.datos_anteriores, e.datos_nuevos),
    miembro: e.entidad_id ? (nombreMiembro.get(e.entidad_id) ?? null) : null,
    cuando: cuandoFue(e.fecha_hora, ahora),
  }))
}

/** El nombre de pila de quien entra, si es del equipo. */
async function obtenerNombre(perfilId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('empleados')
    .select('nombres')
    .eq('perfil_id', perfilId)
    .maybeSingle()
  const nombre = (data?.nombres ?? '').trim().split(/\s+/)[0]
  return nombre || null
}

/** «sábado 4 de octubre», en la zona del negocio. */
function fechaLarga(instante: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(instante)
}

export default async function AdminInicioPage() {
  const perfil = await requireRol('super_admin', 'empleado')
  const esSuperAdmin = perfil.rolCodigo === 'super_admin'
  const ahora = new Date()
  const [cifras, vencen, actividad, nombre, alerta] = await Promise.all([
    obtenerCifras(),
    obtenerVencimientos(),
    esSuperAdmin ? obtenerActividad(ahora) : Promise.resolve([]),
    obtenerNombre(perfil.userId),
    // Las reseñas se moderan solo con rol de administrador: la alerta, igual.
    esSuperAdmin ? obtenerAlertaResenas() : Promise.resolve({ total: 0, recientes: [] }),
  ])

  return (
    <InicioPanel
      esSuperAdmin={esSuperAdmin}
      saludo={saludoPorHora(horaBogota(ahora))}
      nombre={nombre}
      fecha={fechaLarga(ahora)}
      cifras={cifras}
      vencen={vencen}
      actividad={actividad}
      resenas={{
        total: alerta.total,
        recientes: alerta.recientes.map((r) => ({
          id: r.id,
          comercioNombre: r.comercioNombre,
          estrellas: r.estrellas,
          autor: r.autor,
          mensaje: r.mensaje,
        })),
      }}
    />
  )
}
