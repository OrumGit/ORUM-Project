import {
  ArrowUpDown,
  Camera,
  ChevronDown,
  CreditCard,
  Hash,
  Layers,
  MoreHorizontal,
  Pencil,
  Search,
  UserPlus,
} from 'lucide-react'
import type { PlanFiltro } from '@/lib/miembros/cargar-listado'
import {
  contarPorPestana,
  filtrar,
  leerOrden,
  leerPagina,
  leerPestana,
  ordenar,
  paginar,
  type FilaMiembro,
  type OrdenMiembros,
  type PestanaEstado,
} from '@/lib/miembros/listado'
import { Avatar } from '@/components/ui/avatar'
import { Badge, StatusBadge, VenceEn } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/layout'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { Paginacion } from '@/components/ui/paginacion'
import { Pestanas, type TonoPestana } from '@/components/ui/pestanas'
import styles from '@/styles/lista-panel.module.css'


const COLUMNAS: ReadonlyArray<Column<FilaMiembro>> = [
  {
    key: 'nombre',
    header: 'Miembro',
    primary: true,
    cell: (m) => (
      <span className={styles.celdaNombre}>
        {/* Decorativo: el nombre va escrito justo al lado. */}
        <Avatar nombre={m.nombre} src={m.fotoUrl} size="sm" decorativo />
        <span className={styles.nombreBloque}>
          <span className={styles.nombre}>{m.nombre}</span>
          {m.telefono && <span className={styles.subtitulo}>{m.telefono}</span>}
        </span>
      </span>
    ),
  },
  {
    key: 'numero',
    header: 'Nº membresía',
    numeric: true,
    width: '150px',
    cell: (m) => m.numeroMembresia,
  },
  {
    key: 'cedula',
    header: 'Cédula',
    numeric: true,
    width: '140px',
    cell: (m) => m.cedula,
  },
  {
    key: 'plan',
    header: 'Plan',
    hideOnMobile: true,
    width: '130px',
    cell: (m) => m.plan ?? '—',
  },
  {
    key: 'estado',
    header: 'Estado',
    width: '240px',
    cell: (m) =>
      m.estado ? (
        <span className={styles.celdaEstado}>
          <StatusBadge estado={m.estado} size="sm" />
          <VenceEn estado={m.estado} />
        </span>
      ) : (
        <Badge tone="neutral" size="sm">
          Sin membresía
        </Badge>
      ),
  },
]

/*
  La membresía tiene DOS estados, vigente o vencida (16/10/2026: «solo
  existen 2 membresías, ¿por qué en los filtros aparecen más?»). «Vencen
  pronto» era un subconjunto de las vigentes y se leía como un tercer
  estado: lo próximo a vencer está en la portada y en «Ordenar: Vencen
  antes». «Sin membresía» solo sale si hay alguno, que sería un dato a
  corregir.
*/
const PESTANAS: { clave: PestanaEstado; etiqueta: string; tono: TonoPestana }[] = [
  { clave: 'todos', etiqueta: 'Todos', tono: 'neutro' },
  { clave: 'vigentes', etiqueta: 'Vigentes', tono: 'exito' },
  { clave: 'vencidas', etiqueta: 'Vencidas', tono: 'peligro' },
  { clave: 'sin', etiqueta: 'Sin membresía', tono: 'vacio' },
]

const ORDENES: { clave: OrdenMiembros; etiqueta: string }[] = [
  { clave: 'recientes', etiqueta: 'Más recientes' },
  { clave: 'nombre', etiqueta: 'Nombre (A–Z)' },
  { clave: 'vencimiento', etiqueta: 'Vencen antes' },
]

export type ParamsMiembros = { q?: string; estado?: string; plan?: string; orden?: string; pagina?: string }

