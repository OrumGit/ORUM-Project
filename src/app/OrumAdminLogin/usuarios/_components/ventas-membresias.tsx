import Link from 'next/link'
import { CalendarRange, Filter, Receipt } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cifra } from '@/components/ui/cifra'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { SelectorFecha } from '@/components/ui/selector-fecha'
import { Grid } from '@/components/ui/layout'
import { Paginacion } from '@/components/ui/paginacion'
import { ContenidoPestana, Pestanas } from '@/components/ui/pestanas'
import {
  resumirVentasMembresias,
  textoTipoMembresia,
  type VentaMembresia,
} from '@/lib/metricas/ventas-membresias'
import { PERIODOS, parametrosPeriodo, textoPeriodo, type RangoPeriodo } from '@/lib/shared/periodo'
import { paginar } from '@/lib/shared/paginacion'
import styles from '@/styles/periodo-panel.module.css'

/*
  LAS MEMBRESÍAS VENDIDAS POR UN EMPLEADO  ·  Usuarios (26/11/2026)
  ---------------------------------------------------------------------------
  «Quiero ver algo similar a la bitácora: que hizo la venta de una membresía
  por x o y valor, y que se pueda filtrar por fechas». Las mismas piezas que
  las ventas de un comercio (periodo, cifras, tabla de a 25) y la misma hoja.
  Las cifras y la tabla salen de las MISMAS filas.
*/

const ETIQUETA_PESTANAS = 'Periodo de las membresías vendidas'

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/* `created_at` es timestamptz: se lee en la hora de Colombia. */
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

const TONO_TIPO: Record<string, BadgeTone> = {
  Nueva: 'success',
  Renovación: 'info',
  Cortesía: 'neutral',
}

const COLUMNAS: ReadonlyArray<Column<VentaMembresia>> = [
  {
    key: 'fecha',
    header: 'Fecha',
    width: '130px',
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
        <span className={styles.linea2Libre}>Membresía {v.numeroMembresia}</span>
      </span>
    ),
  },
  { key: 'plan', header: 'Plan', hideOnMobile: true, cell: (v) => v.plan },
  {
    key: 'tipo',
    header: 'Tipo',
    width: '130px',
    cell: (v) => {
      const texto = textoTipoMembresia(v.tipo, v.esCortesia)
      return (
        <Badge tone={TONO_TIPO[texto] ?? 'neutral'} size="sm">
          {texto}
        </Badge>
      )
    },
  },
  {
    key: 'valor',
    header: 'Valor',
    numeric: true,
    width: '130px',
    // Una cortesía no se cobra: se dice con palabras, no con un $0.
    cell: (v) => (v.esCortesia ? <span>Sin cobro</span> : <span>{PESOS.format(v.precio)}</span>),
  },
]

export function VentasMembresias({
  base,
  titulo,
  sinVentasTexto,
  rango,
  ventas,
  pagina,
}: {
  /** Ruta de la página (sin consulta): los filtros y la paginación la completan. */
  base: string
  /** Quién vendió, para los títulos («Membresías vendidas por Ana Pérez»). */
  titulo: string
  /** Lo que se dice cuando no hay nada en el periodo «Todo». */
  sinVentasTexto: string
  rango: RangoPeriodo
  /** `null` = no se pudieron leer. */
  ventas: VentaMembresia[] | null
  pagina: number
}) {
  const enlace = (extra: Record<string, string>) => `${base}?${new URLSearchParams(extra).toString()}`

  const resumen = ventas ? resumirVentasMembresias(ventas) : null
  const hoja = paginar(ventas ?? [], pagina)

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

        {/* «Entre fechas»: cualquier rango de días. */}
        <form method="get" action={base} className={styles.rango}>
          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor="membresias-desde">
              Desde
            </label>
            <SelectorFecha id="membresias-desde" name="desde" etiqueta="Desde" placeholder="Elige el día" defaultValue={rango.periodo === 'rango' ? (rango.desde ?? '') : ''} />
          </div>
          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor="membresias-hasta">
              Hasta
            </label>
            <SelectorFecha id="membresias-hasta" name="hasta" etiqueta="Hasta" placeholder="Elige el día" defaultValue={rango.periodo === 'rango' ? (rango.hasta ?? '') : ''} />
          </div>
          <Button type="submit" variant="secondary" size="sm" icon={<Filter size={15} />}>
            Ver entre fechas
          </Button>
        </form>
      </div>

      <p className={styles.periodo}>
        <CalendarRange size={15} aria-hidden="true" />
        {textoPeriodo(rango, 'Desde que existe el panel')}
      </p>

      <ContenidoPestana
        etiqueta={ETIQUETA_PESTANAS}
        clave={`${rango.periodo}:${rango.desde ?? ''}:${rango.hasta ?? ''}`}
      >
        {!ventas || !resumen ? (
          <Alert tone="danger">
            No pudimos cargar las membresías vendidas. Recarga la página para intentarlo de nuevo.
          </Alert>
        ) : ventas.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Receipt aria-hidden="true" />}
              title={rango.periodo === 'todo' ? 'Todavía no hay membresías vendidas' : 'Sin ventas en este periodo'}
              description={
                rango.periodo === 'todo' ? sinVentasTexto : 'Prueba con otro periodo o con «Todo».'
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
                  nota={
                    resumen.cortesias > 0
                      ? `Más ${resumen.cortesias.toLocaleString('es-CO')} ${resumen.cortesias === 1 ? 'cortesía' : 'cortesías'} (no suman)`
                      : 'Cobradas en el periodo'
                  }
                  size="sm"
                />
              </Card>
              <Card>
                <Cifra
                  etiqueta="Monto cobrado"
                  valor={PESOS.format(resumen.monto)}
                  nota={
                    resumen.vendidas > 0
                      ? `${PESOS.format(Math.round(resumen.monto / resumen.vendidas))} por membresía, en promedio`
                      : 'Lo que pagaron los socios'
                  }
                  size="sm"
                />
              </Card>
            </Grid>

            <div className={styles.bloque}>
              <h3 className={styles.subtitulo}>Todas las membresías</h3>
              <DataList caption={`Membresías ${titulo}`} items={hoja.filas} columns={COLUMNAS} getKey={(v) => v.id} />
              <Paginacion
                {...hoja}
                nombre={hoja.total === 1 ? 'membresía' : 'membresías'}
                href={(n) => enlace({ ...parametrosPeriodo(rango), ...(n > 1 ? { p: String(n) } : {}) })}
              />
            </div>
          </div>
        )}
      </ContenidoPestana>
    </div>
  )
}
