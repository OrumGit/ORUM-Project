import { describe, expect, it } from 'vitest'
import {
  catalogoPara,
  contarImagenes,
  faltaColumnaVisibilidad,
  leerVisibilidad,
  seVeEn,
  textoVisibilidad,
  textoVisibilidadCorto,
} from './visibilidad'

describe('leerVisibilidad', () => {
  it('sin las columnas (sin migración) se ve en los dos', () => {
    expect(leerVisibilidad({})).toEqual({ publico: true, miembros: true })
    expect(leerVisibilidad({ visible_publico: null, visible_miembros: null })).toEqual({
      publico: true,
      miembros: true,
    })
  })

  it('lee cada columna por separado', () => {
    expect(leerVisibilidad({ visible_publico: false, visible_miembros: true })).toEqual({
      publico: false,
      miembros: true,
    })
  })
})

describe('textoVisibilidad', () => {
  it('dice dónde se ve', () => {
    expect(textoVisibilidad({ publico: true, miembros: true })).toBe('Portal inicial y miembros')
    expect(textoVisibilidad({ publico: true, miembros: false })).toBe('Solo portal inicial')
    expect(textoVisibilidad({ publico: false, miembros: true })).toBe('Solo portal de miembros')
    expect(textoVisibilidad({ publico: false, miembros: false })).toBe('Oculto')
    expect(textoVisibilidadCorto({ publico: true, miembros: true })).toBe('Ambos')
    expect(textoVisibilidadCorto({ publico: false, miembros: true })).toBe('Solo miembros')
    expect(textoVisibilidadCorto({ publico: false, miembros: false })).toBe('Oculto')
  })
})

describe('seVeEn', () => {
  it('responde por portal', () => {
    const v = { publico: false, miembros: true }
    expect(seVeEn(v, 'publico')).toBe(false)
    expect(seVeEn(v, 'miembros')).toBe(true)
  })
})

describe('faltaColumnaVisibilidad', () => {
  it('reconoce la columna que falta', () => {
    expect(faltaColumnaVisibilidad({ code: '42703', message: 'column comercios.visible_publico does not exist' })).toBe(true)
    expect(faltaColumnaVisibilidad({ code: 'PGRST204', message: "Could not find the 'visible_miembros' column" })).toBe(true)
  })

  it('no confunde otros errores', () => {
    expect(faltaColumnaVisibilidad(null)).toBe(false)
    expect(faltaColumnaVisibilidad({ code: '42703', message: 'column comercios.otra does not exist' })).toBe(false)
    expect(faltaColumnaVisibilidad({ code: '57014', message: 'timeout' })).toBe(false)
  })
})

describe('contarImagenes', () => {
  it('cuenta la portada y la galería, no el logotipo', () => {
    expect(contarImagenes('https://x/portada.jpg', 3)).toBe(4)
    expect(contarImagenes(null, 3)).toBe(3)
    expect(contarImagenes('  ', 0)).toBe(0)
  })
})

describe('catalogoPara', () => {
  const comercio = (id: number, publico: boolean, miembros: boolean, ciudad: number, sub: number | null) => ({
    id,
    visible: { publico, miembros },
    ciudadIds: [ciudad],
    categorias: [{ subcategoriaId: sub }],
  })
  const catalogo = {
    comercios: [comercio(1, true, true, 10, 100), comercio(2, false, true, 20, 200)],
    categorias: [
      {
        id: 1,
        nombre: 'Gastronomía',
        subcategorias: [
          { id: 100, nombre: 'Pizzerías' },
          { id: 200, nombre: 'Bares' },
        ],
      },
    ],
    ciudades: [
      { id: 10, nombre: 'Bogotá' },
      { id: 20, nombre: 'Tuluá' },
    ],
  }

  it('deja solo los comercios del portal, con sus filtros', () => {
    const publico = catalogoPara(catalogo, 'publico')
    expect(publico.comercios.map((c) => c.id)).toEqual([1])
    expect(publico.ciudades.map((c) => c.id)).toEqual([10])
    expect(publico.categorias[0].subcategorias.map((s) => s.id)).toEqual([100])
  })

  it('sin nada oculto devuelve el mismo catálogo', () => {
    expect(catalogoPara(catalogo, 'miembros')).toBe(catalogo)
  })
})
