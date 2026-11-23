import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cargarDatosRegistro } from './_components/datos-registro'
import { PaginaRegistro } from './_components/ventana-registro'

export const metadata: Metadata = {
  title: 'Únete a ORUM',
  robots: { index: false },
}

/*
  El registro a pantalla completa: un enlace directo a `/registro?plan=N`.
  Desde la portada, «Adquirir» abre el MISMO flujo encima
  (`@modal/(.)registro`).
*/
export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams
  const datos = await cargarDatosRegistro(plan)
  if (!datos) notFound()
  return <PaginaRegistro {...datos} />
}
