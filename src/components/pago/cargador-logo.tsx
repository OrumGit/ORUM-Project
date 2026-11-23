import Image from 'next/image'
import estrella from '@/components/ui/marca/estrella.png'
import monograma from '@/components/ui/marca/monograma.png'
import estilos from './cargador-logo.module.css'

/*
  EL LOGO SE ARMA  ·  (diseño aprobado el 23/11/2026)
  ---------------------------------------------------------------------------
  La espera de «Confirmando tu pago». Empieza con la estrella de ORUM sola en
  el centro; sube al borde, da la vuelta y, a su paso, se descubre la «O» del
  monograma —la imagen real del logo, sin su estrella—; vuelve al centro,
  late una vez y la «O» se desvanece para empezar otra vez. 3,2 s por ciclo.

  Todo es `transform` y `opacity`, salvo el abanico que descubre la «O»: un
  `mask` con un ángulo registrado (`@property --giro`), en UNA capa de 120 px.
  Con movimiento reducido se ve el logo completo y quieto.
*/

export function CargadorLogo() {
  return (
    <div className={estilos.cargador} aria-hidden="true">
      <Image className={estilos.anillo} src={monograma} alt="" width={120} height={119} priority />
      <div className={estilos.giro}>
        <div className={estilos.brazo}>
          <Image src={estrella} alt="" width={54} height={56} />
        </div>
      </div>
    </div>
  )
}
