import { createHash } from 'node:crypto'

/*
  Parte PURA del límite de uso: qué topes hay, cómo se construye la clave de un
  contador y cómo se saca la IP de una petición. Sin red ni `next/headers`, para
  poder probarla. El contacto con la base está en `limitador.ts`.
*/

export type Limite = { tope: number; ventanaSegundos: number }

const HORA = 60 * 60
const DIA = 24 * HORA

/**
 * Los topes, en un solo sitio. Se miden por VENTANA FIJA: pasada la ventana el
 * contador vuelve a cero.
 *
 * - `aliados`: el formulario envía un correo por solicitud. El tope por IP frena
 *   a un robot; el global del día es el techo de seguridad para la cuota de
 *   Google Workspace aunque el robot rote de IP.
 * - `recuperar`: por correo (o número de membresía) evita inundar un buzón
 *   ajeno; por IP evita barrer muchas cuentas desde un mismo sitio.
 * - `login`: cuenta intentos y se reinicia al acertar, así que en la práctica
 *   son fallos seguidos. El tope fino es por PAREJA cuenta + IP: quien insiste
 *   desde su conexión se bloquea a sí mismo, no al dueño de la cuenta (el número
 *   de membresía son 8 dígitos correlativos, fáciles de adivinar, y un tope por
 *   cuenta sola dejaría a cualquiera bloquear a un socio con 11 intentos). Por
 *   IP es más holgado: una oficina comparte salida. El de cuenta sola es solo un
 *   techo alto contra quien rota de IP: bloquear a un socio ajeno exige ahora
 *   resolver cien captchas, no once.
 */
export const LIMITES = {
  aliadosPorIp: { tope: 3, ventanaSegundos: HORA },
  aliadosGlobalDia: { tope: 30, ventanaSegundos: DIA },
  recuperarPorCuenta: { tope: 3, ventanaSegundos: HORA },
  recuperarPorIp: { tope: 10, ventanaSegundos: HORA },
  loginPorCuentaYIp: { tope: 10, ventanaSegundos: 15 * 60 },
  loginPorIp: { tope: 30, ventanaSegundos: 15 * 60 },
  loginPorCuenta: { tope: 100, ventanaSegundos: HORA },
  // Registro público con pago (23/11/2026): cada intento crea una cuenta y
  // manda un correo, así que se limita por IP, por correo y en total al día.
  registroPorIp: { tope: 5, ventanaSegundos: HORA },
  registroPorCorreo: { tope: 3, ventanaSegundos: HORA },
  registroGlobalDia: { tope: 300, ventanaSegundos: DIA },
  // Código de confirmación del correo: 6 dígitos son un millón de opciones, así
  // que pocos intentos por correo bastan para que adivinarlo sea imposible.
  codigoPorCorreo: { tope: 5, ventanaSegundos: 15 * 60 },
  codigoPorIp: { tope: 20, ventanaSegundos: 15 * 60 },
} as const satisfies Record<string, Limite>

/** Valor de `ipDeCabeceras` cuando la petición no trae ninguna IP (solo en local). */
export const IP_DESCONOCIDA = 'sin-ip'

/**
 * Huella de un dato personal (correo, número de membresía) para usarlo en una
 * clave sin guardarlo en claro en la tabla de contadores. Normaliza antes de
 * resumir: `Ana@X.com ` y `ana@x.com` son el mismo buzón y deben compartir tope.
 */
export function huella(valor: string): string {
  const normalizado = valor.trim().toLowerCase().normalize('NFC')
  return createHash('sha256').update(normalizado).digest('hex').slice(0, 32)
}

export type TipoClave = 'ip' | 'cuenta' | 'cuenta-ip' | 'global'

/** Clave de un contador: `accion:tipo:valor`. */
export function claveCupo(accion: string, tipo: TipoClave, valor: string): string {
  return `${accion}:${tipo}:${valor}`
}

const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/

/** Expande una IPv6 a sus 8 grupos de 16 bits, o `null` si no es válida. */
function expandirIpv6(ip: string): string[] | null {
  if (!/^[0-9a-f:]+$/i.test(ip) || ip.split('::').length > 2) return null

  const [cabeza, cola] = ip.split('::')
  const grupos = (parte: string | undefined) => (parte ? parte.split(':') : [])
  const delante = grupos(cabeza)
  const detras = grupos(cola)

  let completos: string[]
  if (ip.includes('::')) {
    const faltan = 8 - delante.length - detras.length
    if (faltan < 1) return null
    completos = [...delante, ...Array<string>(faltan).fill('0'), ...detras]
  } else {
    completos = delante
  }

  if (completos.length !== 8 || completos.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null
  return completos.map((g) => g.toLowerCase().replace(/^0+(?=.)/, ''))
}

/**
 * Normaliza una IP para usarla como clave. IPv4 queda igual. IPv6 se reduce a
 * su prefijo /64: a una sola conexión doméstica le asignan un /64 entero (más
 * de 18 trillones de direcciones), y limitar por dirección completa dejaría a
 * un atacante rotar de IP sin coste. Devuelve `null` si no parece una IP.
 */
export function normalizarIp(ip: string): string | null {
  const limpia = ip.trim()
  if (IPV4.test(limpia)) {
    return limpia.split('.').every((n) => Number(n) <= 255) ? limpia : null
  }
  const grupos = expandirIpv6(limpia)
  return grupos ? `${grupos.slice(0, 4).join(':')}::/64` : null
}

/**
 * IP del cliente a partir de las cabeceras.
 *
 * ⚠️ NO se usa `cf-connecting-ip` aquí (sí la usa Turnstile, donde solo es una
 * pista opcional): Cloudflare está en nube gris, el tráfico va directo a
 * Vercel y esa cabecera la puede poner cualquiera a mano. Quien la falsee se
 * saltaría el límite con solo cambiarla en cada petición.
 *
 * Vercel sobrescribe `x-vercel-forwarded-for` / `x-real-ip` / `x-forwarded-for`
 * con la IP real de la conexión, no añade a lo que mande el cliente. Se prefiere
 * en ese orden, y de `x-forwarded-for` se toma la primera entrada.
 */
export function ipDeCabeceras(leer: (nombre: string) => string | null): string {
  const candidatas = [
    leer('x-vercel-forwarded-for'),
    leer('x-real-ip'),
    leer('x-forwarded-for')?.split(',')[0] ?? null,
  ]
  for (const candidata of candidatas) {
    const ip = candidata ? normalizarIp(candidata) : null
    if (ip) return ip
  }
  return IP_DESCONOCIDA
}
