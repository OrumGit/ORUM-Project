import { requireRol } from '@/lib/auth/auth'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader, Stack } from '@/components/ui/layout'
import { Paginacion } from '@/components/ui/paginacion'
import { ContenidoPestana, Pestanas, type TonoPestana } from '@/components/ui/pestanas'
import { ResenasAdmin } from '@/app/admin/comercios/[id]/_components/resenas-admin'
import { leerEstrellas, obtenerResenasDelPanel } from '@/lib/resenas/datos-panel'
import { conteosDe } from '@/lib/resenas/puntaje'
import { PuntajeResenas } from '@/components/resenas/puntaje-resenas'
import { leerFiltroResenas, type FiltroResenas } from '@/lib/resenas/moderacion'

export const metadata = { title: 'Reseñas · ORUM' }

/*
  TODAS LAS RESEÑAS  ·  apartado del panel (29/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «un apartado completo de reseñas, donde aparezcan
  todas y de qué comercio fue». Pestañas como las demás listas del panel:
  Todas · Por revisar (menos de 4 estrellas y sin revisar: la alerta de la
  portada lleva aquí) · Calificación baja. Cada reseña enlaza a la ficha de
  su comercio y se modera aquí mismo (`ResenasAdmin` con `conComercio`).
  Solo super administrador, como la moderación en la ficha.
*/

const PESTANAS: { valor: FiltroResenas; etiqueta: string; tono?: TonoPestana }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'por_revisar', etiqueta: 'Por revisar', tono: 'peligro' },
  { valor: 'bajas', etiqueta: 'Calificación baja', tono: 'aviso' },
]

const VACIO: Record<FiltroResenas, { titulo: string; descripcion: string }> = {
  todas: {
    titulo: 'Aún no hay reseñas',
    descripcion: 'Cuando los socios califiquen a los comercios aliados, sus reseñas aparecerán aquí.',
  },
  por_revisar: {
    titulo: 'Nada por revisar',
    descripcion: 'Todas las reseñas de menos de 4 estrellas ya están revisadas.',
  },
  bajas: {
    titulo: 'Sin calificaciones bajas',
    descripcion: 'Ninguna reseña tiene menos de 4 estrellas.',
  },
}

const enlace = (filtro: FiltroResenas, pagina = 1) => {
  const p = new URLSearchParams()
  if (filtro !== 'todas') p.set('ver', filtro)
  if (pagina > 1) p.set('pagina', String(pagina))
  const qs = p.toString()
  return qs ? `/admin/resenas?${qs}` : '/admin/resenas'
}

export default async function ResenasPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; pagina?: string }>
}) {
  await requireRol('super_admin')
  const { ver, pagina } = await searchParams
  const filtro = leerFiltroResenas(ver)
  const [datos, estrellas] = await Promise.all([
    obtenerResenasDelPanel(filtro, Number.parseInt(pagina ?? '1', 10)),
    // El puntaje de TODO el club, arriba (11/11/2026).
    leerEstrellas(),
  ])

  return (
    <>
      <PageHeader
        title="Reseñas"
        description="Todas las reseñas de los socios, con el comercio de cada una. Las de menos de 4 estrellas esperan que alguien las revise."
      />

      {datos.disponible ? (
        <Stack gap={5}>
          {estrellas && (
            <Card padding="lg">
              <PuntajeResenas
                conteos={conteosDe(estrellas.map((e) => e.estrellas))}
                etiqueta="Puntaje de todas las reseñas del club"
              />
            </Card>
          )}

          <Pestanas
            etiqueta="Filtrar reseñas"
            items={PESTANAS.map((p) => ({
              href: enlace(p.valor),
              etiqueta: p.etiqueta,
              cuenta: datos.conteos[p.valor],
              tono: p.tono,
              activa: p.valor === filtro,
            }))}
          />

          <ContenidoPestana etiqueta="Filtrar reseñas" clave={filtro}>
            <Card padding="lg">
              <ResenasAdmin
                key={filtro}
                conComercio
                conRevision={datos.conRevision}
                resenas={datos.resenas}
                vacio={VACIO[filtro]}
              />
            </Card>

            {datos.conteos[filtro] > 0 && (
              <Paginacion
                pagina={datos.pagina}
                paginas={datos.paginas}
                total={datos.conteos[filtro]}
                desde={datos.desde}
                hasta={datos.hasta}
                nombre={datos.conteos[filtro] === 1 ? 'reseña' : 'reseñas'}
                href={(n) => enlace(filtro, n)}
              />
            )}
          </ContenidoPestana>
        </Stack>
      ) : (
        <EmptyState
          title="Las reseñas todavía no están disponibles"
          description="No pudimos leer las reseñas. Inténtalo de nuevo más tarde."
        />
      )}
    </>
  )
}
