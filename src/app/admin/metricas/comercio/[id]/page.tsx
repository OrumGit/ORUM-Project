import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { normalizarRango } from '@/lib/metricas/metricas'
import { PageHeader } from '@/components/ui/layout'
import {
  DetalleVentasComercio,
  cargarDetalleVentasComercio,
} from '../../_components/detalle-ventas-comercio'

export const metadata = { title: 'Ventas del comercio · ORUM' }

export default async function VentasComercioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ desde?: string; hasta?: string; pagina?: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params
  const { desde, hasta, pagina } = await searchParams
  const rango = normalizarRango(desde, hasta)

  const comercioId = Number(id)
  if (!Number.isInteger(comercioId)) notFound()

  const datos = await cargarDetalleVentasComercio(comercioId, rango.desde, rango.hasta, Number(pagina ?? 1))
  if (!datos) notFound()

  return (
    <>
      <PageHeader title="Ventas del comercio" description={datos.comercio.nombre} />
      <DetalleVentasComercio datos={datos} />
    </>
  )
}
