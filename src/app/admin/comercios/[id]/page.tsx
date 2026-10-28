import { notFound } from 'next/navigation'
import { MapPin, MoreHorizontal, Pencil, Tag } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AccionEstado } from '@/components/ui/accion-estado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { DropdownMenu, MenuItem } from '@/components/ui/menu'
import { Pestanas } from '@/components/ui/pestanas'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import { cargarCategoriasConSubcategorias, cargarFilasCategoria } from '@/lib/comercios/categorias-admin'
import { cambiarEstadoAccesoComercio, cambiarEstadoComercio } from '../actions'
import { cambiarEstadoSucursal } from '../sucursales-actions'
import { cambiarEstadoPromocion } from '../promociones-actions'
import { textoDias } from '@/lib/comercios/dias-promocion'
import { lineasFranjas, normalizarFranjas } from '@/lib/comercios/franjas-promocion'
import { EditarComercioForm } from './editar/_components/editar-comercio-form'
import { GestorImagenes } from './imagenes/_components/gestor-imagenes'
import { cargarImagenesComercio } from './imagenes/_components/datos'
import { Paginacion } from '@/components/ui/paginacion'
import { ResenasAdmin } from './_components/resenas-admin'
import { obtenerResenasParaAdmin } from '@/lib/resenas/datos'
import { ReenviarActivacion } from '../../_components/reenviar-activacion'
import { cuentaPendienteDeActivar } from '@/lib/auth/activacion'
import styles from './ficha.module.css'

export const metadata = { title: 'Ficha de comercio · ORUM' }

type Sucursal = {
  id: number
  nombre: string | null
  direccion: string | null
  telefono: string | null
  activo: boolean
}

type Promocion = {
  id: number
  titulo: string
  valor: number | null
  activo: boolean
  tipo_beneficio_id: number
  dias_semana: number[] | null
  franjas_horarias?: unknown
}

type Parte = 'datos' | 'sucursales' | 'promociones' | 'imagenes' | 'resenas'

const PARTES: readonly Parte[] = ['datos', 'sucursales', 'promociones', 'imagenes', 'resenas']

