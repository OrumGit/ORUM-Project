/**
 * EL TITULAR DE UN BENEFICIO  ·  función pura (28/10/2026)
 *
 * Encargo del cliente: que el titular diga el beneficio Y en qué —«10% de
 * descuento · Brunch», «Regalo · Bebida»— y vaya subrayado. El valor sale del
 * tipo de beneficio (`formatearBeneficio`); el «en qué», del título que
 * escribe el administrador.
 *
 * Muchos títulos ya repiten el valor («10% de descuento en brunch»): se le
 * quita lo repetido y el conector que sobra, para no leer «10% de descuento ·
 * 10% de descuento en brunch». Lo que no lo repite se deja tal cual.
 */

/** Conectores que quedan sueltos al quitar el valor del principio del título. */
const CONECTOR = /^(?:(?:en|de|del|para|por|con|sobre)\s+|[-–—·:,|/]\s*)/i

/** El «en qué» del título, sin el valor que ya se muestra; vacío si no queda nada. */
export function asuntoDelTitulo(valor: string, titulo: string): string {
  let resto = titulo.trim()
  const v = valor.trim()
  const siguiente = resto.charAt(v.length)
  // Empieza por el valor y ahí acaba la palabra («Regalos…» no es «Regalo»).
  if (
    v !== '' &&
    resto.toLocaleLowerCase('es').startsWith(v.toLocaleLowerCase('es')) &&
    !/[\p{L}\p{N}]/u.test(siguiente)
  ) {
    resto = resto.slice(v.length).trim()
    let previo = ''
    while (previo !== resto) {
      previo = resto
      resto = resto.replace(CONECTOR, '').trim()
    }
  }
  return resto ? resto.charAt(0).toLocaleUpperCase('es') + resto.slice(1) : ''
}

/** «10% de descuento · Brunch»; solo el valor si el título no añade nada. */
export function titularBeneficio(valor: string, titulo: string): { valor: string; asunto: string } {
  return { valor, asunto: asuntoDelTitulo(valor, titulo) }
}
