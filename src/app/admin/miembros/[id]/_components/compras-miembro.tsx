import { CalendarRange, Filter, ShoppingBag } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cifra } from '@/components/ui/cifra'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Grid, Section } from '@/components/ui/layout'
import { Paginacion } from '@/components/ui/paginacion'
import { ContenidoPestana, Pestanas } from '@/components/ui/pestanas'
import {
  PERIODOS,
  comprasPorComercio,
  resumirCompras,
  textoMetodoRegistro,
  textoPeriodo,
  type CompraPorComercio,
  type RangoCompras,
} from '@/lib/miembros/compras-miembro'
import type { CompraPanel } from '@/lib/miembros/compras-miembro-datos'
import { paginar } from '@/lib/shared/paginacion'
import lista from '@/styles/lista-panel.module.css'
import styles from './compras-miembro.module.css'

/*
  LAS COMPRAS DEL MIEMBRO  ·  en su ficha del panel (11/11/2026)
  ---------------------------------------------------------------------------
  «Cuántas compras ha realizado, en qué comercio y toda la información
  importante de la venta; cuánto se ha ahorrado en el mes, la semana, el
  año y más filtros, y cuánto se ha gastado».

  Arriba el periodo (pestañas + «entre fechas»), luego cuatro cifras
  —compras, gastó, se ahorró y lo que habría pagado sin ORUM—, dónde compra
  (un renglón por comercio) y todas las compras, de a 25. Todo sale de las
  MISMAS filas (`cargarComprasMiembro`), así que las cifras, el ranking y la
  tabla nunca se contradicen. El periodo y la página viven en la URL.
*/

const ETIQUETA_PESTANAS = 'Periodo de las compras'
const ANCLA = 'compras'

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/* `fecha_hora` es timestamptz: se lee en la hora de Colombia. */
const HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  hour: 'numeric',
  minute: '2-digit',
})

/* «11/11/2026»: en la tabla, la fecha corta deja sitio a los montos. */
const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const FECHA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function CeldaComercio({
  nombre,
  logoUrl,
  detalle,
}: {
  nombre: string
  logoUrl: string | null
  detalle?: string | null
}) {
  return (
    <span className={lista.celdaNombre}>
      <span className={lista.logoFila}>
        <ComercioLogo logoUrl={logoUrl} nombre={nombre} />
      </span>
      <span className={lista.nombreBloque}>
        {/* Parten en dos líneas en vez de ensanchar la tabla. */}
        <span className={styles.nombreComercio}>{nombre}</span>
        {detalle && <span className={styles.linea2Libre}>{detalle}</span>}
      </span>
    </span>
  )
}

const Monto = ({ valor, ahorro }: { valor: number; ahorro?: boolean }) => (
  <span className={[styles.monto, ahorro && styles.ahorro].filter(Boolean).join(' ')}>
    {PESOS.format(valor)}
  </span>
)

const COLUMNAS_COMERCIOS: ReadonlyArray<Column<CompraPorComercio>> = [
  {
    key: 'comercio',
    header: 'Comercio',
    primary: true,
    cell: (c) => (
      <CeldaComercio
        nombre={c.comercio}
        logoUrl={c.logoUrl}
        detalle={`Última compra: ${FECHA.format(new Date(c.ultima))}`}
      />
    ),
  },
  {
    key: 'compras',
    header: 'Compras',
    numeric: true,
    width: '110px',
    cell: (c) => <span className={styles.monto}>{c.compras.toLocaleString('es-CO')}</span>,
  },
  { key: 'gastado', header: 'Gastó', numeric: true, width: '140px', cell: (c) => <Monto valor={c.gastado} /> },
  {
    key: 'ahorrado',
    header: 'Se ahorró',
    numeric: true,
    width: '140px',
    cell: (c) => <Monto valor={c.ahorrado} ahorro />,
  },
]

/*
  Cinco columnas, no siete: con la barra lateral, a 1024 px el contenido
  mide ~760 y siete columnas se salían (se cortaban «Pagó» y la caja). Lo
  que se quitó como columna sigue a la vista: la hora bajo el día, cómo lo
  encontró la caja bajo la sede y lo que costaba sin ORUM bajo lo que pagó.
*/
const COLUMNAS_COMPRAS: ReadonlyArray<Column<CompraPanel>> = [
  {
    key: 'fecha',
    header: 'Fecha',
    width: '120px',
    cell: (c) => (
      <span className={styles.dosLineas}>
        <span className={styles.fecha}>{FECHA_CORTA.format(new Date(c.fechaHora))}</span>
        <span className={styles.linea2}>{HORA.format(new Date(c.fechaHora))}</span>
      </span>
    ),
  },
  {
    key: 'comercio',
    header: 'Comercio',
    primary: true,
    cell: (c) => (
      <CeldaComercio
        nombre={c.comercio}
        logoUrl={c.logoUrl}
        detalle={[c.sucursal ? `Sede ${c.sucursal}` : null, textoMetodoRegistro(c.metodo)]
          .filter(Boolean)
          .join(' · ')}
      />
    ),
  },
  {
    key: 'promocion',
    header: 'Beneficio',
    hideOnMobile: true,
    cell: (c) => c.promocion ?? <span className={styles.apagado}>Sin promoción</span>,
  },
  {
    key: 'descuento',
    header: 'Se ahorró',
    numeric: true,
    width: '110px',
    cell: (c) => <Monto valor={c.ahorro} ahorro />,
  },
  {
    key: 'pago',
    header: 'Pagó',
    numeric: true,
    width: '130px',
    cell: (c) => (
      <span className={styles.dosLineas}>
        <Monto valor={c.valorFinal} />
        <span className={styles.linea2}>de {PESOS.format(c.valorCompra)}</span>
      </span>
    ),
  },
]

