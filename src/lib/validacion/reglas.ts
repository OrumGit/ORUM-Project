/*
  LAS REGLAS DE LOS FORMULARIOS DEL PANEL  ·  puro (15/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «el administrador no tiene facilidades, sus
  formularios no tienen excepciones». Cada regla recibe el valor de un campo
  (y el resto del formulario, para las que comparan dos campos) y devuelve el
  MENSAJE de lo que falla, o `null` si está bien. Los mensajes dicen qué
  hacer, no solo qué está mal.

  Las del teléfono, el correo y el enlace son las mismas del formulario
  público de aliados (`lib/aliados/solicitud-aliado.ts`): un dato que no vale
  allí tampoco vale aquí.

  Esto es la primera barrera, en el navegador, para avisar al momento. El
  servidor sigue validando por su cuenta: es él quien decide.
*/

import { enlaceValido, revisarCorreo, soloDigitos, telefonoValido } from '../aliados/solicitud-aliado'
import { revisarContrasena } from '../auth/contrasena-segura'

/** Los valores del formulario, por nombre de campo. */
export type Valores = Record<string, string>

/** Devuelve el mensaje de error, o `null` si el valor vale. */
export type Regla = (valor: string, todos: Valores) => string | null

const vacio = (v: string) => v.trim() === ''

/** El mismo carácter cuatro veces seguidas: relleno («aaaa»). */
const relleno = (v: string) => /(.)\1{3,}/u.test(v)

/* --- Generales ---------------------------------------------------------------- */

/**
 * Una membresía de cortesía no se cobra: con la casilla `es_cortesia` marcada,
 * la regla del precio no se aplica (el campo ni siquiera se pinta).
 */
export function salvoCortesia(regla: Regla): Regla {
  return (v, todos) => (todos.es_cortesia ? null : regla(v, todos))
}


export function obligatorio(mensaje = 'Este campo es obligatorio.'): Regla {
  return (v) => (vacio(v) ? mensaje : null)
}

/** Largo de un texto libre. Vacío pasa: para exigirlo, añade `obligatorio`. */
export function largo(min: number, max: number, que = 'El texto'): Regla {
  return (v) => {
    const t = v.trim()
    if (t === '') return null
    if (t.length < min) return `${que} es muy corto: al menos ${min} caracteres.`
    if (t.length > max) return `${que} no puede pasar de ${max} caracteres.`
    if (relleno(t)) return `${que} no parece real: revisa que no haya letras repetidas de relleno.`
    return null
  }
}

/* --- Personas ------------------------------------------------------------------- */

