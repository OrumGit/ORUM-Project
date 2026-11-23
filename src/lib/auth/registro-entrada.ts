import { cedula, nombrePersona, telefono } from '../validacion/reglas'
import { palabrasDeContexto, revisarContrasena } from './contrasena-segura'
import { correoParaRegistro } from './correo-registro'
import { revisarDireccion } from '../aliados/solicitud-aliado'

/**
 * Validación de los datos del registro público. Pura: el servidor la usa antes
 * de tocar nada, y el formulario usa las mismas reglas al salir de cada campo.
 */

export type EntradaRegistro = {
  nombres: string
  apellidos: string
  cedula: string
  correo: string
  telefono: string
  ciudadId: string
  direccion: string
  contrasena: string
  /**
   * «Repítela». Si viene, tiene que ser igual a `contrasena` (el navegador ya
   * lo comprueba; el servidor no se fía). Ausente = no se pidió.
   */
  confirmar?: string
  planId: string
  terminosAceptados: boolean
}

export type CampoRegistro =
  | 'nombres'
  | 'apellidos'
  | 'cedula'
  | 'correo'
  | 'telefono'
  | 'ciudadId'
  | 'direccion'
  | 'contrasena'
  | 'confirmar'
  | 'planId'
  | 'terminos'

export type ErroresRegistro = Partial<Record<CampoRegistro, string>>

export type DatosRegistro = {
  nombres: string
  apellidos: string
  cedula: string
  correo: string
  telefono: string | null
  ciudadId: number
  direccion: string
  contrasena: string
  planId: number
}

export type ResultadoEntrada =
  | { ok: true; datos: DatosRegistro }
  | { ok: false; errores: ErroresRegistro }

const PLAN_ID = /^[1-9]\d{0,17}$/
const CIUDAD_ID = /^[1-9]\d{0,8}$/

export function validarEntradaRegistro(entrada: EntradaRegistro): ResultadoEntrada {
  const errores: ErroresRegistro = {}

  const nombres = entrada.nombres.trim()
  const apellidos = entrada.apellidos.trim()
  const cedulaLimpia = entrada.cedula.replace(/[.\s]/g, '')
  const telefonoLimpio = entrada.telefono.replace(/[\s-]/g, '')

  // Las reglas del formulario reciben también el resto de campos; aquí no
  // hay dependencias entre campos, así que se pasa un objeto vacío.
  const sinOtros: Record<string, string> = {}

  if (nombres === '') errores.nombres = 'Escribe tus nombres.'
  else errores.nombres = nombrePersona(nombres, sinOtros) ?? undefined

  if (apellidos === '') errores.apellidos = 'Escribe tus apellidos.'
  else errores.apellidos = nombrePersona(apellidos, sinOtros) ?? undefined

  if (cedulaLimpia === '') errores.cedula = 'Escribe tu número de cédula.'
  else errores.cedula = cedula(cedulaLimpia, sinOtros) ?? undefined

  const correo = correoParaRegistro(entrada.correo)
  if (!correo.ok) errores.correo = correo.error

  // El celular es obligatorio desde el diseño aprobado del 23/11/2026: es
  // por donde el club contacta al socio (y lo pide la ficha del panel).
  if (telefonoLimpio === '') errores.telefono = 'Escribe tu celular.'
  else errores.telefono = telefono(telefonoLimpio, sinOtros) ?? undefined

  // La contraseña no puede contener los datos de la persona: se pasan como
  // palabras sueltas, no como frases, para que «Gómez» dé con «gomez».
  const contexto = palabrasDeContexto([
    nombres,
    apellidos,
    cedulaLimpia,
    correo.ok ? correo.correo : null,
  ])
  const revision = revisarContrasena(entrada.contrasena, contexto)
  if (!revision.ok) errores.contrasena = revision.mensaje

  if (entrada.confirmar !== undefined && entrada.confirmar !== entrada.contrasena) {
    errores.confirmar =
      entrada.confirmar === '' ? 'Repite la contraseña.' : 'Las dos contraseñas no coinciden.'
  }

  if (!CIUDAD_ID.test(entrada.ciudadId)) errores.ciudadId = 'Elige tu ciudad.'

  const direccion = entrada.direccion.trim()
  if (direccion === '') errores.direccion = 'Escribe tu dirección.'
  else errores.direccion = revisarDireccion(direccion) ?? undefined

  if (!PLAN_ID.test(entrada.planId)) errores.planId = 'Elige un plan.'

  if (!entrada.terminosAceptados) {
    errores.terminos = 'Debes aceptar los términos y la política de tratamiento de datos.'
  }

  // Solo los campos con error: los que pasan no aparecen en el objeto.
  const conError = Object.fromEntries(
    Object.entries(errores).filter(([, mensaje]) => mensaje !== undefined),
  ) as ErroresRegistro

  if (Object.keys(conError).length > 0 || !correo.ok) {
    return { ok: false, errores: conError }
  }

  return {
    ok: true,
    datos: {
      nombres,
      apellidos,
      cedula: cedulaLimpia,
      correo: correo.correo,
      telefono: telefonoLimpio === '' ? null : telefonoLimpio,
      ciudadId: Number(entrada.ciudadId),
      direccion,
      contrasena: entrada.contrasena,
      planId: Number(entrada.planId),
    },
  }
}
