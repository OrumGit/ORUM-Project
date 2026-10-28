/*
  UNA CONTRASEÑA NUEVA, SEGURA  ·  funciones puras (27/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «analiza los campos donde se crean contraseñas,
  investiga en sitios oficiales las mejores prácticas y pon una excepción
  para que el usuario no pueda poner una contraseña insegura».

  Lo que dicen las fuentes oficiales, y lo que se tomó de cada una:

    · NIST SP 800-63B-4 (2025), §3.1.1.2. Lo que manda es la LONGITUD, no la
      mezcla: «SHALL NOT impose other composition rules» (nada de «una
      mayúscula, un número y un símbolo»). Comparar la contraseña entera con
      una lista de bloqueo —las más usadas, las filtradas y las palabras del
      contexto: el nombre del servicio, el del usuario y sus derivados— y,
      si se rechaza, DECIR POR QUÉ. Aceptar espacios y cualquier carácter,
      contar cada carácter Unicode como uno, no truncar, admitir al menos 64
      y permitir pegar y gestores de contraseñas.
    · OWASP Authentication Cheat Sheet: lo mismo, más revisar las
      contraseñas filtradas contra Pwned Passwords (eso vive aparte, en
      `contrasena-filtrada.ts`, porque necesita la red y el servidor) y un
      medidor que guíe hacia frases largas.

  La longitud mínima: NIST pide 15 caracteres cuando la contraseña es el
  único factor (ORUM no tiene un segundo factor) y 8 si hay otro; OWASP ASVS
  pide 8 y recomienda 15. Aquí son 12, y se dice abiertamente: con la lista
  de bloqueo, los derivados y la revisión de filtraciones, 12 corta los
  ataques reales sin echar atrás a un socio que escribe desde el teléfono.
  Subirla a 15 es cambiar UNA constante.

  El tope de 72 BYTES no es capricho: Supabase guarda la contraseña con
  bcrypt, que solo mira los primeros 72 bytes. Una contraseña más larga se
  truncaría en silencio —lo que NIST prohíbe—, así que se avisa antes.

  Todo esto lo usan el campo del navegador (para guiar mientras se escribe)
  y las acciones del servidor (que son las que deciden).
*/

/** Mínimo de caracteres. Subirlo a 15 es lo que pide NIST sin segundo factor. */
export const LONGITUD_MINIMA = 12

/** bcrypt solo mira los primeros 72 bytes: más se truncaría en silencio. */
export const BYTES_MAXIMOS = 72

export type MotivoRechazo =
  | 'vacia'
  | 'corta'
  | 'larga'
  | 'comun'
  | 'repetida'
  | 'secuencia'
  | 'personal'

export type Revision = { ok: true } | { ok: false; motivo: MotivoRechazo; mensaje: string }

/* --- La lista de bloqueo ------------------------------------------------------ */

/*
  Las BASES que la gente decora con números y símbolos para «cumplir»
  («Contraseña2024!», «Colombia123*»). Se comparan SIN tildes, en minúscula y
  quitando lo que no es letra. NIST pide comparar la contraseña entera y sus
  derivados de contexto; estas son las raíces más repetidas en las filtraciones
  públicas, en inglés y en español de Colombia.
*/
const BASES_COMUNES = new Set([
  // Genéricas, en los dos idiomas.
  'password', 'passw', 'contrasena', 'clave', 'secreto', 'secret', 'admin',
  'administrador', 'usuario', 'user', 'login', 'welcome', 'bienvenido',
  'bienvenida', 'qwerty', 'asdf', 'abc', 'abcd', 'iloveyou', 'teamo',
  'tequiero', 'amor', 'amorcito', 'princesa', 'princess', 'monkey', 'dragon',
  'master', 'shadow', 'sunshine', 'football', 'baseball', 'superman',
  'batman', 'starwars', 'pokemon', 'letmein', 'hola', 'holamundo', 'mama',
  'papa', 'familia', 'dios', 'diosesamor', 'jesus', 'cristo', 'angel',
  'angelito', 'estrella', 'mariposa', 'chocolate', 'computador',
  'computadora', 'celular', 'internet',
  // Colombia y el fútbol.
  'colombia', 'bogota', 'medellin', 'cali', 'barranquilla', 'cartagena',
  'tulua', 'futbol', 'millonarios', 'nacional', 'americadecali', 'america',
  'santafe', 'junior', 'deportivo', 'seleccion',
  // El propio servicio: NIST lo pide expresamente.
  'orum', 'cluborum', 'clubdebeneficios', 'beneficios', 'miembro', 'socio',
  'comercio', 'aliado',
])

