'use client'

import { formatearBeneficioCorto } from '@/lib/comercios/beneficios-formato'
import {
  cuandoUsarlo,
  estadoPromocion,
  textoEstadoPromocion,
  type FranjasPromocion,
} from '@/lib/comercios/franjas-promocion'
import { useInstanteAlMinuto } from '@/components/comercios/use-minuto'
import type { TipoBeneficioCodigo } from '@/lib/supabase/database.types'
import styles from './verificar.module.css'

export type PromocionLateral = {
  id: number
  titulo: string
  tipoCodigo: TipoBeneficioCodigo
  valor: number | null
  diasSemana: number[] | null
  franjas: FranjasPromocion
  restricciones: string | null
}

/*
  LAS PROMOCIONES DEL LATERAL, AL MINUTO. La caja se queda abierta todo el
  día: un «Aplica hoy» calculado en el servidor al cargar mentiría pasada
  medianoche o al salir de una franja. Se recalcula en el navegador cada
  minuto (`useInstanteAlMinuto`); mientras no se sabe, vale la hora del
  servidor, así no hay hueco ni desajuste al hidratar.
*/
export function ListaPromociones({
  promociones,
  ahoraServidor,
}: {
  promociones: PromocionLateral[]
  ahoraServidor: string
}) {
  const instante = useInstanteAlMinuto() ?? new Date(ahoraServidor)

  return (
    <ul className={styles.promociones}>
      {promociones.map((p) => {
        const estado = estadoPromocion(p.diasSemana, p.franjas, instante)
        return (
          <li key={p.id} className={styles.promocion}>
            {/* La cifra corta de las tarjetas del directorio («10%», «2x1»). */}
            <span className={styles.promocionValor}>
              {formatearBeneficioCorto(p.tipoCodigo, p.valor)}
            </span>
            <span className={styles.promocionTitulo}>
              {p.titulo}
              {/* Estado de AHORA con texto; el color nunca va solo. */}
              <span className={styles.promocionDias} aria-live="polite">
                <span className={estado.tipo === 'aplica' ? styles.estadoAplica : styles.estadoNoAplica}>
                  {textoEstadoPromocion(estado)}
                </span>
              </span>
              {cuandoUsarlo(p.diasSemana, p.franjas).map((g) => (
                <span key={g.dias} className={styles.promocionDias}>
                  {g.dias} · {g.horas.join(' y ')}
                </span>
              ))}
              {p.restricciones && (
                <span className={styles.promocionCondiciones}>
                  <span className={styles.promocionCondicionesRotulo}>
                    Condiciones y restricciones:
                  </span>{' '}
                  {p.restricciones}
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
