import { BarChart3 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { inicioDiaBogota, finDiaBogota } from '@/lib/shared/fecha'
import {
  POR_PAGINA_METRICAS,
  detallarVentas,
  totalesVentas,
  type DetalleVenta,
} from '@/lib/metricas/metricas'
import { Cifra } from '@/components/ui/cifra'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Grid } from '@/components/ui/layout'
import { Paginacion } from '@/components/ui/paginacion'
import { leerEnPaginas } from '@/lib/shared/leer-en-paginas'
import { rangoDePagina } from '@/lib/shared/paginacion'
import styles from './detalle-ventas-comercio.module.css'

/** Pesos colombianos sin decimales: aquí nadie cobra centavos. */
const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/* `fecha_hora` es timestamptz: se lee en la zona del negocio, no en la del servidor. */
const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/* 'YYYY-MM-DD' civil: se construye en UTC y se lee en UTC (ver CLAUDE.md, «Fechas»). */
const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return FECHA_LARGA.format(new Date(Date.UTC(a, m - 1, d)))
}

const COLUMNAS: ReadonlyArray<Column<DetalleVenta>> = [
  { key: 'fecha', header: 'Fecha', primary: true, cell: (r) => FECHA_HORA.format(new Date(r.fechaHora)) },
  { key: 'miembro', header: 'Miembro', cell: (r) => r.miembroNombre },
  { key: 'sucursal', header: 'Sucursal', hideOnMobile: true, cell: (r) => r.sucursalNombre },
  {
    key: 'compra',
    header: 'Compra',
    numeric: true,
    cell: (r) => <span className={styles.monto}>{PESOS.format(r.valorCompra)}</span>,
  },
  {
    key: 'descuento',
    header: 'Descuento',
    numeric: true,
    cell: (r) => <span className={styles.monto}>{PESOS.format(r.valorDescuento)}</span>,
  },
  {
    key: 'final',
    header: 'Total',
    numeric: true,
    cell: (r) => <span className={styles.monto}>{PESOS.format(r.valorFinal)}</span>,
  },
  {
    key: 'promocion',
    header: 'Promoción',
    hideOnMobile: true,
    cell: (r) =>
      r.promocionTitulo ?? <span className={styles.sinPromocion}>Sin promoción</span>,
  },
]

/**
 * Ventas de un comercio en un periodo. Lo comparten la página real y su gemela
 * interceptada bajo `@modal`, así que el título y el contenedor los pone quien
 * lo usa. Devuelve `null` si el comercio no existe.
 *
 * De a 10 (11/11/2026). Los totales se leen ENTEROS por lotes
 * (`leerEnPaginas`: antes una sola consulta se cortaba en 1000 filas y la
 * cifra salía corta) y la tabla pide a la base SOLO su página (`.range`).
 */
export async function cargarDetalleVentasComercio(
  comercioId: number,
  desde: string,
  hasta: string,
  paginaPedida = 1,
) {
  const admin = createAdminClient()

  const [{ data: comercio }, { data: sucursales }] = await Promise.all([
    admin.from('comercios').select('id, nombre').eq('id', comercioId).maybeSingle(),
    // Sin filtrar `deleted_at`: una sucursal dada de baja conserva sus ventas históricas.
    admin.from('sucursales').select('id, nombre').eq('comercio_id', comercioId),
  ])
  if (!comercio) return null

  const sucursalIds = (sucursales ?? []).map((s) => s.id)

  // Totales de TODO el periodo, no solo de la página visible.
  const importes = sucursalIds.length
    ? await leerEnPaginas((inicio, fin) =>
        admin
          .from('ventas')
          .select('valor_final, valor_descuento')
          .in('sucursal_id', sucursalIds)
          .gte('fecha_hora', inicioDiaBogota(desde))
          .lte('fecha_hora', finDiaBogota(hasta))
          .order('id', { ascending: true })
          .range(inicio, fin),
      )
    : []
  const totales = totalesVentas(importes)
  const pagina = rangoDePagina(totales.cantidad, paginaPedida, POR_PAGINA_METRICAS)

  const { data: ultimas } =
    sucursalIds.length && totales.cantidad > 0
      ? await admin
          .from('ventas')
          .select(
            'id, miembro_id, sucursal_id, promocion_id, valor_compra, valor_descuento, valor_final, fecha_hora',
          )
          .in('sucursal_id', sucursalIds)
          .gte('fecha_hora', inicioDiaBogota(desde))
          .lte('fecha_hora', finDiaBogota(hasta))
          .order('fecha_hora', { ascending: false })
          // Desempate: dos ventas del mismo instante no bailan entre páginas.
          .order('id', { ascending: false })
          .range(pagina.inicio, pagina.fin)
      : { data: [] }

  const filas = ultimas ?? []
  const miembroIds = [...new Set(filas.map((v) => v.miembro_id))]
  const promocionIds = [
    ...new Set(filas.map((v) => v.promocion_id).filter((id): id is number => id !== null)),
  ]

  const [{ data: miembros }, { data: promociones }] = await Promise.all([
    miembroIds.length
      ? admin.from('miembros').select('id, nombres, apellidos').in('id', miembroIds)
      : Promise.resolve({ data: [] }),
    promocionIds.length
      ? admin.from('promociones').select('id, titulo').in('id', promocionIds)
      : Promise.resolve({ data: [] }),
  ])

  return {
    comercio,
    desde,
    hasta,
    totales,
    pagina,
    ventas: detallarVentas(filas, sucursales ?? [], miembros ?? [], promociones ?? []),
  }
}

export type DetalleVentasComercioDatos = NonNullable<
  Awaited<ReturnType<typeof cargarDetalleVentasComercio>>
>

export function DetalleVentasComercio({ datos }: { datos: DetalleVentasComercioDatos }) {
  const { totales, ventas, desde, hasta, pagina, comercio } = datos
  const base = `/OrumAdminLogin/metricas/comercio/${comercio.id}?desde=${desde}&hasta=${hasta}`

  return (
    <>
      <p className={styles.periodo}>
        Del {fechaLegible(desde)} al {fechaLegible(hasta)}
      </p>

      <Grid min="150px" className={styles.resumen}>
        <Cifra etiqueta="Ventas" valor={totales.cantidad.toLocaleString('es-CO')} size="sm" />
        <Cifra etiqueta="Monto total" valor={PESOS.format(totales.monto)} size="sm" />
        <Cifra etiqueta="Ahorro entregado" valor={PESOS.format(totales.descuento)} size="sm" />
      </Grid>

      <DataList
        caption={`Ventas registradas por ${comercio.nombre} en el periodo`}
        items={ventas}
        columns={COLUMNAS}
        getKey={(r) => r.id}
        empty={
          <EmptyState
            icon={<BarChart3 size={24} />}
            title="Sin ventas en el periodo"
            description="Este comercio no registró ventas entre las fechas seleccionadas."
          />
        }
      />

      {totales.cantidad > 0 && (
        <Paginacion
          {...pagina}
          nombre={totales.cantidad === 1 ? 'venta' : 'ventas'}
          href={(n) => (n > 1 ? `${base}&pagina=${n}` : base)}
        />
      )}
    </>
  )
}
