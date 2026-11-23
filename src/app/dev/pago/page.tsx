import { notFound } from 'next/navigation'
import { VistaPago } from './vista'
import estilos from './vista.module.css'

export const metadata = { title: 'Vista previa del pago · ORUM' }

/**
 * El registro con pago y lo que pasa al volver de Mercado Pago, con datos
 * FALSOS y solo en desarrollo. Nada se envía de verdad: los botones de
 * enviar llaman a las acciones reales, que sin datos válidos o sin sesión
 * contestan con un error — NO los pulses contra la base compartida.
 *
 * `?caso=` datos (por defecto) · codigo · pagar · pagina · completar ·
 * confirmando · tardando · rechazado · pendiente · bienvenida
 */
export default async function VistaPreviaPago({
  searchParams,
}: {
  searchParams: Promise<{ caso?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { caso = 'datos' } = await searchParams
  return (
    <div data-theme="light" className={estilos.fondo}>
      <VistaPago caso={caso} />
    </div>
  )
}
