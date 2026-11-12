/**
 * Número de membresía para los socios que se registran con Mercado Pago.
 *
 * Formato: 8 dígitos = prefijo de 4 secuencial + sufijo de 4 aleatorio.
 * - Cada prefijo da 10.000 números (`xxxx0000`–`xxxx9999`). Cuando el activo se
 *   llena, se pasa al siguiente (`0001` → `0002` → …).
 * - El prefijo `0009` está reservado: sus números son los del pozo manual del
 *   administrador (`000900*`). Nunca se asigna a Mercado Pago.
 *
 * Este módulo es puro: no toca la base. Recibe el conjunto de números ya usados
 * (en `miembros` y `numeros_registro`) y devuelve el siguiente libre. La
 * persistencia y la carrera entre dos altas simultáneas se resuelven en la base
 * con el índice único del número.
 */

/** Prefijo que nunca se usa aquí: es el bloque del pozo del administrador. */
export const PREFIJO_RESERVADO = '0009'

/** Números por prefijo: 4 dígitos aleatorios. */
export const SUFIJOS_POR_PREFIJO = 10_000

/** Intentos al azar antes de recorrer los libres de forma exhaustiva. */
const INTENTOS_ALEATORIOS = 30

const FORMATO_NUMERO = /^\d{8}$/

/** Rellena con ceros a la izquierda hasta 4 dígitos. */
function pad4(valor: number): string {
  return String(valor).padStart(4, '0')
}

/** ¿El número tiene exactamente 8 dígitos? */
export function esNumeroMercadoPagoValido(numero: string): boolean {
  return FORMATO_NUMERO.test(numero)
}

/**
 * Devuelve el siguiente prefijo después de `prefijo`, saltando el reservado.
 * `null` cuando ya no hay prefijos (después de `9999`).
 */
export function prefijoSiguiente(prefijo: string): string | null {
  let n = Number(prefijo) + 1
  if (n === Number(PREFIJO_RESERVADO)) n += 1
  if (n > 9999) return null
  return pad4(n)
}

/**
 * Elige un sufijo libre dentro de `prefijo`. Prueba al azar; si no acierta
 * (bloque casi lleno), recorre los libres y elige uno. `null` si no queda ninguno.
 */
export function elegirSufijo(
  prefijo: string,
  usados: ReadonlySet<string>,
  aleatorio: () => number = Math.random,
): string | null {
  for (let i = 0; i < INTENTOS_ALEATORIOS; i++) {
    const sufijo = pad4(Math.floor(aleatorio() * SUFIJOS_POR_PREFIJO))
    if (!usados.has(prefijo + sufijo)) return sufijo
  }
  const libres: string[] = []
  for (let s = 0; s < SUFIJOS_POR_PREFIJO; s++) {
    const sufijo = pad4(s)
    if (!usados.has(prefijo + sufijo)) libres.push(sufijo)
  }
  if (libres.length === 0) return null
  const indice = Math.min(
    Math.floor(aleatorio() * libres.length),
    libres.length - 1,
  )
  return libres[indice]
}

/**
 * Siguiente número libre para Mercado Pago. `usados` contiene números completos
 * de 8 dígitos (de cualquier origen). Devuelve `null` si no hay ninguno libre.
 */
export function elegirNumeroMercadoPago(
  usados: ReadonlySet<string>,
  aleatorio: () => number = Math.random,
): string | null {
  const ocupadosPorPrefijo = new Map<string, number>()
  for (const numero of usados) {
    const prefijo = numero.slice(0, 4)
    ocupadosPorPrefijo.set(prefijo, (ocupadosPorPrefijo.get(prefijo) ?? 0) + 1)
  }

  let prefijo: string | null = '0001'
  while (prefijo !== null) {
    if (prefijo !== PREFIJO_RESERVADO) {
      const ocupados = ocupadosPorPrefijo.get(prefijo) ?? 0
      if (ocupados < SUFIJOS_POR_PREFIJO) {
        const sufijo = elegirSufijo(prefijo, usados, aleatorio)
        if (sufijo !== null) return prefijo + sufijo
      }
    }
    prefijo = prefijoSiguiente(prefijo)
  }
  return null
}
