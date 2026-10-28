import { BarChart3, Filter } from 'lucide-react'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { inicioDiaBogota, finDiaBogota } from '@/lib/shared/fecha'
import {
  rangoUltimosDias,
  agruparMembresiasPorEmpleado,
  agruparVentasPorComercio,
  agruparVentasPorMiembroYComercio,
  type ResumenComercio,
  type ResumenEmpleado,
  type ResumenUsoMiembro,
} from '@/lib/metricas/metricas'
import { primerosYOtros, serieVentas } from '@/lib/metricas/graficas'
import { GraficaBarras, GraficaColumnas } from '@/components/ui/graficas'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cifra } from '@/components/ui/cifra'
import { DataList, type Column } from '@/components/ui/data-list'
import { EmptyState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Grid, PageHeader, Section, Stack } from '@/components/ui/layout'
import styles from './metricas.module.css'

export const metadata = { title: 'Métricas · ORUM' }

/** Pesos colombianos sin decimales: aquí nadie cobra centavos. */
const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/*
  `timeZone: 'UTC'` NO es un descuido: `fechaLegible` construye el instante a
  medianoche UTC, así que hay que leerlo en UTC. Formatearlo en Bogotá (UTC−5)
  lo retrasaría cinco horas y el día caería al anterior — el rango entero se
  mostraba desplazado un día respecto a los campos del formulario.

  Aquí no hay hora que convertir: 'YYYY-MM-DD' ya es una fecha civil.
*/
const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** 'YYYY-MM-DD' → texto legible, sin desplazarse un día por zona horaria. */
function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return FECHA_LARGA.format(new Date(Date.UTC(a, m - 1, d)))
}

const COL_EMPLEADO: ReadonlyArray<Column<ResumenEmpleado>> = [
  { key: 'nombre', header: 'Empleado', primary: true, cell: (r) => r.nombre },
  { key: 'cantidad', header: 'Vendidas', numeric: true, width: '120px', cell: (r) => r.cantidad },
  {
    key: 'monto',
    header: 'Monto total',
    numeric: true,
    width: '160px',
    cell: (r) => <span className={styles.monto}>{PESOS.format(r.monto)}</span>,
  },
]

const COL_COMERCIO: ReadonlyArray<Column<ResumenComercio>> = [
  { key: 'nombre', header: 'Comercio', primary: true, cell: (r) => r.nombre },
  { key: 'cantidad', header: 'Ventas', numeric: true, width: '110px', cell: (r) => r.cantidad },
  {
    key: 'monto',
    header: 'Monto total',
    numeric: true,
    width: '160px',
    cell: (r) => <span className={styles.monto}>{PESOS.format(r.montoTotal)}</span>,
  },
  {
    key: 'descuento',
    header: 'Ahorro entregado',
    numeric: true,
    width: '170px',
    cell: (r) => <span className={styles.monto}>{PESOS.format(r.descuentoTotal)}</span>,
  },
]

