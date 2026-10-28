/**
 * Un teléfono colombiano para LEER, en grupos: «300 132 5756» (celular),
 * «602 234 5678» (fijo con indicativo). Lo que no sea un número de 10 cifras
 * se devuelve tal cual, sin espacios de sobra. El enlace `tel:` se arma con
 * `telefonoParaMarcar`, que deja solo las cifras.
 */
export function telefonoLegible(telefono: string): string {
  const cifras = telefono.replace(/\D/g, '')
  const local = cifras.length === 12 && cifras.startsWith('57') ? cifras.slice(2) : cifras
  if (local.length === 10) return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  return telefono.trim().replace(/\s+/g, ' ')
}

/** Solo cifras (y el «+» inicial si lo trae): lo que entiende `tel:`. */
export function telefonoParaMarcar(telefono: string): string {
  const limpio = telefono.trim()
  return (limpio.startsWith('+') ? '+' : '') + limpio.replace(/\D/g, '')
}
