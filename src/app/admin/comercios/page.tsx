import { ChevronDown, Images, MapPin, MoreHorizontal, Search, Shapes, Store, Tag } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  contarPorPestanaComercio,
  enPestanaComercio,
  filtrarComercios,
  leerPestanaComercio,
  paginar,
  type FilaComercio,
  type PestanaComercio,
} from '@/lib/comercios/listado-admin'
import { leerPagina } from '@/lib/miembros/listado'
import { cargarFilasCategoriaDeTodos } from '@/lib/comercios/categorias-admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/layout'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { Paginacion } from '@/components/ui/paginacion'
import { Pestanas, type TonoPestana } from '@/components/ui/pestanas'
import styles from '@/styles/lista-panel.module.css'

export const metadata = { title: 'Comercios · ORUM' }

/** Una cifra de la fila; el cero se apaga para que salte a la vista lo que sí hay. */
function Cifra({ n }: { n: number }) {
  return (
    <span className={[styles.cifraFila, n === 0 && styles.cifraCero].filter(Boolean).join(' ')}>{n}</span>
  )
}

const COLUMNAS: ReadonlyArray<Column<FilaComercio>> = [
  {
    key: 'nombre',
    header: 'Comercio',
    primary: true,
    cell: (c) => (
      <span className={styles.celdaNombre}>
        <span className={styles.logoFila}>
          <ComercioLogo logoUrl={c.logoUrl} nombre={c.nombre} />
        </span>
        <span className={styles.nombreBloque}>
          <span className={styles.nombre}>{c.nombre}</span>
          {c.categorias.length > 0 && (
            <span className={styles.subtitulo}>{c.categorias.join(', ')}</span>
          )}
        </span>
      </span>
    ),
  },
  {
    key: 'sucursales',
    header: 'Sucursales',
    numeric: true,
    width: '120px',
    cell: (c) => <Cifra n={c.sucursales} />,
  },
  {
    key: 'promociones',
    header: 'Promociones',
    numeric: true,
    width: '130px',
    cell: (c) => <Cifra n={c.promociones} />,
  },
  {
    key: 'activo',
    header: 'Aliado',
    width: '130px',
    cell: (c) => (
      // `comercios.activo` responde a «¿sigue siendo aliado del club?», que es
      // distinto de si su cuenta puede iniciar sesión (`perfiles.activo`).
      <Badge tone={c.activo ? 'success' : 'neutral'} size="sm">
        {c.activo ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
]

const PESTANAS: { clave: PestanaComercio; etiqueta: string; tono: TonoPestana }[] = [
  { clave: 'todos', etiqueta: 'Todos', tono: 'neutro' },
  { clave: 'activos', etiqueta: 'Activos', tono: 'exito' },
  { clave: 'sin-promociones', etiqueta: 'Sin promociones', tono: 'aviso' },
  { clave: 'inactivos', etiqueta: 'Inactivos', tono: 'vacio' },
]

type Params = { q?: string; estado?: string; categoria?: string; pagina?: string }

/*
  LA LISTA DE COMERCIOS  ·  rediseño del panel (15/10/2026)
  ---------------------------------------------------------------------------
  El diseño de la de miembros: pestañas por estado con recuento, buscador,
  categoría y páginas de 25, todo en la URL. Cada fila dice cuántas
  sucursales y promociones ACTIVAS tiene: un aliado sin promociones no le
  ofrece nada al socio, y por eso tiene pestaña propia.
*/
export default async function ComerciosPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireRol('super_admin')
  const params = await searchParams

  const admin = createAdminClient()
  const [
    { data: comercios },
    { data: categorias },
    { data: sucursales },
    { data: promociones },
    { data: subcategorias },
    filasCategoria,
  ] = await Promise.all([
      admin
        .from('comercios')
        .select('id, nombre, logo_url, activo')
        .is('deleted_at', null),
      admin.from('categorias').select('id, nombre').order('nombre'),
      admin.from('sucursales').select('comercio_id').eq('activo', true).is('deleted_at', null),
      admin.from('promociones').select('comercio_id').eq('activo', true).is('deleted_at', null),
      admin.from('subcategorias').select('id, subcategoria'),
      cargarFilasCategoriaDeTodos(admin),
    ])

  const contar = (filas: { comercio_id: number }[] | null) => {
    const m = new Map<number, number>()
    for (const f of filas ?? []) m.set(f.comercio_id, (m.get(f.comercio_id) ?? 0) + 1)
    return m
  }
  const nSucursales = contar(sucursales)
  const nPromociones = contar(promociones)
  const nombreCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nombre.trim()]))
  const nombreSubcategoria = new Map((subcategorias ?? []).map((s) => [s.id, s.subcategoria.trim()]))

  const filas: FilaComercio[] = (comercios ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    logoUrl: c.logo_url,
    categoriaIds: (filasCategoria.get(c.id) ?? []).map((f) => f.categoriaId),
    // «Gastronomía (Pizzerías)», una por categoría: así se ve de un vistazo qué tiene asignado.
    categorias: (filasCategoria.get(c.id) ?? []).flatMap((f) => {
      const nombre = nombreCategoria.get(f.categoriaId)
      if (!nombre) return []
      const sub = f.subcategoriaId ? nombreSubcategoria.get(f.subcategoriaId) : null
      return [sub ? `${nombre} (${sub})` : nombre]
    }),
    activo: c.activo,
    sucursales: nSucursales.get(c.id) ?? 0,
    promociones: nPromociones.get(c.id) ?? 0,
  }))

  const busqueda = (params.q ?? '').trim()
  const pestana = leerPestanaComercio(params.estado)
  const categoriaId =
    Number.isInteger(Number(params.categoria)) && Number(params.categoria) > 0
      ? Number(params.categoria)
      : null

  // Los recuentos respetan la búsqueda y la categoría, no la pestaña.
  const base = filtrarComercios(filas, { pestana: 'todos', busqueda, categoriaId })
  const cuentas = contarPorPestanaComercio(base)
  const pagina = paginar(
    base.filter((f) => enPestanaComercio(f, pestana)),
    leerPagina(params.pagina),
  )

  const href = (cambios: Partial<Params>) => {
    const p = new URLSearchParams()
    const valores: Params = {
      q: busqueda || undefined,
      estado: pestana === 'todos' ? undefined : pestana,
      categoria: categoriaId ? String(categoriaId) : undefined,
      ...cambios,
    }
    for (const [k, v] of Object.entries(valores)) if (v) p.set(k, v)
    const qs = p.toString()
    return qs ? `/admin/comercios?${qs}` : '/admin/comercios'
  }

  // Solo las categorías que algún comercio usa: elegir una vacía no sirve de nada.
  const usadas = new Set(filas.flatMap((f) => f.categoriaIds))
  const categoriasFiltro = (categorias ?? []).filter((c) => usadas.has(c.id))
  const categoriaActual = categoriasFiltro.find((c) => c.id === categoriaId)
  const hayFiltros = !!busqueda || categoriaId !== null

  return (
    <>
      <PageHeader
        title="Comercios aliados"
        description="La red de comercios donde los miembros usan sus beneficios."
        actions={
          <Button href="/admin/comercios/nuevo" icon={<Store size={16} />}>
            Crear comercio
          </Button>
        }
      />

      <div className={styles.lista}>
        <Pestanas
          etiqueta="Filtrar por estado"
          items={PESTANAS.map((p) => ({
            href: href({ estado: p.clave === 'todos' ? undefined : p.clave, pagina: undefined }),
            etiqueta: p.etiqueta,
            cuenta: cuentas[p.clave],
            tono: p.tono,
            activa: p.clave === pestana,
          }))}
        />

        <div className={styles.herramientas}>
          <form method="get" className={styles.buscar} role="search">
            <Input
              name="q"
              defaultValue={busqueda}
              placeholder="Nombre o categoría"
              aria-label="Buscar comercios"
              startIcon={<Search size={16} />}
              autoComplete="off"
              enterKeyHint="search"
            />
            {pestana !== 'todos' && <input type="hidden" name="estado" value={pestana} />}
            {categoriaId && <input type="hidden" name="categoria" value={categoriaId} />}
          </form>

          {categoriasFiltro.length > 1 && (
            <DropdownMenu
              trigger={
                <Button variant="secondary" size="sm" icon={<Shapes size={15} aria-hidden="true" />}>
                  <span className={styles.prefijoFiltro}>Categoría: </span>
                  <strong className={styles.valorFiltro}>{categoriaActual?.nombre ?? 'Todas'}</strong>
                  <ChevronDown size={15} aria-hidden="true" />
                </Button>
              }
            >
              <MenuItem
                href={href({ categoria: undefined, pagina: undefined })}
                selected={categoriaId === null}
              >
                Todas las categorías
              </MenuItem>
              {categoriasFiltro.map((c) => (
                <MenuItem
                  key={c.id}
                  href={href({ categoria: String(c.id), pagina: undefined })}
                  selected={c.id === categoriaId}
                >
                  {c.nombre}
                </MenuItem>
              ))}
            </DropdownMenu>
          )}

          {hayFiltros && (
            <Button
              href={href({ q: undefined, categoria: undefined, pagina: undefined })}
              variant="ghost"
              size="sm"
            >
              Quitar filtros
            </Button>
          )}
        </div>

        <DataList
          caption="Comercios aliados"
          items={pagina.filas}
          columns={COLUMNAS}
          getKey={(c) => c.id}
          rowHref={(c) => `/admin/comercios/${c.id}`}
          empty={
            filas.length === 0 ? (
              <EmptyState
                title="Aún no hay comercios"
                description="Crea el primer comercio aliado para empezar a cargar sus promociones."
                actions={
                  <Button href="/admin/comercios/nuevo" icon={<Store size={16} />}>
                    Crear comercio
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="Sin resultados"
                description={
                  busqueda
                    ? `Ningún comercio coincide con «${busqueda}» aquí.`
                    : 'No hay comercios en esta pestaña con los filtros puestos.'
                }
                actions={
                  <Button href="/admin/comercios" variant="secondary">
                    Ver todos
                  </Button>
                }
              />
            )
          }
          actions={(c) => (
            <DropdownMenu
              trigger={
                <Button iconOnly variant="ghost" size="sm" aria-label={`Acciones de ${c.nombre}`}>
                  <MoreHorizontal size={16} />
                </Button>
              }
            >
              <MenuItem href={`/admin/comercios/${c.id}`} icon={<Store size={16} />}>
                Abrir ficha
              </MenuItem>
              <MenuSeparator />
              <MenuItem href={`/admin/comercios/${c.id}?pestana=sucursales`} icon={<MapPin size={16} />}>
                Sucursales
              </MenuItem>
              <MenuItem href={`/admin/comercios/${c.id}?pestana=promociones`} icon={<Tag size={16} />}>
                Promociones
              </MenuItem>
              <MenuItem href={`/admin/comercios/${c.id}?pestana=imagenes`} icon={<Images size={16} />}>
                Imágenes
              </MenuItem>
            </DropdownMenu>
          )}
        />

        <Paginacion
          {...pagina}
          nombre={pagina.total === 1 ? 'comercio' : 'comercios'}
          href={(n) => href({ pagina: n > 1 ? String(n) : undefined })}
        />
      </div>
    </>
  )
}
