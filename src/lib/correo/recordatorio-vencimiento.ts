/**
 * Correo de recordatorio: «tu membresía vence pronto». Puro: arma asunto, HTML y
 * texto; el envío lo hace la ruta del cron con `enviarCorreoConResultado`.
 *
 * Con pago único el socio paga a mano, así que el correo dice qué hacer y cuándo
 * vence, y lleva al portal donde se paga.
 */

import { escaparHtml } from '../shared/html'
import { envolverCorreo, parrafo, parrafoSecundario } from './plantilla'
import type { CuerpoCorreo } from './correo'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** 'YYYY-MM-DD' → '5 de diciembre de 2026'. Sin zona horaria: es una fecha civil. */
export function fechaCivilLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]} de ${anio}`
}

export type InputCorreoRecordatorio = {
  nombre: string
  /** Fecha civil 'YYYY-MM-DD' en la que vence la membresía. */
  fechaFin: string
  /** Días que faltan para el vencimiento. */
  dias: number
  /** Dirección del portal de miembros, donde el socio paga. */
  urlPortal: string
}

export function construirCorreoRecordatorio(input: InputCorreoRecordatorio): CuerpoCorreo {
  const nombre = escaparHtml(input.nombre)
  const vence = fechaCivilLarga(input.fechaFin)
  const asunto = `Tu membresía ORUM vence el ${vence}`

  const html = envolverCorreo({
    titulo: 'Tu membresía vence pronto',
    preheader: `Vence el ${vence}. Renuévala a tiempo para no perder el acceso.`,
    cuerpoHtml:
      parrafo(`Hola ${nombre},`) +
      parrafo(
        `Tu membresía de ORUM vence el <strong>${vence}</strong>, en ${input.dias} ${input.dias === 1 ? 'día' : 'días'}. Para seguir disfrutando de tus beneficios, renuévala antes de esa fecha.`,
      ),
    boton: { texto: 'Renovar mi membresía', url: input.urlPortal },
    cierreHtml: parrafoSecundario(
      'Si ya la renovaste, puedes ignorar este correo. Después del vencimiento tu acceso se desactiva hasta que pagues de nuevo.',
    ),
  })

  const texto = [
    `Hola ${input.nombre},`,
    '',
    `Tu membresía de ORUM vence el ${vence}, en ${input.dias} ${input.dias === 1 ? 'día' : 'días'}.`,
    'Renuévala antes de esa fecha para no perder el acceso:',
    '',
    input.urlPortal,
    '',
    'Si ya la renovaste, puedes ignorar este correo.',
  ].join('\n')

  return { asunto, html, texto }
}
