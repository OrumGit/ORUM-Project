import { describe, it, expect } from 'vitest'
import { resumirEventoBitacora } from './bitacora'

describe('resumirEventoBitacora — alta', () => {
  it('arma el resumen con plan y precio', () => {
    const texto = resumirEventoBitacora('alta', null, { plan_nombre: 'Oro', precio_pagado: 50000 })
    expect(texto).toBe('Miembro registrado — plan Oro, $50000')
  })

  it('dice «cortesía» en vez del precio', () => {
    const texto = resumirEventoBitacora('alta', null, {
      plan_nombre: 'Oro',
      precio_pagado: 0,
      es_cortesia: true,
    })
    expect(texto).toBe('Miembro registrado — plan Oro, cortesía')
  })

  it('usa (vacío) si falta el dato', () => {
    const texto = resumirEventoBitacora('alta', null, {})
    expect(texto).toBe('Miembro registrado — plan (vacío), $(vacío)')
  })
})

describe('resumirEventoBitacora — renovacion', () => {
  it('arma el resumen con plan y fecha de fin', () => {
    const texto = resumirEventoBitacora('renovacion', null, {
      plan_nombre: 'Oro',
      fecha_inicio: '2026-08-01',
      fecha_fin: '2027-08-01',
      precio_pagado: 50000,
    })
    expect(texto).toBe('Membresía renovada — plan Oro, vence 2027-08-01')
  })
})

describe('resumirEventoBitacora — renovacion de cortesía', () => {
  it('lo dice en el resumen', () => {
    const texto = resumirEventoBitacora('renovacion', null, {
      plan_nombre: 'Oro',
      fecha_fin: '2027-08-01',
      precio_pagado: 0,
      es_cortesia: true,
    })
    expect(texto).toBe('Membresía renovada (cortesía) — plan Oro, vence 2027-08-01')
  })
})

describe('resumirEventoBitacora — edicion', () => {
  it('lista los campos que cambiaron', () => {
    const texto = resumirEventoBitacora(
      'edicion',
      { nombres: 'Ana', apellidos: 'Ruiz', telefono: '3001234567' },
      { nombres: 'Ana', apellidos: 'Ruiz Gómez', telefono: '3001234567' },
    )
    expect(texto).toBe('Datos editados — apellidos')
  })

  it('lista varios campos separados por coma', () => {
    const texto = resumirEventoBitacora(
      'edicion',
      { telefono: '3001234567', direccion: 'Calle 1' },
      { telefono: '3009999999', direccion: 'Calle 2' },
    )
    expect(texto).toBe('Datos editados — teléfono, dirección')
  })

  it('indica cuando no detecta cambios', () => {
    const texto = resumirEventoBitacora('edicion', { nombres: 'Ana' }, { nombres: 'Ana' })
    expect(texto).toBe('Datos editados (sin cambios detectados)')
  })

  it('funciona con datos_anteriores nulo', () => {
    const texto = resumirEventoBitacora('edicion', null, { nombres: 'Ana' })
    expect(texto).toBe('Datos editados — nombres')
  })
})

describe('resumirEventoBitacora — acción desconocida', () => {
  it('cae en un texto genérico', () => {
    expect(resumirEventoBitacora('otra_cosa', null, null)).toBe('Evento: otra_cosa')
  })
})

describe('resumirEventoBitacora · revocación', () => {
  it('dice que se revocó y por qué', () => {
    expect(
      resumirEventoBitacora('revocacion', { estado: 'activa' }, { motivo: 'uso_indebido', nota: 'prestó el carnet' }),
    ).toBe('Membresía revocada — Uso indebido del carnet: prestó el carnet')
  })
})