/*
  LA LISTA DE MIEMBROS  ·  rediseño del panel (15/10/2026)
  ---------------------------------------------------------------------------
  Pestañas por estado con su recuento, un buscador, el filtro de plan, el
  orden y páginas de 25. Todo vive en la URL (se comparte, sobrevive a un
  refresco y funciona sin JavaScript). La lógica de qué filas salen es pura
  y está probada (`lib/miembros/listado.ts`).
*/
export function ListaMiembros({
  filas,
  planes,
  params,
  esSuperAdmin,
}: {
  filas: FilaMiembro[]
  planes: PlanFiltro[]
  params: ParamsMiembros
  esSuperAdmin: boolean
}) {
  const busqueda = (params.q ?? '').trim()
  const pestana = leerPestana(params.estado)
  const orden = leerOrden(params.orden)
  const planId = Number.isInteger(Number(params.plan)) && Number(params.plan) > 0 ? Number(params.plan) : null

  // Los recuentos de las pestañas respetan la búsqueda y el plan, no la pestaña.
  const base = filtrar(filas, { pestana: 'todos', busqueda, planId })
  const cuentas = contarPorPestana(base)
  const visibles = ordenar(filtrar(base, { pestana, busqueda: '', planId: null }), orden)
  const pagina = paginar(visibles, leerPagina(params.pagina))

  /** La dirección de la lista con algunos filtros cambiados (y la página a 1). */
  const href = (cambios: Partial<ParamsMiembros>) => {
    const p = new URLSearchParams()
    const valores: ParamsMiembros = {
      q: busqueda || undefined,
      estado: pestana === 'todos' ? undefined : pestana,
      plan: planId ? String(planId) : undefined,
      orden: orden === 'recientes' ? undefined : orden,
      ...cambios,
    }
    for (const [k, v] of Object.entries(valores)) if (v) p.set(k, v)
    const qs = p.toString()
    return qs ? `/admin/miembros?${qs}` : '/admin/miembros'
  }

  const planActual = planes.find((p) => p.id === planId)
  const ordenActual = ORDENES.find((o) => o.clave === orden) ?? ORDENES[0]
  const hayFiltros = !!busqueda || planId !== null

  return (
    <>
      <PageHeader
        title="Miembros"
        description="El estado ya tiene en cuenta la fecha de vencimiento."
        actions={
          esSuperAdmin ? (
            <Button href="/admin/miembros/numeros" variant="secondary" icon={<Hash size={16} />}>
              Números de registro
            </Button>
          ) : undefined
        }
      />

      <div className={styles.lista}>
        <Pestanas
          etiqueta="Filtrar por estado"
          items={PESTANAS.filter((p) => p.clave !== 'sin' || cuentas.sin > 0 || pestana === 'sin').map((p) => ({
            href: href({ estado: p.clave === 'todos' ? undefined : p.clave, pagina: undefined }),
            etiqueta: p.etiqueta,
            cuenta: cuentas[p.clave],
            tono: p.tono,
            activa: p.clave === pestana,
          }))}
        />

        {/* Las herramientas: buscar, plan y orden. El buscador es un
            formulario GET que conserva los demás filtros. */}
        <div className={styles.herramientas}>
          <form method="get" className={styles.buscar} role="search">
            <Input
              name="q"
              defaultValue={busqueda}
              placeholder="Nombre, cédula o nº de membresía"
              aria-label="Buscar miembros"
              startIcon={<Search size={16} />}
              autoComplete="off"
              enterKeyHint="search"
            />
            {pestana !== 'todos' && <input type="hidden" name="estado" value={pestana} />}
            {planId && <input type="hidden" name="plan" value={planId} />}
            {orden !== 'recientes' && <input type="hidden" name="orden" value={orden} />}
          </form>

          {planes.length > 1 && (
            <DropdownMenu
              trigger={
                <Button variant="secondary" size="sm" icon={<Layers size={15} aria-hidden="true" />}>
                  <span className={styles.prefijoFiltro}>Plan: </span>
                  <strong className={styles.valorFiltro}>{planActual?.nombre ?? 'Todos'}</strong>
                  <ChevronDown size={15} aria-hidden="true" />
                </Button>
              }
            >
              <MenuItem href={href({ plan: undefined, pagina: undefined })} selected={planId === null}>
                Todos los planes
              </MenuItem>
              {planes.map((p) => (
                <MenuItem
                  key={p.id}
                  href={href({ plan: String(p.id), pagina: undefined })}
                  selected={p.id === planId}
                >
                  {p.nombre}
                </MenuItem>
              ))}
            </DropdownMenu>
          )}

          <DropdownMenu
            align="end"
            trigger={
              <Button variant="secondary" size="sm" icon={<ArrowUpDown size={15} aria-hidden="true" />} className={styles.ordenar}>
                <span className={styles.prefijoFiltro}>Ordenar: </span>
                <strong className={styles.valorFiltro}>{ordenActual.etiqueta}</strong>
                <ChevronDown size={15} aria-hidden="true" />
              </Button>
            }
          >
            {ORDENES.map((o) => (
              <MenuItem
                key={o.clave}
                href={href({ orden: o.clave === 'recientes' ? undefined : o.clave, pagina: undefined })}
                selected={o.clave === orden}
              >
                {o.etiqueta}
              </MenuItem>
            ))}
          </DropdownMenu>

          {hayFiltros && (
            <Button href={href({ q: undefined, plan: undefined, pagina: undefined })} variant="ghost" size="sm">
              Quitar filtros
            </Button>
          )}
        </div>

        <DataList
          caption="Miembros del club"
          items={pagina.filas}
          columns={COLUMNAS}
          getKey={(m) => m.id}
          rowHref={(m) => `/admin/miembros/${m.id}`}
          empty={
            filas.length === 0 ? (
              <EmptyState
                title="Aún no hay miembros"
                description="Registra el primer cliente y véndele su membresía."
                actions={
                  <Button href="/admin/miembros/nuevo" icon={<UserPlus size={16} />}>
                    Registrar miembro
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="Sin resultados"
                description={
                  busqueda
                    ? `Ningún miembro coincide con «${busqueda}» aquí. Prueba con el número de membresía o la cédula, o mira en «Todos».`
                    : 'No hay miembros en esta pestaña con los filtros puestos.'
                }
                actions={
                  <Button href="/admin/miembros" variant="secondary">
                    Ver todos
                  </Button>
                }
              />
            )
          }
          actions={(m) => (
            <DropdownMenu
              trigger={
                <Button iconOnly variant="ghost" size="sm" aria-label={`Acciones de ${m.nombre}`}>
                  <MoreHorizontal size={16} />
                </Button>
              }
            >
              <MenuItem href={`/admin/miembros/${m.id}/renovar`} icon={<CreditCard size={16} />}>
                Renovar membresía
              </MenuItem>
              <MenuSeparator />
              <MenuItem href={`/admin/miembros/${m.id}/editar`} icon={<Pencil size={16} />}>
                Editar datos
              </MenuItem>
              <MenuItem href={`/admin/miembros/${m.id}/foto`} icon={<Camera size={16} />}>
                Cambiar foto
              </MenuItem>
            </DropdownMenu>
          )}
        />

        <Paginacion
          {...pagina}
          nombre={pagina.total === 1 ? 'miembro' : 'miembros'}
          href={(n) => href({ pagina: n > 1 ? String(n) : undefined })}
        />
      </div>
    </>
  )
}
