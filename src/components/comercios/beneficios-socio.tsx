'use client'

import { BadgeDollarSign, CalendarClock, Gift, Info, Percent, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'
import { sinCortarHoras } from '@/lib/comercios/horario'
import {
  estadoPromocion,
  textoDisponibilidad,
  type FranjaPromocion,
  type GrupoUso,
} from '@/lib/comercios/franjas-promocion'
import type { TipoBeneficioCodigo } from '@/lib/supabase/database.types'
import { useInstanteAlMinuto } from './use-minuto'
import estilos from './beneficios-socio.module.css'

/*
  LOS BENEFICIOS DEL SOCIO EN LA FICHA  ·  rediseño del 28/10/2026
  ---------------------------------------------------------------------------
  Encargo del cliente: «ese color [el crema] no me gusta», «que el título
  diga el beneficio y en qué —10% de descuento · Brunch, Regalo · Bebida— y
  vaya subrayado», y que se entienda CUÁNDO aplica, ahora que una promoción
  puede valer solo en ciertas horas.

  Cada beneficio, de arriba abajo:
    · su icono (porcentaje, monto, 2x1 o regalo) en un aro dorado;
    · el TITULAR, subrayado con un trazo de marcador dorado: el valor en
      negrita y, tras «·», en qué (`asuntoDelTitulo`);
    · la descripción, si la hay;
    · «CUÁNDO PUEDES USARLO» (29/10/2026, tras «no lo entiendo»): un
      recuadro con su rótulo, un renglón por grupo de días con los días
      ENTEROS y las horas COMPLETAS («Martes y miércoles · 8:00 a. m. –
      9:30 a. m. · 6:00 p. m. – 7:00 p. m.»), y debajo si puede usarlo
      AHORA («Puedes usarlo ahora, hasta las 9:30 a. m.», «Hoy podrás
      usarlo desde las 6:00 p. m.», «Hoy no está disponible») con su punto
      —lleno si puede, hueco si no—: el color nunca va solo;
    · las condiciones y restricciones, en letra pequeña con su icono.

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
        return (
          <li key={b.id} className={estilos.beneficio}>
            <span className={estilos.icono} aria-hidden="true">
              {ICONO[b.tipo]}
            </span>

            <div className={estilos.cuerpo}>
              <p className={estilos.titular}>
                <span className={estilos.marcador}>
                  <strong className={estilos.valor}>{b.valor}</strong>
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
                <p className={estilos.usoRotulo}>
                  <CalendarClock size={14} aria-hidden="true" className={estilos.cuandoIcono} />
                  Cuándo puedes usarlo
                </p>
                <dl className={estilos.usoLista}>
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
                {estado && (
                  <p className={estilos.estado} data-tipo={estado.tipo}>
                    <span className={estilos.punto} aria-hidden="true" />
                    {sinCortarHoras(textoDisponibilidad(estado))}
                  </p>
                )}
              </div>

              {b.restricciones && (
                <p className={estilos.condiciones}>
                  <Info size={14} aria-hidden="true" className={estilos.condicionesIcono} />
                  <span>
                    <span className={estilos.condicionesRotulo}>Condiciones y restricciones: </span>
                    {b.restricciones}
                  </span>
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
