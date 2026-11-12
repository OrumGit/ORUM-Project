import Link from 'next/link'
import { CalendarRange, Filter, Receipt } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cifra } from '@/components/ui/cifra'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Grid } from '@/components/ui/layout'
import { Paginacion } from '@/components/ui/paginacion'
import { ContenidoPestana, Pestanas } from '@/components/ui/pestanas'
import { textoMetodoRegistro } from '@/lib/miembros/compras-miembro'
import { POR_PAGINA_METRICAS } from '@/lib/metricas/metricas'
import {
  resumirVentasComercio,
  ventasPorPromocion,
  ventasPorSede,
  type GrupoVentas,
  type VentaComercio,
} from '@/lib/comercios/ventas-comercio'
import { PERIODOS, parametrosPeriodo, textoPeriodo, type RangoPeriodo } from '@/lib/shared/periodo'
import { paginar } from '@/lib/shared/paginacion'
import styles from '@/styles/periodo-panel.module.css'

/*
  LAS VENTAS DEL COMERCIO  ·  pestaña de su ficha en el panel (11/11/2026)
  ---------------------------------------------------------------------------
  «El cliente también quiere esos datos para los comercios: cuánto han
  vendido, cuánto dinero ha entrado, cuánto ha sido de descuento». La otra
  cara de las compras de un miembro, con las mismas piezas y la misma hoja
  (`periodo-panel.module.css`): el periodo (pestañas + «entre fechas»),
  cuatro cifras —ventas · entró · descuento · sin descuento—, por sede, por
  promoción y todas las ventas de a 10. Todo sale de las MISMAS filas.
*/

const ETIQUETA_PESTANAS = 'Periodo de las ventas'

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/* `fecha_hora` es timestamptz: se lee en la hora de Colombia. */
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

const Monto = ({ valor, ahorro }: { valor: number; ahorro?: boolean }) => (
  <span className={[styles.monto, ahorro && styles.ahorro].filter(Boolean).join(' ')}>
    {PESOS.format(valor)}
  </span>
)

const columnasGrupo = (titulo: string): ReadonlyArray<Column<GrupoVentas>> => [
  { key: 'nombre', header: titulo, primary: true, cell: (g) => <span className={styles.nombreComercio}>{g.nombre}</span> },
  {
    key: 'ventas',
    header: 'Ventas',
    numeric: true,
    width: '100px',
    cell: (g) => <span className={styles.monto}>{g.ventas.toLocaleString('es-CO')}</span>,
  },
  { key: 'entro', header: 'Entró', numeric: true, width: '140px', cell: (g) => <Monto valor={g.entro} /> },
  { key: 'descuento', header: 'Descuento', numeric: true, width: '130px', cell: (g) => <Monto valor={g.descuento} ahorro /> },
]

const COLUMNAS_SEDE = columnasGrupo('Sede')
const COLUMNAS_PROMOCION = columnasGrupo('Beneficio')

/* Cinco columnas, como las compras del miembro: con siete se cortaban a
   1024 px con la barra lateral. La hora va bajo el día, la sede y cómo lo
   encontró la caja bajo el socio, y el valor sin descuento bajo lo que pagó. */
const COLUMNAS_VENTAS: ReadonlyArray<Column<VentaComercio>> = [
  {
    key: 'fecha',
    header: 'Fecha',
    width: '120px',
    cell: (v) => (
      <span className={styles.dosLineas}>
        <span className={styles.fecha}>{FECHA_CORTA.format(new Date(v.fechaHora))}</span>
        <span className={styles.linea2}>{HORA.format(new Date(v.fechaHora))}</span>
      </span>
    ),
  },
  {
    key: 'socio',
    header: 'Socio',
    primary: true,
    cell: (v) => (
      <span className={styles.dosLineas}>
        <Link href={`/OrumAdminLogin/miembros/${v.miembroId}`} className={styles.nombreComercio}>
          {v.miembro}
        </Link>
        <span className={styles.linea2Libre}>
          {[v.sede ? `Sede ${v.sede}` : null, textoMetodoRegistro(v.metodo)].filter(Boolean).join(' · ')}
        </span>
      </span>
    ),
  },
  {
    key: 'beneficio',
    header: 'Beneficio',
    hideOnMobile: true,
    cell: (v) => v.promocion ?? <span className={styles.apagado}>Sin promoción</span>,
  },
  { key: 'descuento', header: 'Descuento', numeric: true, width: '110px', cell: (v) => <Monto valor={v.descuento} ahorro /> },
  {
    key: 'pago',
    header: 'Pagó',
    numeric: true,
    width: '130px',
    cell: (v) => (
      <span className={styles.dosLineas}>
        <Monto valor={v.valorFinal} />
        <span className={styles.linea2}>de {PESOS.format(v.valorCompra)}</span>
      </span>
    ),
  },
]

