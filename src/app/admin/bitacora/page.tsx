import Link from 'next/link'
import { Filter, ScrollText, X } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resumirEventoBitacora } from '@/lib/bitacora/bitacora'
import { finDiaBogota, inicioDiaBogota } from '@/lib/shared/fecha'
import { Avatar } from '@/components/ui/avatar'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Pestanas, type TonoPestana } from '@/components/ui/pestanas'
import { PageHeader } from '@/components/ui/layout'
import styles from './bitacora.module.css'

export const metadata = { title: 'Bitácora · ORUM' }

type Evento = {
  id: number
  fechaISO: string
  miembroId: number | null
  miembroNombre: string
  accion: string
  detalle: string
  /** Nombre del empleado si lo hay; si no, su correo. */
  actor: string
  actorFoto: string | null
}

/*
  El tono NO inventa una semántica de riesgo: un registro no es una alerta.
  Solo separa los tres tipos de evento lo justo para poder escanear la columna
  sin leerla. Nada de oro aquí — el oro es marca y esta pantalla es operativa.
*/
const TONO_ACCION: Record<string, BadgeTone> = {
  alta: 'success',
  renovacion: 'info',
  edicion: 'neutral',
  revocacion: 'danger',
}

const ETIQUETA_ACCION: Record<string, string> = {
  alta: 'Alta',
  renovacion: 'Renovación',
  edicion: 'Edición',
  revocacion: 'Revocación',
}

/* Bogotá siempre: el negocio es colombiano y el servidor puede no estarlo. */
const ZONA = 'America/Bogota'
const FECHA = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
})

const COLUMNAS: ReadonlyArray<Column<Evento>> = [
  {
    key: 'fecha',
    header: 'Fecha',
    /* 175px es lo que mide "09 de ago de 2026" sin partirse: por debajo, la
       fecha cae a dos líneas y descuadra la altura de todas las filas. */
    width: '175px',
    cell: (e) => {
      const d = new Date(e.fechaISO)
      return (
        <span className={styles.fecha}>
          <span>{FECHA.format(d)}</span>
          <span className={styles.hora}>{HORA.format(d)}</span>
        </span>
      )
    },
  },
  {
    key: 'miembro',
    header: 'Miembro',
    primary: true,
    cell: (e) =>
      e.miembroId ? (
        <Link href={`/admin/miembros/${e.miembroId}`} className={styles.enlaceMiembro}>
          {e.miembroNombre}
        </Link>
      ) : (
        '—'
      ),
  },
  {
    key: 'accion',
    header: 'Acción',
    width: '140px',
    cell: (e) => (
      <Badge tone={TONO_ACCION[e.accion] ?? 'neutral'} size="sm">
        {ETIQUETA_ACCION[e.accion] ?? e.accion}
      </Badge>
    ),
  },
  {
    key: 'detalle',
    header: 'Detalle',
    cell: (e) => <span className={styles.detalle}>{e.detalle}</span>,
  },
  {
    key: 'actor',
    header: 'Registrado por',
    width: '220px',
    /*
      FOTO + NOMBRE, que es lo que pidió el propietario: «ver a los demás
      administradores en los reportes con las fotos y nombres». Antes era el
      correo en texto plano. El avatar va `decorativo` porque el nombre está
      escrito al lado — si no, el lector de pantalla lo diría dos veces.
    */
    cell: (e) =>
      e.actor === '—' ? (
        <span className={styles.actor}>—</span>
      ) : (
        <span className={styles.actorFila}>
          <Avatar nombre={e.actor} src={e.actorFoto} size="sm" decorativo />
          <span className={styles.actor}>{e.actor}</span>
        </span>
      ),
  },
]

