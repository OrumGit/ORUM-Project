import type { Ref } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import estilos from './resenas.module.css'

/*
  LO QUE PASÓ TRAS UNA ACCIÓN  ·  «Tu reseña quedó publicada», «Quitaste tu
  respuesta», o el error si falló. Igual en los tres portales.

  El `role="status"` va SIEMPRE montado: una región viva que nace ya con su
  texto no se anuncia. Vacía, el CSS la saca del flujo sin quitarla del
  árbol de accesibilidad. Es enfocable (`tabIndex={-1}`): cuando el botón
  pulsado desaparece con su fila, quien llama lleva aquí el foco para que
  no caiga al `body`.
*/

type Props = {
  aviso: string
  error?: string | null
  zonaRef?: Ref<HTMLDivElement>
}

export function ZonaAviso({ aviso, error, zonaRef }: Props) {
  return (
    <div ref={zonaRef} tabIndex={-1} className={estilos.zona}>
      <p className={estilos.aviso} role="status">
        {aviso && <CheckCircle2 size={16} aria-hidden="true" />}
        {aviso}
      </p>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  )
}
