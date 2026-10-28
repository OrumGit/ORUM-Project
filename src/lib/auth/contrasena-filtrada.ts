import 'server-only'

import { createHash } from 'node:crypto'
import { vecesEnRango } from './rango-filtradas'

/*
  ¿LA CONTRASEÑA ESTÁ EN ALGUNA FILTRACIÓN?  ·  27/10/2026
  ---------------------------------------------------------------------------
  NIST (SP 800-63B-4, §3.1.1.2) pide comparar toda contraseña nueva con las de
  brechas anteriores, y OWASP remite a Pwned Passwords de Have I Been Pwned:
  más de 900 millones de contraseñas reales filtradas, consultables sin clave
  y sin límite.

  La contraseña NO sale del servidor: se calcula su SHA-1, se mandan solo los
  5 primeros caracteres (`/range/ABCDE`) y la comparación del resto se hace
  aquí (`vecesEnRango`). Con `Add-Padding` la respuesta siempre pesa lo mismo,
  así que ni su tamaño delata el rango.

  SI EL SERVICIO NO RESPONDE, NO SE BLOQUEA A NADIE: con un plazo de 2,5 s se
  devuelve `null` («no se pudo saber») y la contraseña pasa con las demás
  reglas. Dejar a alguien sin poder activar su cuenta porque un servicio
  externo está caído sería peor que el riesgo que se evita.
*/

const PLAZO_MS = 2500

/**
 * Cuántas veces aparece la contraseña en filtraciones conocidas: 0 si en
 * ninguna, o `null` si no se pudo consultar.
 */
export async function vecesFiltrada(contrasena: string): Promise<number | null> {
  const hash = createHash('sha1').update(contrasena.normalize('NFC'), 'utf8').digest('hex').toUpperCase()
  const prefijo = hash.slice(0, 5)
  try {
    const respuesta = await fetch(`https://api.pwnedpasswords.com/range/${prefijo}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'ORUM-cluborum.com' },
      signal: AbortSignal.timeout(PLAZO_MS),
      cache: 'no-store',
    })
    if (!respuesta.ok) return null
    return vecesEnRango(hash.slice(5), await respuesta.text())
  } catch {
    return null
  }
}
