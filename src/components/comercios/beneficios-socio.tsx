'use client'

import { BadgeDollarSign, CalendarClock, Gift, Percent, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'
import { sinCortarHoras } from '@/lib/comercios/horario'
import {
  estadoPromocion,
  partesDisponibilidad,
  type FranjaPromocion,
  type GrupoUso,
} from '@/lib/comercios/franjas-promocion'
import type { TipoBeneficioCodigo } from '@/lib/supabase/database.types'
import { useInstanteAlMinuto } from './use-minuto'
import estilos from './beneficios-socio.module.css'

/*
  LOS BENEFICIOS DEL SOCIO EN LA FICHA  ·  versión minimalista (29/10/2026)
  ---------------------------------------------------------------------------
  La anterior (28/10) no gustó: «mucha negrita, se ve muy cargado; que sea
  minimalista y se entienda a la primera». Ahora cada beneficio es:

    (%)  10% de descuento · Tu compra          ← el valor en 600, lo demás normal,
         Obtén el cambio de helado…               subrayado FINO dorado
         🗓 Disponible hoy                        ← solo la palabra en su color
            Todos los días   Todo el día          ← la semana, peso normal
         Condiciones: beneficios alternativos…    ← pequeño y gris

  Sin recuadro, sin rótulo en versales, sin píldora con punto, sin negrita
  en los días. Lo que dice «cuándo» es la misma lectura que el horario de la
  sede (`HorarioSede`): un icono, una frase de estado y los días con sus
  horas. El estado lo dice la palabra («Disponible ahora», «Hoy desde las
  6:00 p. m.», «Hoy no disponible»): el color nunca va solo. Se conserva lo
  que pidió el cliente el 28/10: el titular dice el beneficio y en qué
  (`asuntoDelTitulo`) y va subrayado, y nada en crema.

  De cliente solo por el estado de «ahora» (`useInstanteAlMinuto`): el resto
  llega pintado del servidor y el estado aparece al montar.
*/

export type BeneficioSocio = {
  id: number
  tipo: TipoBeneficioCodigo
  /** «10% de descuento», «Regalo». */
  valor: string
  /** «Brunch», «Bebida GRATIS»; vacío si el título no añade nada. */
  asunto: string
  descripcion: string | null
  /** Cuándo se puede usar: un grupo de días con sus horas (`cuandoUsarlo`). */
  cuando: GrupoUso[]
  dias: number[] | null
  franjas: FranjaPromocion[] | null
  restricciones: string | null
}

const ICONO: Record<TipoBeneficioCodigo, ReactNode> = {
  porcentaje: <Percent size={18} strokeWidth={2.25} />,
  monto_fijo: <BadgeDollarSign size={19} />,
  dos_por_uno: <Ticket size={18} />,
  regalo: <Gift size={18} />,
}

export function BeneficiosSocio({ beneficios }: { beneficios: BeneficioSocio[] }) {
  const instante = useInstanteAlMinuto()

  return (
    <ul className={estilos.lista}>
      {beneficios.map((b) => {
        const estado = instante ? estadoPromocion(b.dias, b.franjas, instante) : null
        const disponible = estado ? partesDisponibilidad(estado) : null
        return (
          <li key={b.id} className={estilos.beneficio}>
            <span className={estilos.icono} aria-hidden="true">
              {ICONO[b.tipo]}
            </span>

            <div className={estilos.cuerpo}>
              <p className={estilos.titular}>
                <span className={estilos.marcador}>
                  <span className={estilos.valor}>{b.valor}</span>
                  {b.asunto && (
                    <>
                      {/* El «·» se queda con el valor: si el titular parte,
                          la segunda línea no empieza por un punto suelto. */}
                      <span className={estilos.separador} aria-hidden="true">
                        {'\u00a0·'}{' '}
                      </span>
                      <span className="sr-only">: </span>
                      {b.asunto}
                    </>
                  )}
                </span>
              </p>

              {b.descripcion && <p className={estilos.descripcion}>{b.descripcion}</p>}

              <div className={estilos.uso}>
                <CalendarClock size={15} aria-hidden="true" className={estilos.usoIcono} />
                <div className={estilos.usoCuerpo}>
                  {disponible && estado && (
                    <p className={estilos.estado}>
                      <span className={estilos.palabra} data-tipo={estado.tipo}>
                        {sinCortarHoras(disponible.palabra)}
                      </span>
                      {disponible.detalle && <> · {sinCortarHoras(disponible.detalle)}</>}
                    </p>
                  )}
                  <dl className={estilos.usoLista} aria-label="Cuándo puedes usarlo">
                    {b.cuando.map((g) => (
                      <div key={g.dias} className={estilos.usoFila}>
                        <dt className={estilos.usoDias}>{g.dias}</dt>
                        <dd className={estilos.usoHoras}>
                          {g.horas.map((h) => (
                            <span key={h}>{sinCortarHoras(h)}</span>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {b.restricciones && (
                <p className={estilos.condiciones}>
                  <span className={estilos.condicionesRotulo}>Condiciones: </span>
                  {b.restricciones}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