/** Filas del teclado y series que se recorren con el dedo, al derecho y al revés. */
const SERIES = [
  'qwertyuiopasdfghjklzxcvbnm',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'qazwsxedcrfvtgbyhnujmikolp',
  'abcdefghijklmnopqrstuvwxyz',
  '1234567890',
  '01234567890',
  '0987654321',
]

/** Minúsculas y sin tildes: «Contraseña» y «contrasena» son la misma palabra. */
export function plegar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Cuántos caracteres cuenta una persona (cada carácter Unicode, uno). */
export function largo(contrasena: string): number {
  return [...contrasena.normalize('NFC')].length
}

function bytes(contrasena: string): number {
  return new TextEncoder().encode(contrasena.normalize('NFC')).length
}

/** Solo letras y números, plegado: lo que queda cuando se quita la «decoración». */
function nucleo(contrasena: string): string {
  return plegar(contrasena).replace(/[^\p{L}\p{N}]/gu, '')
}


/** Toda la contraseña es un mismo trozo corto repetido: «aaaa…», «abcabc…», «1212…». */
function esRepeticion(texto: string): boolean {
  return /^(.{1,4})\1+$/u.test(texto) || new Set(texto).size < 5
}

/** Toda la contraseña es un tramo de una serie del teclado o del alfabeto. */
function esSerie(texto: string): boolean {
  if (texto.length < 6) return false
  return SERIES.some((serie) => {
    const ida = serie + serie
    const vuelta = [...ida].reverse().join('')
    return esTramoRepetido(texto, ida) || esTramoRepetido(texto, vuelta)
  })
}

/** El texto se escribe recorriendo la serie (puede dar más de una vuelta). */
function esTramoRepetido(texto: string, serie: string): boolean {
  const inicio = serie.indexOf(texto[0])
  if (inicio < 0) return false
  for (let i = 0; i < texto.length; i++) {
    if (serie[(inicio + i) % serie.length] !== texto[i]) return false
  }
  return true
}

/**
 * Las palabras del contexto que no pueden ser la contraseña: el nombre de la
 * persona, su correo (lo de antes de la @, y por partes), su cédula. Se
 * pliegan y se descartan las de menos de 3 letras, que casarían con cualquier
 * cosa.
 */
export function palabrasDeContexto(datos: readonly (string | null | undefined)[]): string[] {
  const palabras = new Set<string>()
  for (const dato of datos) {
    if (!dato) continue
    const usuario = dato.includes('@') ? dato.slice(0, dato.indexOf('@')) : dato
    const entera = nucleo(usuario)
    if (entera.length >= 3) palabras.add(entera)
    for (const parte of plegar(usuario).split(/[^\p{L}\p{N}]+/u)) {
      if (parte.length >= 3) palabras.add(parte)
    }
  }
  return [...palabras]
}

/**
 * ¿La contraseña es una base conocida o una palabra del contexto, decorada con
 * números y símbolos? «Colombia2024!» y «Maria.Perez1990» caen aquí; «mi
 * perro toby come arepas» no, porque le sobran palabras.
 */
function esDerivadoDe(contrasena: string, palabras: Iterable<string>): boolean {
  // Se quitan TODAS las apariciones de todas las palabras, de la más larga a
  // la más corta («ColombiaColombia», «TeAmoAmor», «MariaPerez1990»), y luego
  // los números. Si apenas queda nada, la contraseña era solo eso.
  const ordenadas = [...palabras].filter((p) => p.length >= 3).sort((a, b) => b.length - a.length)
  let resto = nucleo(contrasena)
  for (const palabra of ordenadas) resto = resto.split(palabra).join('')
  if (resto === nucleo(contrasena)) return false
  return resto.replace(/\p{N}/gu, '').length <= 2
}

/* --- La revisión -------------------------------------------------------------- */

/**
 * Revisa una contraseña NUEVA. `contexto` son las palabras propias de quien la
 * elige (`palabrasDeContexto`). Devuelve el PRIMER motivo de rechazo con un
 * mensaje que dice qué cambiar —NIST pide decir por qué se rechaza—, o `ok`.
 * Lo que no mira aquí: si la contraseña está filtrada (`contrasena-filtrada.ts`).
 */