/*
  LA FICHA DEL COMERCIO  ·  rediseño del panel (15/10/2026)
  ---------------------------------------------------------------------------
  Todo lo del comercio en un sitio, por pestañas (la propuesta aprobada,
  «Editar comercio»): Datos —que se editan aquí mismo, sin abrir otra
  ventana, con su «Tienes cambios sin guardar»—, Sucursales, Promociones e
  Imágenes, cada una con su recuento. La pestaña vive en la URL
  (`?pestana=`): se comparte, sobrevive a un refresco, y las acciones de
  sucursales y promociones vuelven a la suya.
*/
export default async function FichaComercioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pestana?: string; pagina?: string }>
}) {
  await requireRol('super_admin')
  const [{ id }, { pestana: pestanaRaw, pagina: paginaRaw }] = await Promise.all([params, searchParams])
  const comercioId = Number(id)
  const parte: Parte = PARTES.includes(pestanaRaw as Parte) ? (pestanaRaw as Parte) : 'datos'

  const admin = createAdminClient()
  const { data: comercio } = await admin
    .from('comercios')
    .select('id, perfil_id, nombre, descripcion, logo_url, portada_url, activo, indexable')
    .eq('id', comercioId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!comercio) notFound()

  const [
    categorias,
    filasCategoria,
    { data: sucursales },
    { data: promociones },
    { data: tipos },
    { count: fotosGaleria },
    imagenes,
    resenas,
    { count: cuentaResenas },
  ] = await Promise.all([
    cargarCategoriasConSubcategorias(admin),
    cargarFilasCategoria(admin, comercioId),
    admin
      .from('sucursales')
      .select('id, nombre, direccion, telefono, activo')
      .eq('comercio_id', comercioId)
      .is('deleted_at', null)
      .order('nombre'),
    admin
      .from('promociones')
      .select('*') // con `franjas_horarias` si la migración está aplicada
      .eq('comercio_id', comercioId)
      .is('deleted_at', null)
      .order('titulo'),
    admin.from('tipos_beneficio').select('id, nombre'),
    admin
      .from('comercio_imagenes')
      .select('id', { count: 'exact', head: true })
      .eq('comercio_id', comercioId),
    parte === 'imagenes' ? cargarImagenesComercio(comercioId) : Promise.resolve(null),
    // La lista completa solo con la pestaña abierta; el recuento de la
    // pestaña es una consulta barata (head). Si la tabla aún no existe, el
    // error se ignora y el recuento queda en 0.
    parte === 'resenas' ? obtenerResenasParaAdmin(comercioId, Number.parseInt(paginaRaw ?? '1', 10)) : Promise.resolve(null),
    admin.from('resenas').select('id', { count: 'exact', head: true }).eq('comercio_id', comercioId),
  ])

  // Cadena vacía y no '—': el valor va directo a un campo de formulario.
  let correo = ''
  let perfilActivo = false
  let pendienteDeActivar = false
  if (comercio.perfil_id) {
    const [{ data: authUser }, { data: perfil }] = await Promise.all([
      admin.auth.admin.getUserById(comercio.perfil_id),
      admin.from('perfiles').select('activo').eq('id', comercio.perfil_id).maybeSingle(),
    ])
    correo = authUser.user?.email ?? ''
    pendienteDeActivar = cuentaPendienteDeActivar(authUser.user)
    perfilActivo = perfil?.activo ?? false
  }

  // «Gastronomía (Pizzerías), Belleza»: todas las categorías del comercio.
  const etiquetaCategorias = filasCategoria
    .flatMap((f) => {
      const categoria = categorias.find((c) => c.id === f.categoriaId)
      if (!categoria) return []
      const sub = categoria.subcategorias.find((s) => s.id === f.subcategoriaId)?.nombre
      return [sub ? `${categoria.nombre} (${sub})` : categoria.nombre]
    })
    .join(', ')
  const listaSucursales = (sucursales ?? []) as Sucursal[]
  const listaPromociones = (promociones ?? []) as Promocion[]
  const totalFotos = (fotosGaleria ?? 0) + (comercio.portada_url ? 1 : 0)
  const nombreTipo = new Map((tipos ?? []).map((t) => [t.id, t.nombre]))
  const base = `/admin/comercios/${comercio.id}`

  const columnasSucursales: ReadonlyArray<Column<Sucursal>> = [
    { key: 'nombre', header: 'Sucursal', primary: true, cell: (s) => s.nombre ?? 'Sin nombre' },
    { key: 'direccion', header: 'Dirección', cell: (s) => s.direccion ?? '—' },
    { key: 'telefono', header: 'Teléfono', numeric: true, width: '140px', cell: (s) => s.telefono ?? '—' },
    {
      key: 'activo',
      header: 'Estado',
      width: '120px',
      cell: (s) => (
        <Badge tone={s.activo ? 'success' : 'neutral'} size="sm">
          {s.activo ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
  ]

  const columnasPromociones: ReadonlyArray<Column<Promocion>> = [
    { key: 'titulo', header: 'Promoción', primary: true, cell: (p) => {
        // Con franjas, sus días y sus horas; si no, los días (o nada: todo el día).
        const franjas = lineasFranjas(normalizarFranjas(p.franjas_horarias))
        const cuando = franjas.length > 0 ? franjas.join('; ') : textoDias(p.dias_semana)
        return cuando ? `${p.titulo} · ${cuando}` : p.titulo
      },
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: '160px',
      cell: (p) => nombreTipo.get(p.tipo_beneficio_id) ?? `Tipo #${p.tipo_beneficio_id}`,
    },
    {
      key: 'valor',
      header: 'Valor',
      numeric: true,
      width: '110px',
      cell: (p) => (p.valor === null ? '—' : p.valor.toLocaleString('es-CO')),
    },
    {
      key: 'activo',
      header: 'Estado',
      width: '120px',
      cell: (p) => (
        <Badge tone={p.activo ? 'success' : 'neutral'} size="sm">
          {p.activo ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
  ]

  const activas = listaSucursales.filter((s) => s.activo).length

  return (
    <div className={styles.ficha}>
      <header className={styles.cabecera}>
        <span className={styles.logo}>
          <ComercioLogo logoUrl={comercio.logo_url} nombre={comercio.nombre} />
        </span>
        <div className={styles.textos}>
          <TituloSeccion como="h1" tamano="pagina" texto={comercio.nombre} />
          <p className={styles.meta}>
            <Badge tone={comercio.activo ? 'success' : 'neutral'} size="sm">
              {comercio.activo ? 'Aliado activo' : 'Aliado inactivo'}
            </Badge>
            <span>
              {[etiquetaCategorias, `${activas} ${activas === 1 ? 'sucursal activa' : 'sucursales activas'}`]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        </div>
      </header>

      <Pestanas
        etiqueta="Partes del comercio"
        items={[
          { href: base, etiqueta: 'Datos', activa: parte === 'datos' },
          {
            href: `${base}?pestana=sucursales`,
            etiqueta: 'Sucursales',
            cuenta: listaSucursales.length,
            activa: parte === 'sucursales',
          },
          {
            href: `${base}?pestana=promociones`,
            etiqueta: 'Promociones',
            cuenta: listaPromociones.length,
            activa: parte === 'promociones',
          },
          {
            href: `${base}?pestana=imagenes`,
            etiqueta: 'Imágenes',
            cuenta: totalFotos,
            activa: parte === 'imagenes',
          },
          {
            href: `${base}?pestana=resenas`,
            etiqueta: 'Reseñas',
            cuenta: resenas?.disponible ? resenas.total : (cuentaResenas ?? 0),
            activa: parte === 'resenas',
          },
        ]}
      />

      {parte === 'datos' && (
        <div className={styles.datos}>
          <section className={styles.panel} aria-label="Datos del comercio">
            <EditarComercioForm
              enPagina
              comercio={{
                id: comercio.id,
                perfil_id: comercio.perfil_id,
                nombre: comercio.nombre,
                descripcion: comercio.descripcion,
                categorias: filasCategoria,
                indexable: comercio.indexable,
                correo,
              }}
              categorias={categorias}
            />
          </section>

          {/* Dos decisiones distintas, cada una con su explicación: mezclarlas
              lleva a desactivar el acceso creyendo que se retira al aliado. */}
          <section className={styles.estados} aria-labelledby="titulo-estado">
            <h2 id="titulo-estado" className={styles.tituloBloque}>
              Estado
            </h2>

            <div className={styles.estado}>
              <div className={styles.estadoTextos}>
                <span className={styles.estadoTitulo}>
                  Visible para los socios
                  <Badge tone={comercio.activo ? 'success' : 'neutral'} size="sm">
                    {comercio.activo ? 'Sí' : 'No'}
                  </Badge>
                </span>
                <span className={styles.estadoNota}>
                  Si lo retiras, deja de salir en el directorio y en la portada, pero no se borra nada.
                </span>
              </div>
              <form action={cambiarEstadoComercio}>
                <input type="hidden" name="id" value={comercio.id} />
                <input type="hidden" name="activar" value={comercio.activo ? 'false' : 'true'} />
                <Button type="submit" size="sm" variant={comercio.activo ? 'danger' : 'primary'}>
                  {comercio.activo ? 'Retirar del club' : 'Activar como aliado'}
                </Button>
              </form>
            </div>

            <div className={styles.estado}>
              <div className={styles.estadoTextos}>
                <span className={styles.estadoTitulo}>
                  Acceso a su herramienta
                  <Badge tone={perfilActivo ? 'success' : 'neutral'} size="sm">
                    {perfilActivo ? 'Activo' : 'Desactivado'}
                  </Badge>
                </span>
                <span className={styles.estadoNota}>
                  Si puede iniciar sesión para registrar ventas. Es independiente de seguir siendo aliado.
                </span>
                {pendienteDeActivar && (
                  <span className={styles.estadoNota}>Aún no ha activado su cuenta.</span>
                )}
              </div>
              <form action={cambiarEstadoAccesoComercio}>
                <input type="hidden" name="id" value={comercio.id} />
                <input type="hidden" name="perfil_id" value={comercio.perfil_id ?? ''} />
                <input type="hidden" name="activar" value={perfilActivo ? 'false' : 'true'} />
                <Button
                  type="submit"
                  size="sm"
                  variant={perfilActivo ? 'danger' : 'primary'}
                  disabled={!comercio.perfil_id}
                >
                  {perfilActivo ? 'Desactivar acceso' : 'Activar acceso'}
                </Button>
              </form>
              {/* Mientras no active su cuenta, se le puede mandar el correo otra vez. */}
              {pendienteDeActivar && perfilActivo && comercio.perfil_id && (
                <ReenviarActivacion perfilId={comercio.perfil_id} tamano="sm" />
              )}
            </div>
          </section>
        </div>
      )}

      {parte === 'sucursales' && (
        <section className={styles.seccion} aria-labelledby="titulo-sucursales">
          <div className={styles.barraSeccion}>
            <h2 id="titulo-sucursales" className={styles.tituloBloque}>
              Sucursales
            </h2>
            <Button href={`${base}/sucursales/nueva`} size="sm" icon={<MapPin size={15} />}>
              Nueva sucursal
            </Button>
          </div>
          <DataList
            caption={`Sucursales de ${comercio.nombre}`}
            items={listaSucursales}
            columns={columnasSucursales}
            getKey={(s) => s.id}
            // Activar/desactivar es la acción principal de estas filas: no
            // debe esconderse hasta que el ratón pase por encima.
            alwaysShowActions
            empty={
              <EmptyState
                title="Sin sucursales"
                description="Añade al menos una sucursal para que los miembros sepan dónde usar el beneficio."
                actions={
                  <Button href={`${base}/sucursales/nueva`} icon={<MapPin size={16} />}>
                    Nueva sucursal
                  </Button>
                }
              />
            }
            actions={(s) => (
              <>
                {/* El cambio de estado es una MUTACIÓN: va en su propio
                    formulario, no dentro del menú. */}
                <AccionEstado
                  activo={s.activo}
                  accion={cambiarEstadoSucursal}
                  campos={{ id: s.id, comercio_id: comercio.id }}
                  etiquetaDesactivar="Desactivar"
                  etiquetaActivar="Activar"
                />
                <DropdownMenu
                  trigger={
                    <Button
                      iconOnly
                      variant="ghost"
                      size="sm"
                      aria-label={`Acciones de ${s.nombre ?? 'la sucursal'}`}
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                  }
                >
                  <MenuItem href={`${base}/sucursales/${s.id}/editar`} icon={<Pencil size={16} />}>
                    Editar
                  </MenuItem>
                </DropdownMenu>
              </>
            )}
          />
        </section>
      )}

      {parte === 'promociones' && (
        <section className={styles.seccion} aria-labelledby="titulo-promociones">
          <div className={styles.barraSeccion}>
            <h2 id="titulo-promociones" className={styles.tituloBloque}>
              Promociones
            </h2>
            <Button href={`${base}/promociones/nueva`} size="sm" icon={<Tag size={15} />}>
              Nueva promoción
            </Button>
          </div>
          <DataList
            caption={`Promociones de ${comercio.nombre}`}
            items={listaPromociones}
            columns={columnasPromociones}
            getKey={(p) => p.id}
            alwaysShowActions
            empty={
              <EmptyState
                title="Sin promociones"
                description="Las promociones son el beneficio que ve el miembro. Crea la primera."
                actions={
                  <Button href={`${base}/promociones/nueva`} icon={<Tag size={16} />}>
                    Nueva promoción
                  </Button>
                }
              />
            }
            actions={(p) => (
              <>
                <AccionEstado
                  activo={p.activo}
                  accion={cambiarEstadoPromocion}
                  campos={{ id: p.id, comercio_id: comercio.id }}
                  etiquetaDesactivar="Desactivar"
                  etiquetaActivar="Activar"
                />
                <DropdownMenu
                  trigger={
                    <Button iconOnly variant="ghost" size="sm" aria-label={`Acciones de ${p.titulo}`}>
                      <MoreHorizontal size={16} />
                    </Button>
                  }
                >
                  <MenuItem href={`${base}/promociones/${p.id}/editar`} icon={<Pencil size={16} />}>
                    Editar
                  </MenuItem>
                </DropdownMenu>
              </>
            )}
          />
        </section>
      )}

      {parte === 'imagenes' && imagenes && (
        <section className={styles.panel} aria-label="Imágenes del comercio">
          <GestorImagenes
            comercioId={imagenes.id}
            nombre={imagenes.nombre}
            logoUrl={imagenes.logoUrl}
            portadaUrl={imagenes.portadaUrl}
            galeria={imagenes.galeria}
          />
        </section>
      )}

      {parte === 'resenas' && (
        <section className={styles.panel} aria-label="Reseñas del comercio">
          {resenas?.disponible ? (
            <>
            <ResenasAdmin
              comercioId={comercio.id}
              resumen={{ total: resenas.total, promedio: resenas.promedio }}
              resenas={resenas.resenas}
            />
            <Paginacion
              pagina={resenas.pagina}
              paginas={resenas.paginas}
              total={resenas.total}
              desde={resenas.desde}
              hasta={resenas.hasta}
              nombre={resenas.total === 1 ? 'reseña' : 'reseñas'}
              href={(n) => `${base}?pestana=resenas${n > 1 ? `&pagina=${n}` : ''}`}
            />
            </>
          ) : (
            <EmptyState
              title="Las reseñas todavía no están disponibles"
              description="No pudimos leer las reseñas. Inténtalo de nuevo más tarde."
            />
          )}
        </section>
      )}
    </div>
  )
}
