/*
  LEER LA RESPUESTA DE PWNED PASSWORDS  ·  función pura (27/10/2026)
  ---------------------------------------------------------------------------
  La consulta (`contrasena-filtrada.ts`) manda solo los 5 primeros caracteres
  del SHA-1 de la contraseña —anonimato k: el servicio no llega a saber cuál
  es— y recibe todos los sufijos de su rango, uno por línea, con cuántas
  veces apareció cada uno: `SUFIJO:VECES`. Con `Add-Padding` llegan además
  sufijos de relleno con `:0`, que no cuentan.

  Esto, separado de la red, se prueba solo.
*/

/** Cuántas veces aparece `sufijo` (35 caracteres hexadecimales) en la respuesta; 0 si no está. */
export function vecesEnRango(sufijo: string, cuerpo: string): number {
  const buscado = sufijo.toUpperCase()
  for (const linea of cuerpo.split(/\r?\n/)) {
    const [hash, veces] = linea.trim().split(':')
    if (hash?.toUpperCase() === buscado) return Number.parseInt(veces ?? '0', 10) || 0
  }
  return 0
}
