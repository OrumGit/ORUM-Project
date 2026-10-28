import { describe, expect, it } from 'vitest'
import {
  MENSAJE_MAXIMO,
  esTablaAusente,
  etiquetaEstrellas,
  formatearPromedio,
  nombreCorto,
  promedio,
  revisarEstrellas,
  revisarMensaje,
  revisarRespuesta,
} from './resenas'

describe('revisarEstrellas', () => {
  it('acepta un entero de 1 a 5', () => {
    expect(revisarEstrellas(5)).toEqual({ ok: true, estrellas: 5 })
  })
  it('acepta el texto de un entero (viene de un formulario)', () => {
    expect(revisarEstrellas('3')).toEqual({ ok: true, estrellas: 3 })
  })
  it('rechaza fuera de rango, decimales y basura', () => {
    for (const malo of [0, 6, -1, 2.5, 'x', '', null, undefined, NaN]) {
      expect(revisarEstrellas(malo).ok).toBe(false)
    }
  })
})

describe('revisarMensaje', () => {
  it('vacío o solo espacios queda en null', () => {
    expect(revisarMensaje('  ')).toEqual({ ok: true, mensaje: null })
  })
  it('colapsa espacios pero conserva un salto de línea simple', () => {
    expect(revisarMensaje('  hola   mundo \n\n\n gracias ')).toEqual({
      ok: true,
      mensaje: 'hola mundo\ngracias',
    })
  })
  it('rechaza más de 500 caracteres y acepta justo 500', () => {
    expect(revisarMensaje('a'.repeat(MENSAJE_MAXIMO + 1)).ok).toBe(false)
    expect(revisarMensaje('a'.repeat(MENSAJE_MAXIMO)).ok).toBe(true)
  })
  it('rechaza enlaces', () => {
    expect(revisarMensaje('mira https://x.com').ok).toBe(false)
    expect(revisarMensaje('entra a www.x.com').ok).toBe(false)
  })
  it('rechaza marcado', () => {
    expect(revisarMensaje('<b>hola</b>').ok).toBe(false)
    expect(revisarMensaje('[a](b)').ok).toBe(false)
  })
})

describe('revisarRespuesta', () => {
  it('es obligatoria', () => {
    expect(revisarRespuesta('   ').ok).toBe(false)
  })
  it('aplica las mismas reglas de enlaces y largo', () => {
    expect(revisarRespuesta('ver http://x.co').ok).toBe(false)
    expect(revisarRespuesta('a'.repeat(MENSAJE_MAXIMO + 1)).ok).toBe(false)
    expect(revisarRespuesta(' Gracias por venir ')).toEqual({
      ok: true,
      respuesta: 'Gracias por venir',
    })
  })
})

describe('promedio', () => {
  it('redondea a un decimal', () => {
    expect(promedio([5, 4])).toBe(4.5)
    expect(promedio([5, 4, 4])).toBe(4.3)
  })
  it('vacío es null', () => {
    expect(promedio([])).toBeNull()
  })
})

describe('formatearPromedio', () => {
  it('usa coma decimal y raya para null', () => {
    expect(formatearPromedio(4.5)).toBe('4,5')
    expect(formatearPromedio(4)).toBe('4,0')
    expect(formatearPromedio(null)).toBe('—')
  })
})

describe('nombreCorto', () => {
  it('primer nombre y inicial del primer apellido', () => {
    expect(nombreCorto('maría','gómez')).toBe('María G.')
    expect(nombreCorto('Ana Lucía', 'de la Cruz Pérez')).toBe('Ana D.')
  })
  it('sin apellido, solo el nombre', () => {
    expect(nombreCorto('Ana', '')).toBe('Ana')
  })
})

describe('esTablaAusente', () => {
  it('reconoce los códigos de tabla inexistente', () => {
    expect(esTablaAusente({ code: '42P01' })).toBe(true)
    expect(esTablaAusente({ code: 'PGRST205' })).toBe(true)
    expect(esTablaAusente({ code: '23505' })).toBe(false)
    expect(esTablaAusente(null)).toBe(false)
    expect(esTablaAusente(undefined)).toBe(false)
  })
})

import { resumenDeConteos } from './resenas'

describe('resumenDeConteos', () => {
  it('sin reseñas: total 0 y sin promedio', () => {
    expect(resumenDeConteos([0, 0, 0, 0, 0])).toEqual({ total: 0, promedio: null })
  })
  it('promedia a un decimal', () => {
    // 1x5, 1x4, 1x3 => 4
    expect(resumenDeConteos([0, 0, 1, 1, 1])).toEqual({ total: 3, promedio: 4 })
    // 2x5 + 1x4 => 4,67 -> 4,7
    expect(resumenDeConteos([0, 0, 0, 1, 2])).toEqual({ total: 3, promedio: 4.7 })
  })
  it('no se trunca a 1000', () => {
    expect(resumenDeConteos([0, 0, 0, 0, 1500]).total).toBe(1500)
  })
})

describe('etiquetaEstrellas', () => {
  it('nombra cada calificación de 1 a 5', () => {
    expect([1, 2, 3, 4, 5].map(etiquetaEstrellas)).toEqual(['Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'])
  })

  it('fuera de la escala no dice nada', () => {
    expect(etiquetaEstrellas(0)).toBe('')
    expect(etiquetaEstrellas(6)).toBe('')
    expect(etiquetaEstrellas(2.5)).toBe('')
    expect(etiquetaEstrellas(-1)).toBe('')
  })
})
