/**
 * Números de registro predefinidos ("pozo").
 *
 * A diferencia del generador anterior, el número de un miembro ya no se inventa
 * al registrarlo: sale de un conjunto que el administrador carga por adelantado
 * (los carnés físicos vienen numerados). Aquí vive solo la lógica pura —qué es
 * un número válido y cómo se expande un rango—; la persistencia y la asignación
 * están en las server actions.
 */

/** Formato del número de registro: exactamente 8 dígitos. */
const FORMATO = /^\d{8}$/

/**
 * Tope de números por carga. Un rango se escribe en dos campos; un cero de más
 * en "hasta" pediría crear millones de filas. El tope obliga a partir cargas
 * grandes en tandas conscientes.
 */
export const MAX_NUMEROS_POR_CARGA = 2000

/** ¿Es una cadena de exactamente 8 dígitos? */
export function esNumeroRegistroValido(valor: string): boolean {
  return FORMATO.test(valor)
}

export type RangoExpandido =
  | { ok: true; numeros: string[] }
  | { ok: false; error: string }

/**
 * Expande un rango inclusivo `desde`–`hasta` a la lista de números de 8 dígitos.
 * Ambos extremos deben tener el formato válido; el inicio no puede superar al
 * fin; y el total no puede pasar de `MAX_NUMEROS_POR_CARGA`.
 */
export function expandirRango(desde: string, hasta: string): RangoExpandido {
  if (!esNumeroRegistroValido(desde) || !esNumeroRegistroValido(hasta)) {
    return { ok: false, error: 'Los números deben tener exactamente 8 dígitos.' }
  }

  // Base 10 explícita: "00000010" no es octal.
  const inicio = Number.parseInt(desde, 10)
  const fin = Number.parseInt(hasta, 10)

  if (inicio > fin) {
    return { ok: false, error: 'El número inicial no puede ser mayor que el final.' }
  }

  const total = fin - inicio + 1
  if (total > MAX_NUMEROS_POR_CARGA) {
    return {
      ok: false,
      error: `Un rango no puede tener más de ${MAX_NUMEROS_POR_CARGA} números. Cárgalo en partes.`,
    }
  }

  const numeros: string[] = []
  for (let n = inicio; n <= fin; n++) {
    numeros.push(String(n).padStart(8, '0'))
  }
  return { ok: true, numeros }
}

/* --- Elegir el número del carné con doble verificación (24/11/2026) ---------
   Encargo del propietario: al registrar un miembro, el número se elegía de una
   lista larga con el primero ya marcado y a veces se entregaba un carné con
   otro número. Ahora se BUSCA escribiendo (la lista se filtra) y después se
   escribe OTRA VEZ, mirando la tarjeta: los dos tienen que coincidir. */

/** Cuántos números enseña la lista de búsqueda como mucho. */
export const MAX_SUGERENCIAS = 50

/** Deja solo las cifras de lo escrito, hasta 8 (el largo de un número). */
export function soloCifras(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, 8)
}

/**
 * Los números libres que casan con lo escrito: primero los que EMPIEZAN así y
 * después los que lo contienen en otro sitio («12345» encuentra «00012345»).
 * Conserva el orden de la lista y corta en `tope`; `total` dice cuántos casan.
 */
export function buscarNumeros(
  disponibles: readonly string[],
  consulta: string,
  tope = MAX_SUGERENCIAS,
): { numeros: string[]; total: number } {
  const cifras = soloCifras(consulta)
  if (cifras === '') return { numeros: disponibles.slice(0, tope), total: disponibles.length }
  const empiezan: string[] = []
  const contienen: string[] = []
  for (const n of disponibles) {
    if (n.startsWith(cifras)) empiezan.push(n)
    else if (n.includes(cifras)) contienen.push(n)
  }
  const todos = [...empiezan, ...contienen]
  return { numeros: todos.slice(0, tope), total: todos.length }
}

/** ¿El número escrito otra vez es exactamente el elegido (y es un número válido)? */
export function numerosCoinciden(elegido: string, repetido: string): boolean {
  return esNumeroRegistroValido(elegido) && elegido === repetido
}

/**
 * ¿Lo escrito llegó de golpe, como llega lo pegado? Tecleando, las cifras
 * entran de una en una; el portapapeles del teclado de un teléfono mete
 * varias a la vez sin disparar el evento `paste`. Dos cifras o más de más en
 * un solo cambio = pegado. Borrar o reemplazar por una sola cifra, no.
 */
export function pareceTextoPegado(antes: string, despues: string): boolean {
  return soloCifras(despues).length - soloCifras(antes).length > 1
}
