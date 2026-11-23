import type { Metadata } from 'next'
import { EstadoPago } from '../_components/estado-pago'

export const metadata: Metadata = {
  title: 'Confirmando tu pago',
  robots: { index: false },
}

/*
  Mercado Pago devuelve aquí a la persona al terminar (es la `back_url`). La
  página NO escribe nada al cargar: la pantalla pregunta con una acción
  (`consultarPagoRegistro`), con su límite, y es esa acción la que concilia la
  suscripción si el aviso de Mercado Pago no llegó.
*/
export default function RetornoPagoPage() {
  return <EstadoPago />
}
