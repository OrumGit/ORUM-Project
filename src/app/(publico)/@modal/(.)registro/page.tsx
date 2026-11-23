import { cargarDatosRegistro } from '@/app/(publico)/registro/_components/datos-registro'
import { VentanaRegistro } from '@/app/(publico)/registro/_components/ventana-registro'

/*
  EL REGISTRO, INTERCEPTADO  ·  «Adquirir» lo abre encima de la portada
  ---------------------------------------------------------------------------
  Misma ranura que la ficha pública (`(publico)/layout.tsx`). Un enlace
  directo a `/registro` sigue abriendo la página completa. Si tras añadir
  esta ruta la interceptación «no funciona», reinicia el servidor de
  desarrollo: el manifiesto de rutas queda obsoleto y falla en silencio.
*/
export default async function RegistroInterceptado({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams
  const datos = await cargarDatosRegistro(plan)
  if (!datos) return null
  return <VentanaRegistro {...datos} />
}