export function ComprasMiembro({
  miembroId,
  nombre,
  rango,
  compras,
  pagina,
}: {
  miembroId: number
  nombre: string
  rango: RangoCompras
  /** `null` = no se pudieron leer. */
  compras: CompraPanel[] | null
  pagina: number
}) {
  const base = `/admin/miembros/${miembroId}`

  /** La dirección con el periodo actual y lo que se cambie, siempre a la sección. */
  const conPeriodo = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (rango.periodo === 'rango') {
      if (rango.desde) p.set('desde', rango.desde)
      if (rango.hasta) p.set('hasta', rango.hasta)
    } else if (rango.periodo !== 'todo') {
      p.set('periodo', rango.periodo)
    }
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v)
    const qs = p.toString()
    return `${base}${qs ? `?${qs}` : ''}#${ANCLA}`
  }

  const resumen = compras ? resumirCompras(compras) : null
  const porComercio = compras ? comprasPorComercio(compras) : []
  const hoja = paginar(compras ?? [], pagina)

  return (
    <div id={ANCLA} className={styles.ancla}>
      <Section title="Compras en comercios">
        <div className={styles.filtros}>
          <Pestanas
            etiqueta={ETIQUETA_PESTANAS}
            items={PERIODOS.map((p) => ({
              href: p.clave === 'todo' ? base : `${base}?periodo=${p.clave}`,
              etiqueta: p.etiqueta,
              activa: rango.periodo === p.clave,
            }))}
          />

          {/* «Más filtros»: cualquier rango de fechas. */}
          <form method="get" action={`${base}#${ANCLA}`} className={styles.rango}>
            <div className={styles.campo}>
              <label className={styles.etiqueta} htmlFor="compras-desde">
                Desde
              </label>
              <Input
                id="compras-desde"
                type="date"
                name="desde"
                defaultValue={rango.periodo === 'rango' ? (rango.desde ?? '') : ''}
              />
            </div>
            <div className={styles.campo}>
              <label className={styles.etiqueta} htmlFor="compras-hasta">
                Hasta
              </label>
              <Input
                id="compras-hasta"
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
          {textoPeriodo(rango)}
        </p>

        <ContenidoPestana
          etiqueta={ETIQUETA_PESTANAS}
          clave={`${rango.periodo}:${rango.desde ?? ''}:${rango.hasta ?? ''}`}
        >
          {!compras || !resumen ? (
            <Alert tone="danger">
              No pudimos cargar las compras de este miembro. Recarga la página para intentarlo de nuevo.
            </Alert>
          ) : resumen.compras === 0 ? (
            <Card padding="none">
              <EmptyState
                icon={<ShoppingBag aria-hidden="true" />}
                title={rango.periodo === 'todo' ? 'Todavía no ha comprado' : 'Sin compras en este periodo'}
                description={
                  rango.periodo === 'todo'
                    ? `Cuando ${nombre} use su membresía en un comercio, aquí verás cada compra y cuánto se ahorró.`
                    : 'Prueba con otro periodo o con «Todo».'
                }
              />
            </Card>
          ) : (
            <div className={styles.cuerpo}>
              <Grid min="190px">
                <Card>
                  <Cifra
                    etiqueta="Compras"
                    valor={resumen.compras.toLocaleString('es-CO')}
                    nota={resumen.comercios === 1 ? 'En 1 comercio' : `En ${resumen.comercios} comercios`}
                    size="sm"
                  />
                </Card>
                <Card>
                  <Cifra
                    etiqueta="Gastó"
                    valor={PESOS.format(resumen.gastado)}
                    nota="Lo que pagó en la caja"
                    size="sm"
                  />
                </Card>
                <Card>
                  <Cifra
                    etiqueta="Se ahorró"
                    valor={PESOS.format(resumen.ahorrado)}
                    nota={
                      resumen.porcentajeAhorro !== null
                        ? `El ${resumen.porcentajeAhorro} % de lo que habría pagado`
                        : 'Con sus beneficios ORUM'
                    }
                    size="sm"
                  />
                </Card>
                <Card>
                  <Cifra
                    etiqueta="Sin ORUM habría pagado"
                    valor={PESOS.format(resumen.sinOrum)}
                    nota="El valor de sus compras"
                    size="sm"
                  />
                </Card>
              </Grid>

              <div className={styles.bloque}>
                <h3 className={styles.subtitulo}>Dónde compra</h3>
                <DataList
                  caption={`Comercios donde compró ${nombre}`}
                  items={porComercio}
                  columns={COLUMNAS_COMERCIOS}
                  getKey={(c) => c.clave}
                  rowHref={(c) => (c.comercioId !== null ? `/admin/comercios/${c.comercioId}` : undefined)}
                />
              </div>

              <div className={styles.bloque}>
                <h3 className={styles.subtitulo}>Todas las compras</h3>
                <DataList
                  caption={`Compras de ${nombre}`}
                  items={hoja.filas}
                  columns={COLUMNAS_COMPRAS}
                  getKey={(c) => c.id}
                />
                <Paginacion
                  {...hoja}
                  nombre={hoja.total === 1 ? 'compra' : 'compras'}
                  href={(n) => conPeriodo({ pagina: n > 1 ? String(n) : undefined })}
                />
              </div>
            </div>
          )}
        </ContenidoPestana>
      </Section>
    </div>
  )
}
