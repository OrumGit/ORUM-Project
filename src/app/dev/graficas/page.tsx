import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Grid, PageHeader, Section, Stack } from '@/components/ui/layout'
import { GraficaBarras, GraficaColumnas } from '@/components/ui/graficas'
import { primerosYOtros, serieVentas } from '@/lib/metricas/graficas'
import portal from '@/app/miembros/(portal)/portal.module.css'

export const metadata = { title: 'Vista previa de gráficas · ORUM' }

/**
 * Las gráficas de Métricas con datos FALSOS, solo en desarrollo.
 * `?caso=largo` para un periodo de 90 días (agrupado por semanas).
 */
export default async function VistaPreviaGraficas({
  searchParams,
}: {
  searchParams: Promise<{ caso?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const largo = (await searchParams).caso === 'largo'
  const desde = largo ? '2026-08-01' : '2026-10-01'
  const hasta = '2026-10-29'

  // Ventas inventadas, deterministas: más los fines de semana.
  const ventas: { fecha_hora: string; valor_final: number }[] = []
  for (let ms = Date.parse(`${desde}T15:00:00Z`); ms <= Date.parse(`${hasta}T15:00:00Z`); ms += 86400000) {
    const d = new Date(ms)
    const n = ((d.getUTCDate() * 7) % 5) + (d.getUTCDay() % 6 === 0 ? 4 : 0)
    for (let i = 0; i < n; i++) ventas.push({ fecha_hora: d.toISOString(), valor_final: 25000 + i * 8000 })
  }
  const serie = serieVentas(ventas, desde, hasta)
  const max = Math.max(...serie.puntos.map((p) => p.cantidad))
  const texto = (n: number) => (n === 1 ? '1 venta' : `${n} ventas`)
  const pesos = (n: number) => `$ ${n.toLocaleString('es-CO')}`

  const comercios = primerosYOtros(
    [
      'Dulces Momentos',
      'Bendito Brunch',
      'Absurdo Sport Bar',
      'Casa Blanca',
      'Anthali Spa',
      'Café de prueba',
      'Ohana Sushi Bowl',
      'Barra Calibre',
      'La Esquina',
      'Mar y Tierra',
    ].map((nombre, i) => ({ clave: String(i), etiqueta: nombre, valor: 40 - i * 4 })),
  ).map((b) => ({ ...b, texto: String(b.valor), resto: b.clave === 'otros' }))

  return (
    <div className={portal.portal} data-theme="light" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader title="Métricas" description="Vista previa de las gráficas." />
      <Stack gap={7}>
        <Section title="Ventas en los comercios">
          <Card padding="lg">
            <GraficaColumnas
              etiqueta="Ventas"
              columnas={serie.puntos.map((p) => ({
                clave: p.clave,
                etiqueta: p.etiqueta,
                valor: p.cantidad,
                texto: texto(p.cantidad),
                nota: pesos(p.monto),
              }))}
              maximoTexto={texto(max)}
              pie="Ventas registradas cada día. Apunta una columna para ver el detalle."
            />
          </Card>
        </Section>
        <Grid min="320px">
          <Section title="Quién vendió más membresías">
            <Card padding="lg">
              <GraficaBarras
                etiqueta="Membresías por empleado"
                barras={[
                  { clave: 'a', etiqueta: 'Ana Restrepo', valor: 18, texto: '18' },
                  { clave: 'b', etiqueta: 'Daniel Bulla', valor: 11, texto: '11' },
                  { clave: 'c', etiqueta: 'Laura Gil', valor: 4, texto: '4' },
                ]}
              />
            </Card>
          </Section>
          <Section title="Comercios con más ventas">
            <Card padding="lg">
              <GraficaBarras etiqueta="Ventas por comercio" barras={comercios} />
            </Card>
          </Section>
        </Grid>
      </Stack>
    </div>
  )
}
