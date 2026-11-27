/*
  ¿QUIEN NO ES SOCIO PUEDE LEER LOS BENEFICIOS?  ·  27/11/2026
  ---------------------------------------------------------------------------
  Encargo del propietario: «que los usuarios que no son miembros también
  puedan ver los beneficios, pero no las reseñas ni nada de eso que pueda
  perjudicar al negocio; pero guarda la lógica de los beneficios ocultos por
  si el cliente quiere volver a ponerlo».

  Este es el interruptor, y es UNO para todo el Portal Público:

    · 'a-la-vista' (hoy) — la tarjeta del directorio dice el beneficio
      («10%») y la ficha del comercio enseña cada beneficio entero, igual
      que al socio (`BeneficiosSocio`: titular, descripción, cuándo se usa y
      condiciones), con «Hazte socio» para quien quiera usarlo.
    · 'oculto' (del 29/09 al 27/11/2026) — el beneficio sale DESENFOCADO
      con un candado y «Inicia sesión para verlo». El código de esa versión
      se conserva entero en la tarjeta y en la ficha: VOLVER A OCULTARLOS ES
      CAMBIAR ESTA LÍNEA.

  Lo que NO cambia con el interruptor: el Portal Público nunca enseña las
  reseñas, la calificación, el número de ventas ni nada que lea la sesión
  del socio. Eso vive solo en el Portal de Miembros.

  El HTML de la ficha pública se guarda en caché (`revalidate`): tras
  cambiar el interruptor, se publica (despliegue) y las fichas se rehacen.
*/

export type ModoBeneficiosPublicos = 'a-la-vista' | 'oculto'

/** ⚙️ EL INTERRUPTOR. 'oculto' vuelve a la versión desenfocada. */
export const BENEFICIOS_EN_EL_PORTAL_PUBLICO: ModoBeneficiosPublicos = 'a-la-vista'

/** ¿Se leen los beneficios en el Portal Público? */
export function beneficiosALaVista(
  modo: ModoBeneficiosPublicos = BENEFICIOS_EN_EL_PORTAL_PUBLICO,
): boolean {
  return modo === 'a-la-vista'
}

/**
 * ¿Se LEE el beneficio en esta tarjeta o ficha? El socio, siempre; quien no
 * lo es, según el interruptor.
 */
export function beneficioLegible(
  socio: boolean,
  modo: ModoBeneficiosPublicos = BENEFICIOS_EN_EL_PORTAL_PUBLICO,
): boolean {
  return socio || beneficiosALaVista(modo)
}