const COL_USO: ReadonlyArray<Column<ResumenUsoMiembro>> = [
  { key: 'miembro', header: 'Miembro', primary: true, cell: (r) => r.miembroNombre },
  { key: 'comercio', header: 'Comercio', cell: (r) => r.comercioNombre },
  { key: 'veces', header: 'Veces usada', numeric: true, width: '140px', cell: (r) => r.veces },
]

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  await requireRol('super_admin')
  const { desde: desdeParam, hasta: hastaParam } = await searchParams
  const defecto = rangoUltimosDias(30)
  const desde = desdeParam || defecto.desde
  const hasta = hastaParam || defecto.hasta

  const admin = createAdminClient()

  const [
    { count: miembrosNuevosCount },
    { data: membresiasVendidas },
    { data: empleados },
    { data: ventas },
    { data: sucursales },
    { data: comercios },
    { data: miembros },
  ] = await Promise.all([
    admin
      .from('miembros')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      /*
        `fecha_registro` es timestamptz. Comparada con una cadena SIN offset,
        Postgres la interpreta en la zona de la sesión (UTC), no en Bogotá:
        todo lo registrado después de las 7pm hora Colombia caía en el día
        siguiente en UTC y quedaba fuera del rango. Mismo motivo que en
        `ventas.fecha_hora`, justo debajo.
      */
      .gte('fecha_registro', inicioDiaBogota(desde))
      .lte('fecha_registro', finDiaBogota(hasta)),
    admin
      .from('membresias')
      .select('vendido_por, precio_pagado, es_cortesia')
      .gte('fecha_inicio', desde)
      .lte('fecha_inicio', hasta),
    admin.from('empleados').select('id, nombres, apellidos').is('deleted_at', null),
    admin
      .from('ventas')
      .select('sucursal_id, miembro_id, valor_final, valor_descuento, fecha_hora')
      .gte('fecha_hora', inicioDiaBogota(desde))
      .lte('fecha_hora', finDiaBogota(hasta)),
    admin.from('sucursales').select('id, comercio_id'),
    admin.from('comercios').select('id, nombre'),
    admin.from('miembros').select('id, nombres, apellidos').is('deleted_at', null),
  ])

  const porEmpleado = agruparMembresiasPorEmpleado(membresiasVendidas ?? [], empleados ?? [])
  const porComercio = agruparVentasPorComercio(ventas ?? [], sucursales ?? [], comercios ?? [])
  const porMiembroComercio = agruparVentasPorMiembroYComercio(
    ventas ?? [],
    sucursales ?? [],
    comercios ?? [],
    miembros ?? [],
  )

  /*
    Los totales se derivan de lo ya agrupado en lugar de pedir otra consulta:
    misma cifra por construcción, y una consulta menos por carga de página.
  */
  const ingresoMembresias = porEmpleado.reduce((s, r) => s + r.monto, 0)
  const membresiasVendidasCount = porEmpleado.reduce((s, r) => s + r.cantidad, 0)
  const ahorroEntregado = porComercio.reduce((s, r) => s + r.descuentoTotal, 0)

  /*
    LAS GRÁFICAS (29/10/2026: «gráficas simples para ver gráficamente todos
    los datos»). Salen de lo mismo que las tablas de abajo, que se quedan
    como la vista exacta: las ventas en el tiempo, quién vendió más
    membresías y qué comercios vendieron más.
  */
  const serie = serieVentas(ventas ?? [], desde, hasta)
  const maxVentas = Math.max(...serie.puntos.map((p) => p.cantidad), 0)
  const ventasTexto = (n: number) => (n === 1 ? '1 venta' : `${n.toLocaleString('es-CO')} ventas`)
  const barrasEmpleados = primerosYOtros(
    porEmpleado.map((r) => ({ clave: String(r.empleadoId ?? 'admin'), etiqueta: r.nombre, valor: r.cantidad })),
  ).map((b) => ({ ...b, texto: b.valor.toLocaleString('es-CO'), resto: b.clave === 'otros' }))
  const barrasComercios = primerosYOtros(
    porComercio.map((r) => ({ clave: String(r.comercioId), etiqueta: r.nombre, valor: r.cantidad })),
  ).map((b) => ({ ...b, texto: b.valor.toLocaleString('es-CO'), resto: b.clave === 'otros' }))

  /** Atajos: mismo destino que el formulario, un clic en vez de dos fechas. */
  const atajos = [7, 30, 90].map((dias) => {
    const r = rangoUltimosDias(dias)
    return {
      dias,
      href: `/admin/metricas?desde=${r.desde}&hasta=${r.hasta}`,
      activo: desde === r.desde && hasta === r.hasta,
    }
  })

  return (
    <>
      <PageHeader
        title="Métricas"
        description="Cómo se comportó el club en un periodo: cuánto se vendió, quién lo vendió y cuánto ahorro recibieron los miembros."
      />

      <form method="get" className={styles.filtros}>
        <div className={styles.campo}>
          <label className={styles.etiqueta} htmlFor="m-desde">
            Desde
          </label>
          <Input id="m-desde" type="date" name="desde" defaultValue={desde} />
        </div>

        <div className={styles.campo}>
          <label className={styles.etiqueta} htmlFor="m-hasta">
            Hasta
          </label>
          <Input id="m-hasta" type="date" name="hasta" defaultValue={hasta} />
        </div>

        <Button type="submit" variant="secondary" icon={<Filter size={16} />}>
          Aplicar
        </Button>
      </form>

      <div className={styles.atajos}>
        {atajos.map((a) => (
          <Button
            key={a.dias}
            href={a.href}
            size="sm"
            variant={a.activo ? 'secondary' : 'ghost'}
            aria-current={a.activo ? 'page' : undefined}
          >
            Últimos {a.dias} días
          </Button>
        ))}
      </div>

      <p className={styles.periodo}>
        Del {fechaLegible(desde)} al {fechaLegible(hasta)}
      </p>

      <Stack gap={7}>
        <Grid min="190px">
          <Card>
            <Cifra
              etiqueta="Miembros nuevos"
              valor={(miembrosNuevosCount ?? 0).toLocaleString('es-CO')}
              size="sm"
            />
          </Card>
          <Card>
            <Cifra
              etiqueta="Membresías vendidas"
              valor={membresiasVendidasCount.toLocaleString('es-CO')}
              size="sm"
            />
          </Card>
          <Card>
            <Cifra
              etiqueta="Ingreso por membresías"
              valor={PESOS.format(ingresoMembresias)}
              size="sm"
            />
          </Card>
          <Card>
            <Cifra
              etiqueta="Ahorro entregado"
              valor={PESOS.format(ahorroEntregado)}
              nota="Lo que los miembros dejaron de pagar"
              size="sm"
            />
          </Card>
        </Grid>

        <Section title="Ventas en los comercios">
          <Card padding="lg">
            {maxVentas > 0 ? (
              <GraficaColumnas
                etiqueta={serie.unidad === 'dia' ? 'Ventas por día' : 'Ventas por semana'}
                columnas={serie.puntos.map((p) => ({
                  clave: p.clave,
                  etiqueta: p.etiqueta,
                  valor: p.cantidad,
                  texto: ventasTexto(p.cantidad),
                  nota: PESOS.format(p.monto),
                }))}
                maximoTexto={ventasTexto(maxVentas)}
                pie={
                  serie.unidad === 'dia'
                    ? 'Ventas registradas cada día. Apunta una columna para ver el detalle.'
                    : 'Ventas registradas cada semana (el periodo es largo). Apunta una columna para ver el detalle.'
                }
              />
            ) : (
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Sin ventas en el periodo"
                description="Ningún comercio aliado registró ventas entre las fechas seleccionadas."
              />
            )}
          </Card>
        </Section>

        <Grid min="320px">
          <Section title="Quién vendió más membresías">
            <Card padding="lg">
              {barrasEmpleados.length > 0 ? (
                <GraficaBarras etiqueta="Membresías vendidas por empleado" barras={barrasEmpleados} />
              ) : (
                <p className={styles.sinDatos}>No se vendió ninguna membresía en el periodo.</p>
              )}
            </Card>
          </Section>
          <Section title="Comercios con más ventas">
            <Card padding="lg">
              {barrasComercios.length > 0 ? (
                <GraficaBarras etiqueta="Ventas por comercio" barras={barrasComercios} />
              ) : (
                <p className={styles.sinDatos}>Ningún comercio registró ventas en el periodo.</p>
              )}
            </Card>
          </Section>
        </Grid>

        <Section title="Membresías vendidas por empleado">
          <DataList
            caption="Membresías vendidas por empleado en el periodo"
            items={porEmpleado}
            columns={COL_EMPLEADO}
            getKey={(r) => r.empleadoId ?? 'super_admin'}
            empty={
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Sin ventas en el periodo"
                description="No se vendió ninguna membresía entre las fechas seleccionadas."
              />
            }
          />
        </Section>

        <Section title="Ventas por comercio">
          <DataList
            caption="Ventas registradas por comercio aliado en el periodo"
            items={porComercio}
            columns={COL_COMERCIO}
            getKey={(r) => r.comercioId}
            rowHref={(r) =>
              `/admin/metricas/comercio/${r.comercioId}?desde=${desde}&hasta=${hasta}`
            }
            empty={
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Sin ventas registradas"
                description="Ningún comercio aliado registró ventas entre las fechas seleccionadas."
              />
            }
          />
        </Section>

        <Section title="Uso de la membresía">
          <DataList
            caption="Veces que cada miembro usó su membresía en cada comercio (20 primeros)"
            items={porMiembroComercio}
            columns={COL_USO}
            getKey={(r) => `${r.miembroId}-${r.comercioId}`}
            empty={
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Sin uso registrado"
                description="Todavía no hay ventas que atribuir a ningún miembro en este periodo."
              />
            }
          />
        </Section>
      </Stack>
    </>
  )
}
