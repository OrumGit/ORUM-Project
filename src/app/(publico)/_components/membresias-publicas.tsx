import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatearPesos, type PlanPublico } from '@/lib/publico/planes'
import escaparate from '../escaparate.module.css'
import { CtaSocio } from './cta-socio'
import { AdornoEstrella, EstrellaOrum } from '@/components/ui/marca/marca'
import { Revelar } from './revelar'
import { REVELAR_DER, REVELAR_IZQ, revelarEscalonado } from '@/lib/shared/revelado'
import estilos from './membresias-publicas.module.css'

/*
  ELIGE TU MEMBRESÍA  ·  los planes reales, con su botón de adquirir
  ---------------------------------------------------------------------------
  Los precios salen de `planes_membresia` en cada petición: si el
  administrador cambia uno, la portada lo dice al momento, sin redesplegar.
  El ahorro del plan largo se CALCULA (`prepararPlanes`), no se escribe: el
  boceto decía «ahorra 2 meses» junto a unos precios con los que se
  ahorraban más de tres y medio.

  «Adquirir» lleva a `/registro?plan=N` (14/11/2026, versión mínima de
  prueba del pago con Mercado Pago). Antes abría WhatsApp con
  `MENSAJE_WHATSAPP_PUBLICO` (29/09/2026); ese texto sigue en `lib/publico/whatsapp`.

  Las tarjetas son superficies levantadas: sombra, sin trazo. La del plan
  destacado sube un escalón (`--shadow-raised`) y lleva la etiqueta de su
  ahorro — la jerarquía la da la luz, no un color.
*/

type Props = {
  planes: PlanPublico[]
  soporte: string | null
}

export function MembresiasPublicas({ planes, soporte }: Props) {
  const ventajas = [
    'Beneficio activo desde el primer día',
    /* Sin la cifra (encargo del 29/09/2026): «los 6 comercios aliados»
       dejaba contado el club, y un número pequeño juega en contra de quien
       todavía está decidiendo si hacerse socio. */
    'Válido en todos los comercios aliados',
    'Sin cobros automáticos: pagas por WhatsApp y renuevas solo si quieres',
    'Incluye tarjeta física de la membresía',
  ]

  return (
    <section
      id="membresias"
      className={[escaparate.franja, escaparate.tonoPapel].join(' ')}
      aria-labelledby="titulo-membresias"
    >
      <Revelar>
        <div className={estilos.bloque}>
          <div className={[estilos.texto, REVELAR_IZQ].join(' ')}>
            <div>
              <h2 id="titulo-membresias" className={escaparate.tituloSeccion}>
                <AdornoEstrella />
                Elige tu <em className={escaparate.acento}>membresía</em>
              </h2>
              <p className={estilos.apoyo}>
                Un solo carnet, beneficio inmediato en todos los aliados.
              </p>
            </div>

            <ul className={estilos.ventajas}>
              {ventajas.map((v, i) => (
                <li key={v} className={[estilos.ventaja, revelarEscalonado(i)].join(' ')}>
                  <EstrellaOrum className={estilos.check} />
                  {v}
                </li>
              ))}
            </ul>
          </div>

          {planes.length > 0 ? (
            <ul className={estilos.planes}>
              {planes.map((plan, i) => (
                <li
                  key={plan.id}
                  className={[
                    estilos.plan,
                    plan.destacado && estilos.destacado,
                    i === 0 ? REVELAR_DER : revelarEscalonado(i),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {plan.destacado && plan.ahorro !== null && (
                    <p className={estilos.etiqueta}>Ahorra {formatearPesos(plan.ahorro)}</p>
                  )}
                  <h3 className={estilos.nombre}>{plan.nombre}</h3>
                  <p className={estilos.precio}>
                    <span className={estilos.cifra}>{formatearPesos(plan.precio)}</span>
                    <span className={estilos.periodo}>/ {plan.periodo}</span>
                  </p>
                  <p className={estilos.descripcion}>{descripcionDe(plan)}</p>

                  <span className={estilos.accion}>
                    <Button
                      href={`/registro?plan=${plan.id}`}
                      variant="secondary"
                      size="lg"
                      pildora
                      fullWidth
                      /* Como en el boceto: solo «Adquirir →». El nombre del
                         plan lo recibe el lector de pantalla, porque dos
                         «Adquirir» seguidos no dirían cuál es cuál. */
                      aria-label={`Adquirir el plan ${plan.nombre}`}
                    >
                      Adquirir
                      <ArrowRight size={16} aria-hidden="true" className={escaparate.flecha} />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            /* Sin planes activos en la base, la sección no inventa precios:
               remite a quien los sabe. */
            <div className={estilos.sinPlanes}>
              <p className={estilos.descripcion}>
                Escríbenos y te contamos los planes vigentes y sus precios.
              </p>
              <CtaSocio soporte={soporte} />
            </div>
          )}
        </div>
      </Revelar>
    </section>
  )
}

/**
 * La línea de apoyo de cada plan. Manda la descripción del administrador; si
 * no la hay, se deriva de los números —nunca una promesa que no salga de
 * ellos—.
 */
function descripcionDe(plan: PlanPublico): string {
  const propia = (plan.descripcion ?? '').trim()
  if (propia) return propia
  if (plan.duracionMeses === 1) return 'Ideal para probar el club sin compromiso.'
  if (plan.mensualEquivalente !== null) {
    return `Equivale a ${formatearPesos(plan.mensualEquivalente)} al mes.`
  }
  return 'Todo el club, por más tiempo.'
}
