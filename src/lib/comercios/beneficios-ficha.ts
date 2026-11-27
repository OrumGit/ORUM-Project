import type { TipoBeneficioCodigo } from '@/lib/supabase/database.types'
import { formatearBeneficio } from './beneficios-formato'
import {
  cuandoUsarlo,
  normalizarFranjas,
  type FranjaPromocion,
  type GrupoUso,
} from './franjas-promocion'
import { esPromocionVigente } from './promocion-vigente'
import { asuntoDelTitulo } from './titulo-beneficio'

/*
  LOS BENEFICIOS DE LA FICHA DE UN COMERCIO  ·  27/11/2026
  ---------------------------------------------------------------------------
  Lo que pinta `BeneficiosSocio`: el titular, la descripción, cuándo se usa y
  las condiciones de cada promoción VIGENTE. Antes se armaba solo en la ficha
  del socio; desde que el Portal Público enseña los beneficios a quien aún no
  es socio (`lib/publico/beneficios-publicos.ts`), las DOS fichas salen de
  aquí: lo que ve el socio y lo que ve quien todavía no lo es no se pueden
  desincronizar.

  Solo promociones vigentes, con el mismo criterio que el directorio y la
  caja: una ficha que anunciara un beneficio caducado prometería lo que la
  caja rechaza.
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

/** Lo que hace falta de una fila de `promociones` (`select('*')`). */
export type FilaPromocionFicha = {
  id: number
  tipo_beneficio_id: number
  titulo: string
  descripcion: string | null
  valor: number | null
  activo: boolean
  fecha_inicio: string | null
  fecha_fin: string | null
  dias_semana: number[] | null
  restricciones: string | null
  /** Sin la migración de franjas, `select('*')` no la trae. */
  franjas_horarias?: unknown
}

/**
 * Las promociones VIGENTES de un comercio, listas para `BeneficiosSocio`.
 * `codigoTipo`: el código de cada `tipos_beneficio.id`; una promoción con un
 * tipo desconocido no se enseña (no se sabría cómo decirla).
 */
export function armarBeneficiosFicha(
  promociones: readonly FilaPromocionFicha[],
  codigoTipo: ReadonlyMap<number, TipoBeneficioCodigo>,
  hoy: string,
): BeneficioSocio[] {
  return promociones
    .filter((p) => esPromocionVigente(p.activo, p.fecha_inicio, p.fecha_fin, hoy))
    .flatMap((p) => {
      const tipo = codigoTipo.get(p.tipo_beneficio_id)
      if (!tipo) return []
      const valor = formatearBeneficio(tipo, p.valor)
      const franjas = normalizarFranjas(p.franjas_horarias)
      return [
        {
          id: p.id,
          tipo,
          // El titular: «10% de descuento · Brunch» (sin repetir el valor).
          valor,
          asunto: asuntoDelTitulo(valor, p.titulo),
          descripcion: p.descripcion,
          // CUÁNDO: los días enteros con sus horas completas (o «Todo el día»).
          cuando: cuandoUsarlo(p.dias_semana, franjas),
          dias: p.dias_semana,
          franjas,
          restricciones: p.restricciones,
        },
      ]
    })
}