export function VentasComercio({
  comercioId,
  nombre,
  rango,
  ventas,
  pagina,
}: {
  comercioId: number
  nombre: string
  rango: RangoPeriodo
  /** `null` = no se pudieron leer. */
  ventas: VentaComercio[] | null
  pagina: number
}) {
  const base = `/OrumAdminLogin/comercios/${comercioId}`
  const enlace = (extra: Record<string, string>) =>
    `${base}?${new URLSearchParams({ pestana: 'ventas', ...extra }).toString()}`

  const resumen = ventas ? resumirVentasComercio(ventas) : null
  const hoja = paginar(ventas ?? [], pagina, POR_PAGINA_METRICAS)

  return (
    <div className={styles.cuerpo}>
      <div className={styles.filtros}>
        <Pestanas
          etiqueta={ETIQUETA_PESTANAS}
          items={PERIODOS.map((p) => ({
            href: enlace(p.clave === 'todo' ? {} : { periodo: p.clave }),
            etiqueta: p.etiqueta,
            activa: rango.periodo === p.clave,
          }))}
        />

        {/* «Más filtros»: cualquier rango de fechas. */}
        <form method="get" action={base} className={styles.rango}>
          <input type="hidden" name="pestana" value="ventas" />
          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor="ventas-desde">
              Desde
            </label>
            <Input
              id="ventas-desde"
              type="date"
              name="desde"
              defaultValue={rango.periodo === 'rango' ? (rango.desde ?? '') : ''}
            />
          </div>
          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor="ventas-hasta">
              Hasta
            </label>
            <Input
              id="ventas-hasta"
              type="date"
              name="hasta"
              defaultValue={rango.periodo === 'rango' ? (rango.hasta ?? '') : ''}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" icon={<Filter size={15} />}>
            Ver entre fechas
          </Button>
        </form>
      </div>

      <p className={styles.periodo}>
        <CalendarRange size={15} aria-hidden="true" />
        {textoPeriodo(rango, 'Desde que es aliado')}
      </p>

      <ContenidoPestana
        etiqueta={ETIQUETA_PESTANAS}
        clave={`${rango.periodo}:${rango.desde ?? ''}:${rango.hasta ?? ''}`}
      >
        {!ventas || !resumen ? (
          <Alert tone="danger">
            No pudimos cargar las ventas de este comercio. Recarga la página para intentarlo de nuevo.
          </Alert>
        ) : resumen.ventas === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Receipt aria-hidden="true" />}
              title={rango.periodo === 'todo' ? 'Todavía no ha vendido' : 'Sin ventas en este periodo'}
              description={
                rango.periodo === 'todo'
                  ? `Cuando un socio use su membresía en ${nombre}, aquí verás cada venta, lo que entró y el descuento.`
                  : 'Prueba con otro periodo o con «Todo».'
              }
            />
          </Card>
        ) : (
          <div className={styles.cuerpo}>
            <Grid min="190px">
              <Card>
                <Cifra
                  etiqueta="Ventas"
                  valor={resumen.ventas.toLocaleString('es-CO')}
                  nota={resumen.socios === 1 ? 'A 1 socio' : `A ${resumen.socios.toLocaleString('es-CO')} socios`}
                  size="sm"
                />
              </Card>
              <Card>
                <Cifra
                  etiqueta="Dinero que entró"
                  valor={PESOS.format(resumen.entro)}
                  nota={
                    resumen.ventaPromedio !== null
                      ? `${PESOS.format(resumen.ventaPromedio)} por venta, en promedio`
                      : 'Lo que pagaron los socios'
                  }
                  size="sm"
                />
              </Card>
              <Card>
                <Cifra
                  etiqueta="Descuento entregado"
                  valor={PESOS.format(resumen.descuento)}
                  nota={
                    resumen.porcentajeDescuento !== null
                      ? `El ${resumen.porcentajeDescuento} % del valor de las ventas`
                      : 'Lo que rebajó a los socios'
                  }
                  size="sm"
                />
              </Card>
              <Card>
                <Cifra
                  etiqueta="Valor sin descuento"
                  valor={PESOS.format(resumen.sinDescuento)}
                  nota="Lo que habrían pagado sin ORUM"
                  size="sm"
                />
              </Card>
            </Grid>

            <div className={styles.bloque}>
              <h3 className={styles.subtitulo}>Por sede</h3>
              <DataList
                caption={`Ventas de ${nombre} por sede`}
                items={ventasPorSede(ventas)}
                columns={COLUMNAS_SEDE}
                getKey={(g) => g.clave}
              />
            </div>

            <div className={styles.bloque}>
              <h3 className={styles.subtitulo}>Por beneficio</h3>
              <DataList
                caption={`Ventas de ${nombre} por beneficio`}
                items={ventasPorPromocion(ventas)}
                columns={COLUMNAS_PROMOCION}
                getKey={(g) => g.clave}
              />
            </div>

            <div className={styles.bloque}>
              <h3 className={styles.subtitulo}>Todas las ventas</h3>
              <DataList caption={`Ventas de ${nombre}`} items={hoja.filas} columns={COLUMNAS_VENTAS} getKey={(v) => v.id} />
              <Paginacion
                {...hoja}
                nombre={hoja.total === 1 ? 'venta' : 'ventas'}
                href={(n) => enlace({ ...parametrosPeriodo(rango), ...(n > 1 ? { pv: String(n) } : {}) })}
              />
            </div>
          </div>
        )}
      </ContenidoPestana>
    </div>
  )
}
