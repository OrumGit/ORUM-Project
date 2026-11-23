import { Hash, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cifra } from '@/components/ui/cifra'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Grid, PageHeader } from '@/components/ui/layout'
import { DropdownMenu, MenuItem } from '@/components/ui/menu'
import {
  listarNumerosRegistro,
  resumirPozo,
  type FiltroPozo,
  type NumeroRegistro,
} from '@/lib/miembros/pozo-numeros'
import { eliminarNumeroRegistro } from './actions'
import styles from './numeros.module.css'

export const metadata = { title: 'Números de registro · ORUM' }

/* `creado_at` es un timestamptz real: se formatea en Bogotá. */
const SELLO = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const FILTROS: ReadonlyArray<{ valor: FiltroPozo; etiqueta: string }> = [
  { valor: 'disponibles', etiqueta: 'Disponibles' },
  { valor: 'asignados', etiqueta: 'Asignados' },
  { valor: 'todos', etiqueta: 'Todos' },
]

function normalizarFiltro(valor: string | undefined): FiltroPozo {
  return valor === 'asignados' || valor === 'todos' ? valor : 'disponibles'
}

const COLUMNAS: ReadonlyArray<Column<NumeroRegistro>> = [
  {
    key: 'numero',
    header: 'Número',
    primary: true,
    numeric: true,
    width: '160px',
    cell: (n) => n.numero,
  },
  {
    key: 'estado',
    header: 'Estado',
    cell: (n) =>
      n.asignadoA ? (
        <Badge tone="success" size="sm">
          Asignado · {n.asignadoA}
        </Badge>
      ) : (
        <Badge tone="neutral" size="sm">
          Disponible
        </Badge>
      ),
  },
  {
    key: 'creado',
    header: 'Cargado',
    numeric: true,
    width: '140px',
    hideOnMobile: true,
    cell: (n) => SELLO.format(new Date(n.creadoAt)),
  },
]

export default async function NumerosRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  // Solo super_admin: el empleado usa los números al vender, no los gestiona.
  await requireRol('super_admin')

  const { estado } = await searchParams
  const filtro = normalizarFiltro(estado)

  const [resumen, numeros] = await Promise.all([
    resumirPozo(),
    listarNumerosRegistro(filtro),
  ])

  const pozoVacio = resumen.disponibles === 0 && resumen.asignados === 0

  return (
    <>
      <PageHeader
        title="Números de registro"
        description="Los carnés vienen numerados. Carga aquí sus números y, al registrar un miembro, se le asigna uno de los disponibles."
        actions={
          <Button href="/OrumAdminLogin/miembros/numeros/cargar" icon={<Plus size={16} />}>
            Cargar rango
          </Button>
        }
      />

      {pozoVacio ? (
        <EmptyState
          icon={<Hash aria-hidden="true" />}
          title="El pozo está vacío"
          description="Carga el primer rango de números. Sin números disponibles no se pueden registrar miembros nuevos."
          actions={
            <Button href="/OrumAdminLogin/miembros/numeros/cargar" icon={<Plus size={16} />}>
              Cargar rango
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <Grid min="200px">
              <Cifra
                etiqueta="Disponibles"
                valor={resumen.disponibles.toLocaleString('es-CO')}
                nota="Listos para asignar"
                size="sm"
              />
              <Cifra
                etiqueta="Asignados"
                valor={resumen.asignados.toLocaleString('es-CO')}
                nota="Ya entregados a un miembro"
                size="sm"
              />
            </Grid>
          </Card>

          <nav className={styles.filtros} aria-label="Filtrar números">
            {FILTROS.map((f) => (
              <Button
                key={f.valor}
                href={
                  f.valor === 'disponibles'
                    ? '/OrumAdminLogin/miembros/numeros'
                    : `/OrumAdminLogin/miembros/numeros?estado=${f.valor}`
                }
                variant={f.valor === filtro ? 'secondary' : 'ghost'}
                size="sm"
                // El filtro activo se marcaba SOLO con la variante de color, que
                // no llega al lector de pantalla: `aria-current="page"` lo dice.
                aria-current={f.valor === filtro ? 'page' : undefined}
              >
                {f.etiqueta}
              </Button>
            ))}
          </nav>

          <DataList
            caption="Números de registro del pozo"
            items={numeros}
            columns={COLUMNAS}
            getKey={(n) => n.numero}
            empty={
              <EmptyState
                title="Sin números en esta vista"
                description={
                  filtro === 'disponibles'
                    ? 'No quedan números disponibles. Carga otro rango.'
                    : 'Ningún número coincide con este filtro.'
                }
              />
            }
            actions={(n) =>
              n.asignadoA ? null : (
                <form action={eliminarNumeroRegistro}>
                  <input type="hidden" name="numero" value={n.numero} />
                  <DropdownMenu
                    trigger={
                      <Button
                        iconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={`Acciones del número ${n.numero}`}
                      >
                        <MoreHorizontal size={16} />
                      </Button>
                    }
                  >
                    <MenuItem submit icon={<Trash2 size={16} />}>
                      Quitar del pozo
                    </MenuItem>
                  </DropdownMenu>
                </form>
              )
            }
          />
        </>
      )}
    </>
  )
}
