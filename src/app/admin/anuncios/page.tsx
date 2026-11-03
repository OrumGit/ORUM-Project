// src/app/admin/anuncios/page.tsx
import { Megaphone, MoreHorizontal, Pencil } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { etiquetaAlcance } from '@/lib/anuncios/alcance'
import { formatearFechaNovedad } from '@/lib/anuncios/fecha'
import {
  describirProgramacion,
  estadoNovedad,
  faltanColumnasDeProgramacion,
  type EstadoNovedad,
} from '@/lib/anuncios/programacion'
import { obtenerInstanteServidor } from '@/lib/publico/datos-publicos'
import { ContenidoPestana, Pestanas, type TonoPestana } from '@/components/ui/pestanas'
import { AccionEstado } from '@/components/ui/accion-estado'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/layout'
import { DropdownMenu, MenuItem } from '@/components/ui/menu'
import { cambiarEstadoAnuncio } from './actions'
import lista from '@/styles/lista-panel.module.css'

export const metadata = { title: 'Novedades · ORUM' }

type Anuncio = {
  id: number
  titulo: string
  cuerpo: string
  imagen_url: string | null
  mostrar_publico: boolean
  mostrar_miembros: boolean
  activo: boolean
  created_at: string
  publicar_desde?: string | null
  publicar_hasta?: string | null
  /** Calculado al cargar, con la hora del servidor. */
  estado: EstadoNovedad
}

/* El estado REAL, con la programación (21/10/2026): una novedad activa puede
   estar esperando su hora o haber terminado ya. Siempre con texto. */
const ESTADOS: Record<EstadoNovedad, { etiqueta: string; tono: BadgeTone; pestana: TonoPestana }> = {
  publicada: { etiqueta: 'Publicada', tono: 'success', pestana: 'exito' },
  programada: { etiqueta: 'Programada', tono: 'info', pestana: 'aviso' },
  finalizada: { etiqueta: 'Finalizada', tono: 'neutral', pestana: 'vacio' },
  retirada: { etiqueta: 'Retirada', tono: 'warning', pestana: 'peligro' },
}

const ORDEN_PESTANAS: EstadoNovedad[] = ['publicada', 'programada', 'finalizada', 'retirada']

const COLUMNAS: ReadonlyArray<Column<Anuncio>> = [
  {
    key: 'titulo',
    header: 'Título',
    primary: true,
    // La miniatura y el comienzo del texto: se reconoce sin abrirla.
    cell: (a) => (
      <span className={lista.celdaNombre}>
        <span className={lista.miniatura} aria-hidden="true">
          {a.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL de Storage
            <img src={a.imagen_url} alt="" loading="lazy" decoding="async" />
          ) : (
            <Megaphone size={16} />
          )}
        </span>
        <span className={lista.nombreBloque}>
          <span className={lista.nombre}>{a.titulo}</span>
          <span className={lista.subtituloTexto}>{a.cuerpo}</span>
        </span>
      </span>
    ),
  },
  {
    key: 'alcance',
    header: 'Alcance',
    hideOnMobile: true,
    cell: (a) => (
      <Badge tone="info" size="sm">
        {etiquetaAlcance(a.mostrar_publico, a.mostrar_miembros)}
      </Badge>
    ),
  },
  {
    key: 'activo',
    header: 'Estado',
    width: '230px',
    cell: (a) => {
      const ventana = describirProgramacion(a.publicar_desde ?? null, a.publicar_hasta ?? null)
      return (
        <span className={lista.nombreBloque}>
          <span>
            <Badge tone={ESTADOS[a.estado].tono} size="sm">
              {ESTADOS[a.estado].etiqueta}
            </Badge>
          </span>
          {ventana && <span className={lista.subtituloTexto}>{ventana}</span>}
        </span>
      )
    },
  },
  {
    key: 'creado',
    header: 'Creada',
    hideOnMobile: true,
    cell: (a) => formatearFechaNovedad(a.created_at),
  },
]

export default async function AnunciosPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireRol('super_admin')
  const { ver } = await searchParams

  const admin = createAdminClient()
  const consulta = (columnas: string) =>
    admin.from('anuncios').select(columnas).is('deleted_at', null).order('created_at', { ascending: false })
  const base = 'id, titulo, cuerpo, imagen_url, mostrar_publico, mostrar_miembros, activo, created_at'
  // Sin las columnas de programación (migración aún sin aplicar), se lee sin ellas.
  let respuesta = await consulta(`${base}, publicar_desde, publicar_hasta`)
  if (faltanColumnasDeProgramacion(respuesta.error)) respuesta = await consulta(base)

  const ahora = new Date(await obtenerInstanteServidor())
  const todas: Anuncio[] = ((respuesta.data ?? []) as unknown as Omit<Anuncio, 'estado'>[]).map((a) => ({
    ...a,
    estado: estadoNovedad(
      { activo: a.activo, desde: a.publicar_desde ?? null, hasta: a.publicar_hasta ?? null },
      ahora,
    ),
  }))
  const filtro = ORDEN_PESTANAS.find((e) => e === ver) ?? null
  const anuncios = filtro ? todas.filter((a) => a.estado === filtro) : todas

  return (
    <>
      <PageHeader
        title="Novedades"
        description="Lo que el admin publica se ve en el Portal Público y/o el de Miembros, según el alcance de cada una."
        actions={
          <Button href="/admin/anuncios/nuevo" icon={<Megaphone size={16} />}>
            Nueva novedad
          </Button>
        }
      />

      <div className={lista.lista}>
        <Pestanas
          etiqueta="Filtrar novedades"
          items={[
            { href: '/admin/anuncios', etiqueta: 'Todas', cuenta: todas.length, tono: 'neutro', activa: filtro === null },
            ...ORDEN_PESTANAS.map((e) => ({
              href: `/admin/anuncios?ver=${e}`,
              etiqueta: `${ESTADOS[e].etiqueta}s`,
              cuenta: todas.filter((a) => a.estado === e).length,
              tono: ESTADOS[e].pestana,
              activa: filtro === e,
            })),
          ]}
        />

        <ContenidoPestana etiqueta="Filtrar novedades" clave={filtro ?? 'todas'}>
          <DataList
            caption="Novedades"
            items={anuncios}
            columns={COLUMNAS}
            getKey={(a) => a.id}
            alwaysShowActions
            empty={
              todas.length > 0 ? (
                <EmptyState
                  title="Ninguna en esta pestaña"
                  description="Las novedades con este estado aparecerán aquí."
                  actions={
                    <Button href="/admin/anuncios" variant="secondary">
                      Ver todas
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="Aún no hay novedades"
                  description="Publica la primera para anunciar un beneficio nuevo o una actualización del club."
                  actions={
                    <Button href="/admin/anuncios/nuevo" icon={<Megaphone size={16} />}>
                      Nueva novedad
                    </Button>
                  }
                />
              )
            }
            actions={(a) => (
              <>
                <AccionEstado
                  activo={a.activo}
                  accion={cambiarEstadoAnuncio}
                  campos={{ id: a.id }}
                  etiquetaDesactivar="Retirar"
                  etiquetaActivar="Publicar"
                />

                <DropdownMenu
                  trigger={
                    <Button
                      iconOnly
                      variant="ghost"
                      size="sm"
                      aria-label={`Acciones de ${a.titulo}`}
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                  }
                >
                  <MenuItem href={`/admin/anuncios/${a.id}/editar`} icon={<Pencil size={16} />}>
                    Editar novedad
                  </MenuItem>
                </DropdownMenu>
              </>
            )}
          />
        </ContenidoPestana>
      </div>
    </>
  )
}
