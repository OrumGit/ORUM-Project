import { describe, expect, it } from 'vitest'
import {
  aplicaAhora,
  cuandoUsarlo,
  textoDisponibilidad,
  partesDisponibilidad,
  diasDeFranjas,
  estadoPromocion,
  leerFranjasDelFormulario,
  lineasFranjas,
  normalizarFranjas,
  textoDiasCorto,
  textoEstadoPromocion,
  textoRango,
  validarFranjas,
} from './franjas-promocion'

/** Un instante a esta hora de Colombia (UTC−5) en esta fecha. */
const enBogota = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-05:00`)

// El caso real que lo pidió: Coraje, martes y miércoles en dos turnos y el
// fin de semana en otros dos.
const CORAJE = normalizarFranjas([
  { dias: [2, 3], desde: '08:00', hasta: '09:30' },
  { dias: [2, 3], desde: '18:00', hasta: '19:00' },
  { dias: [6, 7], desde: '08:00', hasta: '09:00' },
  { dias: [6, 7], desde: '19:00', hasta: '20:00' },
])

describe('normalizarFranjas y validarFranjas', () => {
  it('lee el JSON del formulario y ordena días y franjas', () => {
    const f = normalizarFranjas(
      '[{"dias":[3,2,2],"desde":"18:00:00","hasta":"19:00"},{"dias":[2],"desde":"08:00","hasta":"09:30"}]',
    )
    expect(f).toEqual([
      { dias: [2], desde: '08:00', hasta: '09:30' },
      { dias: [2, 3], desde: '18:00', hasta: '19:00' },
    ])
  })

  it('sin franjas = todo el día', () => {
    expect(normalizarFranjas(null)).toBeNull()
    expect(normalizarFranjas('')).toBeNull()
    expect(normalizarFranjas('[]')).toBeNull()
    expect(normalizarFranjas('no es json')).toBeNull()
  })

  it('pide días, fin después del inicio y que no se crucen', () => {
    expect(validarFranjas(CORAJE)).toBeNull()
    expect(validarFranjas(normalizarFranjas([{ dias: [], desde: '08:00', hasta: '09:00' }]))).toMatch(
      /al menos un día/,
    )
    expect(validarFranjas(normalizarFranjas([{ dias: [1], desde: '10:00', hasta: '09:00' }]))).toMatch(
      /después/,
    )
    expect(
      validarFranjas(
        normalizarFranjas([
          { dias: [1, 2], desde: '08:00', hasta: '10:00' },
          { dias: [2], desde: '09:00', hasta: '11:00' },
        ]),
      ),
    ).toMatch(/se cruzan/)
  })

  it('mismas horas en días distintos no se cruzan', () => {
    expect(
      validarFranjas(
        normalizarFranjas([
          { dias: [1], desde: '08:00', hasta: '10:00' },
          { dias: [2], desde: '08:00', hasta: '10:00' },
        ]),
      ),
    ).toBeNull()
  })

  it('un tope de franjas', () => {
    const muchas = Array.from({ length: 7 }, (_, i) => ({ dias: [i + 1], desde: '08:00', hasta: '09:00' }))
    expect(leerFranjasDelFormulario(JSON.stringify(muchas)).ok).toBe(false)
  })

  it('los días de todas las franjas son los de la promoción', () => {
    expect(diasDeFranjas(CORAJE)).toEqual([2, 3, 6, 7])
    expect(diasDeFranjas(null)).toBeNull()
  })
})

describe('estadoPromocion: en hora de Colombia', () => {
  // 2026-10-27 es martes; 2026-10-29, jueves.
  it('dentro de una franja aplica, y dice hasta cuándo', () => {
    const e = estadoPromocion([2, 3, 6, 7], CORAJE, enBogota('2026-10-27', '08:45'))
    expect(e).toEqual({ tipo: 'aplica', hasta: '09:30' })
    expect(textoEstadoPromocion(e)).toBe('Aplica ahora · hasta las 9:30 a. m.')
  })

  it('entre franjas dice desde cuándo', () => {
    const e = estadoPromocion([2, 3, 6, 7], CORAJE, enBogota('2026-10-27', '12:00'))
    expect(e).toEqual({ tipo: 'mas_tarde', desde: '18:00' })
    expect(textoEstadoPromocion(e)).toBe('Hoy aplica desde las 6:00 p. m.')
  })

  it('el fin de la franja ya no aplica', () => {
    expect(aplicaAhora(null, CORAJE, enBogota('2026-10-27', '09:30'))).toBe(false)
    expect(aplicaAhora(null, CORAJE, enBogota('2026-10-27', '09:29'))).toBe(true)
  })

  it('pasada la última franja, o en un día sin franjas, hoy no', () => {
    expect(estadoPromocion(null, CORAJE, enBogota('2026-10-27', '19:30')).tipo).toBe('hoy_no')
    expect(estadoPromocion(null, CORAJE, enBogota('2026-10-29', '08:30')).tipo).toBe('hoy_no')
    expect(textoEstadoPromocion({ tipo: 'hoy_no' })).toBe('Hoy no aplica')
  })

  it('usa la hora de Colombia, no la del navegador', () => {
    // 00:30 UTC del miércoles es todavía martes 7:30 p. m. en Bogotá.
    expect(aplicaAhora(null, CORAJE, new Date('2026-10-28T00:30:00Z'))).toBe(false)
    expect(
      aplicaAhora(null, [{ dias: [2], desde: '19:00', hasta: '20:00' }], new Date('2026-10-28T00:30:00Z')),
    ).toBe(true)
  })

  it('sin franjas manda el día, todo el día', () => {
    expect(estadoPromocion(null, null, enBogota('2026-10-27', '03:00'))).toEqual({ tipo: 'aplica', hasta: null })
    expect(estadoPromocion([1], null, enBogota('2026-10-27', '12:00')).tipo).toBe('hoy_no')
    expect(textoEstadoPromocion({ tipo: 'aplica', hasta: null })).toBe('Aplica hoy')
  })

  it('la una se dice en singular', () => {
    expect(textoEstadoPromocion({ tipo: 'mas_tarde', desde: '13:00' })).toBe('Hoy aplica desde la 1:00 p. m.')
  })
})

describe('el texto', () => {
  it('días en corto', () => {
    expect(textoDiasCorto([2, 3])).toBe('Mar y mié')
    expect(textoDiasCorto([1, 2, 3, 4, 5])).toBe('Lun a vie')
    expect(textoDiasCorto([1, 3, 5])).toBe('Lun, mié y vie')
    expect(textoDiasCorto([1, 2, 3, 4, 5, 6, 7])).toBe('Todos los días')
  })

  it('el rango comparte «a. m.» si puede', () => {
    expect(textoRango('08:00', '09:30')).toBe('8:00 – 9:30 a. m.')
    expect(textoRango('11:00', '14:00')).toBe('11:00 a. m. – 2:00 p. m.')
  })

  it('una línea por grupo de días', () => {
    expect(lineasFranjas(CORAJE)).toEqual([
      'Mar y mié · 8:00 – 9:30 a. m. y 6:00 – 7:00 p. m.',
      'Sáb y dom · 8:00 – 9:00 a. m. y 7:00 – 8:00 p. m.',
    ])
    expect(lineasFranjas(null)).toEqual([])
  })
})

describe('para el socio: cuándo usarlo y si puede ahora', () => {
  it('un renglón por grupo de días, entero y con horas completas', () => {
    expect(cuandoUsarlo([2, 3, 6, 7], CORAJE)).toEqual([
      { dias: 'Martes y miércoles', horas: ['8:00 a. m. – 9:30 a. m.', '6:00 p. m. – 7:00 p. m.'] },
      { dias: 'Sábado y domingo', horas: ['8:00 a. m. – 9:00 a. m.', '7:00 p. m. – 8:00 p. m.'] },
    ])
  })

  it('sin horas: todo el día, en sus días o todos', () => {
    expect(cuandoUsarlo([2, 3, 4], null)).toEqual([{ dias: 'Martes a jueves', horas: ['Todo el día'] }])
    expect(cuandoUsarlo(null, null)).toEqual([{ dias: 'Todos los días', horas: ['Todo el día'] }])
  })

  it('una franja de 00:00 a 23:59 se lee «todo el día»', () => {
    expect(cuandoUsarlo(null, [{ dias: [6, 7], desde: '00:00', hasta: '23:59' }])).toEqual([
      { dias: 'Sábado y domingo', horas: ['Todo el día'] },
    ])
  })

  it('el estado en palabras de socio', () => {
    expect(textoDisponibilidad({ tipo: 'aplica', hasta: '09:30' })).toBe('Puedes usarlo ahora, hasta las 9:30 a. m.')
    expect(textoDisponibilidad({ tipo: 'aplica', hasta: null })).toBe('Puedes usarlo hoy')
    expect(textoDisponibilidad({ tipo: 'aplica', hasta: '23:59' })).toBe('Puedes usarlo hoy')
    expect(textoDisponibilidad({ tipo: 'mas_tarde', desde: '18:00' })).toBe('Hoy podrás usarlo desde las 6:00 p. m.')
    expect(textoDisponibilidad({ tipo: 'hoy_no' })).toBe('Hoy no está disponible')
  })

  it('partesDisponibilidad: la palabra y el detalle por separado', () => {
    expect(partesDisponibilidad({ tipo: 'aplica', hasta: '09:30' })).toEqual({
      palabra: 'Disponible ahora',
      detalle: 'hasta las 9:30 a. m.',
    })
    expect(partesDisponibilidad({ tipo: 'aplica', hasta: '23:59' })).toEqual({ palabra: 'Disponible hoy', detalle: null })
    expect(partesDisponibilidad({ tipo: 'aplica', hasta: null })).toEqual({ palabra: 'Disponible hoy', detalle: null })
    expect(partesDisponibilidad({ tipo: 'mas_tarde', desde: '13:00' })).toEqual({
      palabra: 'Hoy desde la 1:00 p. m.',
      detalle: null,
    })
    expect(partesDisponibilidad({ tipo: 'hoy_no' })).toEqual({ palabra: 'Hoy no disponible', detalle: null })
  })
})