/* Las acciones de la bitácora, como pestañas (antes, un desplegable del sistema). */
const ACCIONES: { valor: string; etiqueta: string; tono?: TonoPestana }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'alta', etiqueta: 'Altas', tono: 'exito' },
  { valor: 'edicion', etiqueta: 'Ediciones', tono: 'neutro' },
  { valor: 'renovacion', etiqueta: 'Renovaciones', tono: 'aviso' },
  { valor: 'revocacion', etiqueta: 'Revocaciones', tono: 'peligro' },
]

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; desde?: string; hasta?: string; accion?: string }>
}) {
  await requireRol('super_admin')
  const { q, desde, hasta, accion } = await searchParams
  const busqueda = (q ?? '').trim()
  const hayFiltros = Boolean(busqueda || desde || hasta || accion)

  const admin = createAdminClient()

  // Sanear caracteres especiales de PostgREST (comas, paréntesis y comodines)
  // para que una búsqueda con puntuación —p. ej. "Pérez, Juan"— no rompa la consulta.
  const termino = busqueda.replace(/[,()%*\\]/g, ' ').trim()

  // Si hay búsqueda por miembro, primero resolvemos qué miembros calzan.
  let miembroIds: number[] | null = null
  if (termino) {
    const { data: miembrosCoincidentes } = await admin
      .from('miembros')
      .select('id')
      .is('deleted_at', null)
      .or(
        `nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,cedula.ilike.%${termino}%,numero_membresia.ilike.%${termino}%`,
      )
      .limit(100)
    miembroIds = (miembrosCoincidentes ?? []).map((m) => m.id)
  }

  let query = admin
    .from('bitacora_actividad')
    .select('id, actor_id, entidad_id, accion, datos_anteriores, datos_nuevos, fecha_hora')
    .eq('entidad', 'miembro')
    .order('fecha_hora', { ascending: false })
    .limit(200)

  if (miembroIds) query = query.in('entidad_id', miembroIds.length > 0 ? miembroIds : [-1])
  /*
    Offset explícito de Bogotá, no una cadena suelta: `fecha_hora` es
    timestamptz y Postgres leería `'2026-08-12 23:59:59'` en la zona de la
    sesión (UTC). Con Bogotá cinco horas por detrás, todo lo ocurrido después
    de las 7pm caía en el día siguiente en UTC y se salía del filtro — el
    mismo fallo que backend encontró en métricas contra la base real.
  */
  if (desde) query = query.gte('fecha_hora', inicioDiaBogota(desde))
  if (hasta) query = query.lte('fecha_hora', finDiaBogota(hasta))
  if (accion) query = query.eq('accion', accion)

  const { data: eventos } = await query

  const idsMiembros = Array.from(
    new Set(
      (eventos ?? [])
        .map((e) => e.entidad_id)
        .filter((idMiembro): idMiembro is number => idMiembro !== null),
    ),
  )
  const actorIds = Array.from(
    new Set((eventos ?? []).map((e) => e.actor_id).filter((idActor): idActor is string => !!idActor)),
  )

  // Los nombres de miembro y los correos de los autores salen ambos de
  // `eventos`, ya resuelto, pero no dependen entre sí: se piden en paralelo.
  const [{ data: miembrosInfo }, correoActorEntries, { data: perfilesActor }, { data: empleadosActor }] = await Promise.all([
    idsMiembros.length > 0
      ? admin.from('miembros').select('id, nombres, apellidos').in('id', idsMiembros)
      : Promise.resolve({ data: [] as { id: number; nombres: string; apellidos: string }[] }),
    Promise.all(
      actorIds.map(async (idActor) => {
        const { data } = await admin.auth.admin.getUserById(idActor)
        return [idActor, data.user?.email ?? '—'] as const
      }),
    ),
    actorIds.length > 0
      ? admin.from('perfiles').select('id, avatar_url').in('id', actorIds)
      : Promise.resolve({ data: [] as { id: string; avatar_url: string | null }[] }),
    actorIds.length > 0
      ? admin.from('empleados').select('perfil_id, nombres, apellidos').in('perfil_id', actorIds)
      : Promise.resolve({ data: [] as { perfil_id: string; nombres: string; apellidos: string }[] }),
  ])
  const fotoActor = new Map(
    (perfilesActor ?? []).map((p) => [p.id, (p.avatar_url ?? '').trim() || null]),
  )
  const nombreActor = new Map(
    (empleadosActor ?? []).map((e) => [e.perfil_id, `${e.nombres} ${e.apellidos}`.trim()]),
  )
  const nombreMiembro = new Map(
    (miembrosInfo ?? []).map((m) => [m.id, `${m.nombres} ${m.apellidos}`.trim()]),
  )
  const correoActor = new Map(correoActorEntries)

  const filas: Evento[] = (eventos ?? []).map((e) => ({
    id: e.id,
    fechaISO: e.fecha_hora,
    miembroId: e.entidad_id,
    miembroNombre: e.entidad_id
      ? (nombreMiembro.get(e.entidad_id) ?? `Miembro #${e.entidad_id}`)
      : '—',
    accion: e.accion,
    detalle: resumirEventoBitacora(e.accion, e.datos_anteriores, e.datos_nuevos),
    actor: e.actor_id
      ? (nombreActor.get(e.actor_id) || correoActor.get(e.actor_id) || '—')
      : '—',
    actorFoto: e.actor_id ? (fotoActor.get(e.actor_id) ?? null) : null,
  }))

  return (
    <>
      <PageHeader
        title="Bitácora de actividad"
        description="Quién hizo qué y cuándo sobre los miembros. Se muestran los 200 eventos más recientes que cumplan los filtros."
      />

      {/*
        Formulario GET: los filtros quedan en la URL, se pueden compartir y
        sobreviven a un refresco. Funciona sin JavaScript.
      */}
      <div className={styles.pestanas}>
        <Pestanas
          etiqueta="Filtrar por acción"
          items={ACCIONES.map((a) => {
            const p = new URLSearchParams()
            if (busqueda) p.set('q', busqueda)
            if (desde) p.set('desde', desde)
            if (hasta) p.set('hasta', hasta)
            if (a.valor) p.set('accion', a.valor)
            const qs = p.toString()
            return {
              href: qs ? `/admin/bitacora?${qs}` : '/admin/bitacora',
              etiqueta: a.etiqueta,
              tono: a.tono,
              activa: (accion ?? '') === a.valor,
            }
          })}
        />
      </div>

      <form method="get" className={styles.filtros}>
        {accion && <input type="hidden" name="accion" value={accion} />}
        <div className={styles.campoAncho}>
          <label className={styles.etiqueta} htmlFor="f-q">
            Miembro
          </label>
          <Input
            id="f-q"
            name="q"
            defaultValue={busqueda}
            placeholder="Nombre, cédula o número"
            autoComplete="off"
          />
        </div>

        <div>
          <label className={styles.etiqueta} htmlFor="f-desde">
            Desde
          </label>
          <Input id="f-desde" type="date" name="desde" defaultValue={desde ?? ''} />
        </div>

        <div>
          <label className={styles.etiqueta} htmlFor="f-hasta">
            Hasta
          </label>
          <Input id="f-hasta" type="date" name="hasta" defaultValue={hasta ?? ''} />
        </div>

        <div className={styles.acciones}>
          <Button type="submit" variant="secondary" icon={<Filter size={16} />}>
            Filtrar
          </Button>
          {hayFiltros && (
            <Button href="/admin/bitacora" variant="ghost" icon={<X size={16} />}>
              Limpiar
            </Button>
          )}
        </div>
      </form>

      {filas.length > 0 && (
        <p className={styles.resumen}>
          {filas.length} {filas.length === 1 ? 'evento' : 'eventos'}
          {filas.length === 200 && ' (límite alcanzado: acota el rango de fechas)'}
        </p>
      )}

      <DataList
        caption="Eventos registrados sobre miembros"
        items={filas}
        columns={COLUMNAS}
        getKey={(e) => e.id}
        empty={
          hayFiltros ? (
            <EmptyState
              icon={<ScrollText size={24} />}
              title="Sin eventos"
              description="Ningún evento coincide con los filtros aplicados."
              actions={
                <Button href="/admin/bitacora" variant="secondary">
                  Quitar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<ScrollText size={24} />}
              title="Aún no hay actividad"
              description="Cuando se registren o renueven miembros, el rastro aparecerá aquí."
            />
          )
        }
      />
    </>
  )
}
