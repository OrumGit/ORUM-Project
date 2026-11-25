import Link from 'next/link'
import { CalendarRange, Filter, Receipt } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cifra } from '@/components/ui/cifra'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Field } from '@/components/ui/field'
import { Grid } from '@/components/ui/layout'
import { Paginacion } from '@/components/ui/paginacion'
import { ContenidoPestana, Pestanas } from '@/components/ui/pestanas'
import { SelectorFecha } from '@/components/ui/selector-fecha'
import {
  resumirVentasEmpleado,
  textoTipoVenta,
  ventasPorDia,
  ventasPorPlan,
  type GrupoVentasEmpleado,
  type VentaEmpleado,
} from '@/lib/metricas/ventas-empleado'
import { PERIODOS_CON_HOY, parametrosPeriodo, textoPeriodo, type RangoPeriodo } from '@/lib/shared/periodo'
import { paginar } from '@/lib/shared/paginacion'
import styles from '@/styles/periodo-panel.module.css'

/*
  LAS VENTAS DE UN EMPLEADO  ·  su página en el panel (25/11/2026)
  ---------------------------------------------------------------------------
  «Si realizó 13 ventas, que sepa exactamente cuándo fueron: hora, día,
  membresía, persona; con filtros para la última semana, días, meses». Las
  mismas piezas y la misma hoja que las ventas de un comercio
  (`periodo-panel.module.css`): el periodo (pestañas, con «Hoy», y «entre
  fechas»), cuatro cifras, por día, por plan y TODAS las ventas de a 25.
  Todo sale de las MISMAS filas.
*/

const ETIQUETA_PESTANAS = 'Periodo de las ventas'
const POR_PAGINA = 25
const DIAS_POR_PAGINA = 10

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/* `created_at` es timestamptz: se lee en la hora de Colombia. */
const DIA_SEMANA = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'short' })
const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
})

/* Las fechas CIVILES ('YYYY-MM-DD': el día de un grupo, la vigencia) se
   construyen a medianoche UTC y se leen en UTC: en Bogotá caerían un día antes. */
const DIA_LARGO = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const DIA_CORTO = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

/** «24 nov 2026»: sin los «de» que pone es-CO, para que la vigencia quepa en un renglón. */
function diaCorto(iso: string): string {
  const partes = DIA_CORTO.formatToParts(civil(iso))
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === tipo)?.value ?? ''
  return `${valor('day')} ${valor('month').replace('.', '')} ${valor('year')}`
}

