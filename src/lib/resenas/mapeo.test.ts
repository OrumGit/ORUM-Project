import { describe, expect, it } from 'vitest'
import {
  gestionDeFila,
  nombreCompleto,
  panelDeFila,
  separarMiResena,
  vistaDeFilaRpc,
  type FilaRpcResena,
} from './mapeo'

describe('vistaDeFilaRpc', () => {
  it('pasa de snake_case a camelCase', () => {
    expect(
      vistaDeFilaRpc({
        id: 3,
        estrellas: 5,
        mensaje: null,
        autor: 'María G.',
        created_at: '2026-10-20T10:00:00Z',
        respuesta_comercio: 'Gracias',
        respuesta_admin: null,
        es_mia: true,
      }),
    ).toEqual({
      id: 3,
      estrellas: 5,
      mensaje: null,
      autor: 'María G.',
      creadaEn: '2026-10-20T10:00:00Z',
      respuestaComercio: 'Gracias',
      respuestaAdmin: null,
      esMia: true,
    })
  })
})

describe('nombreCompleto', () => {
  it('une nombres y apellidos sin espacios de más', () => {
    expect(nombreCompleto({ nombres: 'María  José', apellidos: ' García ' })).toBe(
      'María José García',
    )
  })
  it('usa un marcador si no hay socio o está vacío', () => {
    expect(nombreCompleto(null)).toBe('Socio')
    expect(nombreCompleto({ nombres: '', apellidos: '' })).toBe('Socio')
  })
})

describe('gestionDeFila', () => {
  it('lleva el nombre completo y las fechas de respuesta', () => {
    const r = gestionDeFila({
      id: 1,
      estrellas: 4,
      mensaje: 'Bien',
      created_at: 'a',
      respuesta_comercio: 'x',
      respuesta_comercio_at: 'b',
      respuesta_admin: null,
      respuesta_admin_at: null,
      miembros: { nombres: 'Ana', apellidos: 'Ruiz Peña' },
    })
    expect(r.autor).toBe('Ana Ruiz Peña')
    expect(r.respuestaComercioAt).toBe('b')
    expect(r.respuestaAdminAt).toBeNull()
    expect(r.creadaEn).toBe('a')
  })
})

function filas(n: number, mia?: number): FilaRpcResena[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    estrellas: 4,
    mensaje: null,
    autor: 'A',
    created_at: '2026-10-20T10:00:00Z',
    respuesta_comercio: null,
    respuesta_admin: null,
    es_mia: i === mia,
  }))
}

describe('separarMiResena', () => {
  it('encuentra la propia dentro de las primeras 20', () => {
    const r = separarMiResena(filas(30, 3), 20)
    expect(r.miResena?.id).toBe(4)
    expect(r.otras).toHaveLength(19)
    expect(r.otras.some((o) => o.id === 4)).toBe(false)
  })
  it('encuentra la propia más allá de la 20.ª', () => {
    const r = separarMiResena(filas(30, 25), 20)
    expect(r.miResena?.id).toBe(26)
    expect(r.miResena?.esMia).toBe(true)
    expect(r.otras).toHaveLength(19)
    expect(r.otras.some((o) => o.esMia)).toBe(false)
  })
  it('sin reseña propia devuelve hasta el límite', () => {
    const r = separarMiResena(filas(30), 20)
    expect(r.miResena).toBeNull()
    expect(r.otras).toHaveLength(20)
  })
  it('lista vacía', () => {
    expect(separarMiResena([], 20)).toEqual({ miResena: null, otras: [] })
  })
  it('límite exacto: 20 y 21 filas', () => {
    expect(separarMiResena(filas(20), 20).otras).toHaveLength(20)
    expect(separarMiResena(filas(21), 20).otras).toHaveLength(20)
    const r20 = separarMiResena(filas(20, 19), 20)
    expect(r20.miResena?.id).toBe(20)
    expect(r20.otras).toHaveLength(19)
    const r21 = separarMiResena(filas(21, 20), 20)
    expect(r21.miResena?.id).toBe(21)
    expect(r21.otras).toHaveLength(19)
  })
  it('la propia nunca sale dos veces', () => {
    for (const mia of [0, 10, 19, 20, 29]) {
      const r = separarMiResena(filas(30, mia), 20)
      const ids = [...r.otras.map((o) => o.id), r.miResena!.id]
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('panelDeFila', () => {
  const fila = {
    id: 9,
    comercio_id: 65,
    comercios: { nombre: ' Dulces Momentos ' },
    estrellas: 2,
    mensaje: 'Tardaron mucho',
    created_at: '2026-10-28T15:00:00Z',
    respuesta_comercio: null,
    respuesta_comercio_at: null,
    respuesta_admin: null,
    respuesta_admin_at: null,
    revisada_at: null,
    miembros: { nombres: 'Ana', apellidos: 'Ruiz' },
  }

  it('trae el comercio y dice si está por revisar', () => {
    const r = panelDeFila(fila, true)
    expect(r).toMatchObject({ comercioId: 65, comercioNombre: 'Dulces Momentos', autor: 'Ana Ruiz', porRevisar: true })
  })

  it('revisada, o de 4 estrellas o más, no está por revisar', () => {
    expect(panelDeFila({ ...fila, revisada_at: '2026-10-29T10:00:00Z' }, true).porRevisar).toBe(false)
    expect(panelDeFila({ ...fila, estrellas: 4 }, true).porRevisar).toBe(false)
  })

  it('sin la columna de revisión, cuenta la respuesta de ORUM', () => {
    const sinColumna = { ...fila, revisada_at: undefined }
    expect(panelDeFila(sinColumna, false).porRevisar).toBe(true)
    expect(panelDeFila({ ...sinColumna, respuesta_admin: 'Lo vemos' }, false).porRevisar).toBe(false)
  })

  it('sin el comercio, un marcador neutro', () => {
    expect(panelDeFila({ ...fila, comercios: null }, true).comercioNombre).toBe('Comercio')
  })
})