export function revisarContrasena(contrasena: string, contexto: readonly string[] = []): Revision {
  if (contrasena === '') {
    return { ok: false, motivo: 'vacia', mensaje: 'Escribe una contraseña.' }
  }
  const n = largo(contrasena)
  if (n < LONGITUD_MINIMA) {
    const faltan = LONGITUD_MINIMA - n
    return {
      ok: false,
      motivo: 'corta',
      mensaje: `Debe tener al menos ${LONGITUD_MINIMA} caracteres (te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}). Una frase corta es más fácil de recordar.`,
    }
  }
  if (bytes(contrasena) > BYTES_MAXIMOS) {
    return {
      ok: false,
      motivo: 'larga',
      mensaje: 'Es demasiado larga: usa como máximo 64 caracteres (menos si lleva emojis o letras especiales).',
    }
  }

  const todo = nucleo(contrasena)
  if (esRepeticion(todo) || esRepeticion(plegar(contrasena))) {
    return {
      ok: false,
      motivo: 'repetida',
      mensaje: 'Repite los mismos caracteres. Usa palabras distintas.',
    }
  }
  if (esSerie(todo)) {
    return {
      ok: false,
      motivo: 'secuencia',
      mensaje: 'Sigue el orden del teclado o del alfabeto. Es de lo primero que se prueba.',
    }
  }
  if (esDerivadoDe(contrasena, contexto)) {
    return {
      ok: false,
      motivo: 'personal',
      mensaje: 'Se parece a tu nombre, tu correo o tu documento. Elige algo que no se adivine con tus datos.',
    }
  }
  if (esDerivadoDe(contrasena, BASES_COMUNES)) {
    return {
      ok: false,
      motivo: 'comun',
      mensaje: 'Es una contraseña muy común, aunque lleve números o símbolos. Prueba con una frase propia.',
    }
  }
  return { ok: true }
}

/* --- La guía mientras se escribe --------------------------------------------- */

export type Requisito = {
  clave: 'largo' | 'patron' | 'comun'
  texto: string
  cumple: boolean
}

/**
 * Los tres requisitos que se enseñan con su marca mientras se escribe. Son
 * los mismos que decide `revisarContrasena`, agrupados en lo que una persona
 * entiende de un vistazo.
 */
export function requisitos(contrasena: string, contexto: readonly string[] = []): Requisito[] {
  const revision = revisarContrasena(contrasena, contexto)
  const motivo = revision.ok ? null : revision.motivo
  const largoOk = contrasena !== '' && largo(contrasena) >= LONGITUD_MINIMA && motivo !== 'larga'
  const vacia = contrasena === ''
  return [
    { clave: 'largo', texto: `${LONGITUD_MINIMA} caracteres o más`, cumple: largoOk },
    {
      clave: 'patron',
      texto: 'Sin repeticiones ni series (1234, qwerty)',
      cumple: !vacia && motivo !== 'repetida' && motivo !== 'secuencia',
    },
    {
      clave: 'comun',
      texto: 'Ni común ni con tus datos',
      cumple: !vacia && motivo !== 'comun' && motivo !== 'personal',
    },
  ]
}

export type NivelFortaleza = 'vacia' | 'insegura' | 'aceptable' | 'buena' | 'excelente'

export type Fortaleza = {
  nivel: NivelFortaleza
  /** 0–4, para pintar los segmentos. */
  puntuacion: number
  /** ¿Se puede guardar? (lo que diga el servidor sobre filtraciones aparte). */
  valida: boolean
}

/**
 * Cuánto resiste, para el medidor. Lo que suma es la LONGITUD y que haya
 * varias palabras —no la mezcla de mayúsculas y símbolos, que NIST desaconseja
 * exigir—. Una contraseña que no pasa la revisión es «insegura», por larga
 * que sea.
 */
export function evaluarFortaleza(contrasena: string, contexto: readonly string[] = []): Fortaleza {
  if (contrasena === '') return { nivel: 'vacia', puntuacion: 0, valida: false }
  const revision = revisarContrasena(contrasena, contexto)
  if (!revision.ok) return { nivel: 'insegura', puntuacion: 1, valida: false }

  const n = largo(contrasena)
  const palabras = plegar(contrasena).split(/[^\p{L}]+/u).filter((p) => p.length >= 3).length
  const variedad = [/\p{Ll}/u, /\p{Lu}/u, /\p{N}/u, /[^\p{L}\p{N}]/u].filter((r) =>
    r.test(contrasena),
  ).length

  let puntos = 2
  if (n >= 16 || (n >= 14 && (palabras >= 3 || variedad >= 3))) puntos = 3
  if (n >= 20 || (n >= 16 && (palabras >= 4 || variedad >= 3))) puntos = 4

  return {
    nivel: puntos >= 4 ? 'excelente' : puntos === 3 ? 'buena' : 'aceptable',
    puntuacion: puntos,
    valida: true,
  }
}

/** El mensaje cuando la contraseña aparece en filtraciones (lo decide el servidor). */
export const MENSAJE_FILTRADA =
  'Esta contraseña aparece en filtraciones de datos conocidas, así que ya está en las listas de los atacantes. Elige otra.'