function civil(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

const plural = (n: number, uno: string, varios: string) =>
  `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`

const Monto = ({ valor }: { valor: number }) => <span className={styles.monto}>{PESOS.format(valor)}</span>

const columnasGrupo = (
  titulo: string,
  nombre: (g: GrupoVentasEmpleado) => React.ReactNode,
): ReadonlyArray<Column<GrupoVentasEmpleado>> => [
  { key: 'nombre', header: titulo, primary: true, cell: nombre },
  {
    key: 'vendidas',
    header: 'Vendidas',
    numeric: true,
    width: '100px',
    cell: (g) => <span className={styles.monto}>{g.vendidas.toLocaleString('es-CO')}</span>,
  },
  {
    key: 'cortesias',
    header: 'Cortesías',
    numeric: true,
    width: '100px',
    cell: (g) =>
      g.cortesias > 0 ? (
        <span className={styles.monto}>{g.cortesias.toLocaleString('es-CO')}</span>
      ) : (
        <span className={styles.apagado}>—</span>
      ),
  },
  { key: 'ingreso', header: 'Dinero', numeric: true, width: '140px', cell: (g) => <Monto valor={g.ingreso} /> },
]

const COLUMNAS_DIA = columnasGrupo('Día', (g) => (
  <span className={styles.fecha}>{DIA_LARGO.format(civil(g.clave))}</span>
))
const COLUMNAS_PLAN = columnasGrupo('Plan', (g) => <span className={styles.nombreComercio}>{g.nombre}</span>)

/* Cinco columnas, como las demás tablas de periodo: con más se cortaban a
   1024 px con la barra lateral. La hora va bajo el día, el número bajo el
   miembro y si fue nuevo o renovación bajo el plan. */
const COLUMNAS_VENTAS: ReadonlyArray<Column<VentaEmpleado>> = [
  {
    key: 'fecha',
    header: 'Cuándo',
    width: '130px',
    cell: (v) => {
      const instante = new Date(v.fechaHora)
      return (
        <span className={styles.dosLineas}>
          <span className={styles.fecha}>{FECHA_CORTA.format(instante)}</span>
          <span className={styles.linea2}>
            {DIA_SEMANA.format(instante)} · {HORA.format(instante)}
          </span>
        </span>
      )
    },
  },
  {
    key: 'miembro',
    header: 'Miembro',
    primary: true,
    cell: (v) => (
      <span className={styles.dosLineas}>
        <Link href={`/OrumAdminLogin/miembros/${v.miembroId}`} className={styles.nombreComercio}>
          {v.miembro}
        </Link>
        {v.numero && <span className={styles.linea2}>Nº {v.numero}</span>}
      </span>
    ),
  },
  {
    key: 'membresia',
    header: 'Membresía',
    cell: (v) => (
      <span className={styles.dosLineas}>
        <span>{v.plan || 'Sin plan'}</span>
        <span className={styles.linea2Libre}>{textoTipoVenta(v.tipo)}</span>
      </span>
    ),
  },
  {
    key: 'valor',
    header: 'Valor',
    numeric: true,
    width: '130px',
    cell: (v) => (v.esCortesia ? <span className={styles.apagado}>Cortesía</span> : <Monto valor={v.precio} />),
  },
  {
    key: 'vigencia',
    header: 'Vigencia',
    hideOnMobile: true,
    width: '200px',
    cell: (v) => (
      <span className={styles.linea2Libre}>
        {diaCorto(v.inicio)} – {diaCorto(v.fin)}
      </span>
    ),
  },
]

export function VentasEmpleado({
  perfilId,
  nombre,
  rango,
  ventas,
  pagina,
  paginaDias,
}: {
  perfilId: string
  nombre: string
  rango: RangoPeriodo
  /** `null` = no se pudieron leer. */
  ventas: VentaEmpleado[] | null
  /** La página de «Todas sus ventas» (`?p=`) y la de «Por día» (`?pd=`). */
  pagina: number
  paginaDias: number
}) {
  const base = `/OrumAdminLogin/usuarios/${perfilId}`
  const enlace = (extra: Record<string, string>) => {
    const q = new URLSearchParams(extra).toString()
    return q ? `${base}?${q}` : base
  }

  const resumen = ventas ? resumirVentasEmpleado(ventas) : null
  const hoja = paginar(ventas ?? [], pagina, POR_PAGINA)
  const hojaDias = paginar(ventas ? ventasPorDia(ventas) : [], paginaDias, DIAS_POR_PAGINA)

  /** Una página de una tabla: conserva el periodo y la página de la otra, y lleva a SU tabla. */
  const hrefPagina = (tabla: 'p' | 'pd', ancla: string) => (n: number) => {
    const actuales = { p: hoja.pagina, pd: hojaDias.pagina, [tabla]: n }
    const extra: Record<string, string> = { ...parametrosPeriodo(rango) }
    if (actuales.p > 1) extra.p = String(actuales.p)
    if (actuales.pd > 1) extra.pd = String(actuales.pd)
    return `${enlace(extra)}#${ancla}`
  }

  return (
    <div className={styles.cuerpo}>
      <div className={styles.filtros}>
        <Pestanas
          etiqueta={ETIQUETA_PESTANAS}
          items={PERIODOS_CON_HOY.map((p) => ({
            href: enlace(p.clave === 'todo' ? {} : { periodo: p.clave }),
            etiqueta: p.etiqueta,
            activa: rango.periodo === p.clave,
          }))}
        />

        {/* «Más filtros»: cualquier rango de fechas, con el calendario del sitio. */}
        <form method="get" action={base} className={styles.rango}>
          <div className={styles.campo}>
            <Field label="Desde">
              <SelectorFecha
                name="desde"
                etiqueta="Desde"
                defaultValue={rango.periodo === 'rango' ? (rango.desde ?? '') : ''}
                placeholder="Elige el día"
              />
            </Field>
          </div>
          <div className={styles.campo}>
            <Field label="Hasta">
              <SelectorFecha
                name="hasta"
                etiqueta="Hasta"
                defaultValue={rango.periodo === 'rango' ? (rango.hasta ?? '') : ''}
                placeholder="Elige el día"
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary" size="sm" icon={<Filter size={15} />}>
            Ver entre fechas
          </Button>
        </form>
      </div>

      <p className={styles.periodo}>
        <CalendarRange size={15} aria-hidden="true" />
        {textoPeriodo(rango, 'Desde que empezó a vender')}
      </p>

      <ContenidoPestana
        etiqueta={ETIQUETA_PESTANAS}
        clave={`${rango.periodo}:${rango.desde ?? ''}:${rango.hasta ?? ''}`}
      >
        {!ventas || !resumen ? (
          <Alert tone="danger">
            No pudimos cargar las ventas de este usuario. Recarga la página para intentarlo de nuevo.
          </Alert>
        ) : resumen.registros === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Receipt aria-hidden="true" />}
              title={rango.periodo === 'todo' ? 'Todavía no ha vendido membresías' : 'Sin ventas en este periodo'}
              description={
                rango.periodo === 'todo'
                  ? `Cuando ${nombre} registre un miembro o renueve una membresía, aquí verás cada venta: cuándo, a quién, qué plan y por cuánto.`
                  : 'Prueba con otro periodo o con «Todo».'
              }
            />
          </Card>
        ) : (
          <div className={styles.cuerpo}>
            <Grid min="190px">
              <Card>
                <Cifra
                  etiqueta="Membresías vendidas"
                  valor={resumen.vendidas.toLocaleString('es-CO')}
                  nota={`${plural(resumen.nuevas, 'nueva', 'nuevas')} · ${plural(resumen.renovaciones, 'renovación', 'renovaciones')}`}
                  size="sm"
                />
              </Card>
              <Card>
                <Cifra
                  etiqueta="Dinero de sus ventas"
                  valor={PESOS.format(resumen.ingreso)}
                  nota={
                    resumen.promedio !== null
                      ? `${PESOS.format(resumen.promedio)} por venta, en promedio`
                      : 'Solo dio cortesías'
                  }
                  size="sm"
                />
              </Card>
              <Card>
                <Cifra
                  etiqueta="Cortesías"
                  valor={resumen.cortesias.toLocaleString('es-CO')}
                  nota="No cuentan como venta ni suman dinero"
                  size="sm"
                />
              </Card>
              <Card>
                <Cifra
                  etiqueta="Días con ventas"
                  valor={resumen.dias.toLocaleString('es-CO')}
                  nota="Días en que registró algo"
                  size="sm"
                />
              </Card>
            </Grid>

            <div id="todas" className={`${styles.bloque} ${styles.ancla}`}>
              {/* Incluye las cortesías (con «Cortesía» en el valor): por eso dice
                  «membresías» y no «ventas», que arriba son solo las cobradas. */}
              <h2 className={styles.subtitulo}>Cada membresía que registró</h2>
              <DataList
                caption={`Membresías registradas por ${nombre}`}
                items={hoja.filas}
                columns={COLUMNAS_VENTAS}
                getKey={(v) => v.id}
              />
              <Paginacion
                {...hoja}
                nombre={hoja.total === 1 ? 'membresía' : 'membresías'}
                href={hrefPagina('p', 'todas')}
              />
            </div>

            <div id="por-dia" className={`${styles.bloque} ${styles.ancla}`}>
              <h2 className={styles.subtitulo}>Por día</h2>
              <DataList
                caption={`Ventas de ${nombre} por día`}
                items={hojaDias.filas}
                columns={COLUMNAS_DIA}
                getKey={(g) => g.clave}
              />
              <Paginacion
                {...hojaDias}
                nombre={hojaDias.total === 1 ? 'día' : 'días'}
                href={hrefPagina('pd', 'por-dia')}
              />
            </div>

            <div className={styles.bloque}>
              <h2 className={styles.subtitulo}>Por plan</h2>
              <DataList
                caption={`Ventas de ${nombre} por plan`}
                items={ventasPorPlan(ventas)}
                columns={COLUMNAS_PLAN}
                getKey={(g) => g.clave}
              />
            </div>
          </div>
        )}
      </ContenidoPestana>
    </div>
  )
}
