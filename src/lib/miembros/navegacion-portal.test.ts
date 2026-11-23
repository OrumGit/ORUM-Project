import { describe, it, expect } from 'vitest'
import { esDestinoActivo } from './navegacion-portal'

describe('esDestinoActivo', () => {
  describe('href = /miembros/movimientos', () => {
    it('activo en la bitácora y NO marca Inicio', () => {
      expect(esDestinoActivo('/miembros/movimientos', '/miembros/movimientos')).toBe(true)
      expect(esDestinoActivo('/miembros/movimientos', '/miembros')).toBe(false)
    })
  })

  describe('href = /miembros (Inicio)', () => {
    it('activo en la propia raíz', () => {
      expect(esDestinoActivo('/miembros', '/miembros')).toBe(true)
    })

    it('NO activo por startsWith ingenuo: /miembros/perfil no es contenido de Inicio', () => {
      expect(esDestinoActivo('/miembros/perfil', '/miembros')).toBe(false)
    })

    it('activo dentro de una ficha de comercio, que es contenido de Inicio', () => {
      expect(esDestinoActivo('/miembros/comercios/42', '/miembros')).toBe(true)
    })

    it('activo en la propia raíz de comercios sin id', () => {
      expect(esDestinoActivo('/miembros/comercios', '/miembros')).toBe(true)
    })

    it('NO activo en /miembros/inactiva: no es un destino de navegación', () => {
      expect(esDestinoActivo('/miembros/inactiva', '/miembros')).toBe(false)
    })

    it('NO activo en una ruta completamente ajena', () => {
      expect(esDestinoActivo('/OrumAdminLogin', '/miembros')).toBe(false)
    })

    it('no confunde un segmento que empieza igual: /miembros/comerciosX no es /miembros/comercios', () => {
      expect(esDestinoActivo('/miembros/comerciosX', '/miembros')).toBe(false)
    })
  })

  describe('href = /miembros/perfil (no es Inicio)', () => {
    it('activo en su propia ruta', () => {
      expect(esDestinoActivo('/miembros/perfil', '/miembros/perfil')).toBe(true)
    })

    it('activo en una sub-ruta propia', () => {
      expect(esDestinoActivo('/miembros/perfil/editar', '/miembros/perfil')).toBe(true)
    })

    it('NO activo por coincidencia parcial sin separador de segmento', () => {
      expect(esDestinoActivo('/miembros/perfil2', '/miembros/perfil')).toBe(false)
    })

    it('NO activo en Inicio', () => {
      expect(esDestinoActivo('/miembros', '/miembros/perfil')).toBe(false)
    })

    it('NO activo en una ficha de comercio', () => {
      expect(esDestinoActivo('/miembros/comercios/42', '/miembros/perfil')).toBe(false)
    })
  })
})