/** Nombres o apellidos: solo letras (con tildes y ñ), espacios, apóstrofos y guiones. */
export const nombrePersona: Regla = (v) => {
  const t = v.trim()
  if (t === '') return null
  if (t.length < 2) return 'Escribe el nombre completo, no solo una inicial.'
  if (t.length > 60) return 'No puede pasar de 60 caracteres.'
  if (!/^[\p{L}][\p{L} '’.-]*$/u.test(t)) return 'Usa solo letras: sin números ni símbolos.'
  if (relleno(t)) return 'No parece un nombre real: revisa las letras repetidas.'
  return null
}

/** Cédula colombiana: de 5 a 10 cifras, sin puntos ni espacios. */
export const cedula: Regla = (v) => {
  const t = v.trim()
  if (t === '') return null
  if (/[^\d.\s]/.test(t)) return 'Usa solo números: sin letras ni guiones.'
  const d = soloDigitos(t)
  if (d.length < 5 || d.length > 10) return 'Debe tener entre 5 y 10 cifras.'
  if (/^(\d)\1+$/.test(d)) return 'No parece una cédula real: todas las cifras son iguales.'
  return null
}

/** Teléfono colombiano (celular 3… o fijo 60X…), 10 cifras. Vacío pasa. */
export const telefono: Regla = (v) => {
  if (vacio(v)) return null
  return telefonoValido(v)
    ? null
    : 'Escribe un celular de 10 cifras que empiece por 3, o un fijo con su indicativo (60…).'
}

/** Correo con forma entregable, sin dominios mal escritos ni desechables. Vacío pasa. */
export const correo: Regla = (v) => {
  if (vacio(v)) return null
  return revisarCorreo(v) ? revisarCorreo(v) : null
}

/* --- Números y dinero ------------------------------------------------------------- */

/** Un entero entre `min` y `max`. Vacío pasa. */
export function entero(min: number, max: number, que = 'El número'): Regla {
  return (v) => {
    const t = v.trim()
    if (t === '') return null
    if (!/^-?\d+$/.test(t)) return `${que} debe ser un número entero, sin puntos ni comas.`
    const n = Number(t)
    if (n < min) return `${que} debe ser como mínimo ${min.toLocaleString('es-CO')}.`
    if (n > max) return `${que} no puede pasar de ${max.toLocaleString('es-CO')}.`
    return null
  }
}

/**
 * Un precio en pesos, razonable. Admite «120.000». Vacío pasa. Con
 * `admiteCero`, vale 0 (una renovación de cortesía); si no, tiene que ser mayor.
 */
export function precio(max = 50_000_000, admiteCero = false): Regla {
  return (v) => {
    const t = v.trim()
    if (t === '') return null
    const n = leerPesos(t)
    if (!/^[$\s\d.,]+$/.test(t) || !Number.isFinite(n)) return 'Escribe el valor en pesos, solo con números.'
    if (n < 0 || (n === 0 && !admiteCero)) return 'El valor tiene que ser mayor que cero.'
    if (n > max) return `El valor no puede pasar de $ ${max.toLocaleString('es-CO')}.`
    return null
  }
}

/** Un porcentaje de 1 a 100. Vacío pasa. */
export const porcentaje: Regla = (v) => {
  const t = v.trim().replace('%', '')
  if (t === '') return null
  if (!/^\d+([.,]\d+)?$/.test(t)) return 'Escribe solo el número del porcentaje (por ejemplo, 15).'
  const n = Number(t.replace(',', '.'))
  if (n <= 0 || n > 100) return 'El porcentaje tiene que estar entre 1 y 100.'
  return null
}

/* --- Fechas -------------------------------------------------------------------------- */

/** Una fecha 'AAAA-MM-DD' que existe. Vacío pasa. */
export const fecha: Regla = (v) => {
  const t = v.trim()
  if (t === '') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (!m) return 'Elige una fecha válida.'
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const f = new Date(Date.UTC(a, mes - 1, d))
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) {
    return 'Esa fecha no existe.'
  }
  return null
}

/** La fecha de este campo no puede ser anterior a la de `otroCampo`. */
export function noAntesDe(otroCampo: string, mensaje: string): Regla {
  return (v, todos) => {
    const otra = (todos[otroCampo] ?? '').trim()
    if (v.trim() === '' || otra === '') return null
    return v.trim() < otra ? mensaje : null
  }
}

/* --- Web y acceso ---------------------------------------------------------------------- */

/** Una dirección web pública (se acepta sin «https://»). Vacío pasa. */
export const enlace: Regla = (v) =>
  enlaceValido(v) ? null : 'Escribe una dirección web válida, por ejemplo instagram.com/tucomercio.'

/**
 * Contraseña NUEVA: la misma política de toda la app (`lib/auth/contrasena-segura.ts`,
 * NIST y OWASP): largo, sin series ni repeticiones, ni común. Vacío pasa.
 */
export const contrasena: Regla = (v) => {
  if (v === '') return null
  const revision = revisarContrasena(v)
  return revision.ok ? null : revision.mensaje
}

/** Este campo debe ser igual a `otroCampo` (repetir la contraseña). */
export function igualA(otroCampo: string, mensaje: string): Regla {
  return (v, todos) => (v !== '' && v !== (todos[otroCampo] ?? '') ? mensaje : null)
}

/* --- Ejecutar ----------------------------------------------------------------------------- */

export type ReglasFormulario = Record<string, readonly Regla[]>

/** El primer error de un campo, o `null`. */
export function errorDe(campo: string, reglas: ReglasFormulario, todos: Valores): string | null {
  for (const regla of reglas[campo] ?? []) {
    const error = regla(todos[campo] ?? '', todos)
    if (error) return error
  }
  return null
}

/** Todos los errores del formulario, en el orden en que se declararon los campos. */
export function validarTodo(reglas: ReglasFormulario, todos: Valores): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const campo of Object.keys(reglas)) {
    const error = errorDe(campo, reglas, todos)
    if (error) errores[campo] = error
  }
  return errores
}

/**
 * Lee un valor en pesos tal como lo escribe la gente («$ 120.000», «120000»)
 * y devuelve el número, o `NaN` si no es un valor. Lo usan las acciones del
 * servidor, para aceptar lo mismo que la regla `precio`.
 */
export function leerPesos(valor: FormDataEntryValue | null): number {
  let t = String(valor ?? '').replace(/[$\s]/g, '')
  if (t === '') return NaN
  // Puntos de miles («120.000», «1.200.000»): fuera. Si no, el punto es decimal.
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '')
  return Number(t.replace(',', '.'))
}
