import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { normalizarRango } from '@/lib/metricas/metricas'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import {
  DetalleVentasComercio,
  cargarDetalleVentasComercio,
} from '@/app/admin/metricas/_components/detalle-ventas-comercio'

export default async function VentasComercioInterceptado({
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
    <OverlayRuta
      title="Ventas del comercio"
      description={datos.comercio.nombre}
      width="920px"
      detent="large"
    >
      <DetalleVentasComercio datos={datos} />
    </OverlayRuta>
  )
}
