import { describe, expect, it } from 'vitest'
import { RUTA_PANEL_POR_DEFECTO, esAccesoInternoDirecto, normalizarRutaPanel, rutaPanelCanonica } from './ruta-panel'

describe('normalizarRutaPanel', () => {
  it('sin variable, la de serie', () => {
    expect(normalizarRutaPanel(undefined)).toBe(RUTA_PANEL_POR_DEFECTO)
    expect(normalizarRutaPanel('')).toBe(RUTA_PANEL_POR_DEFECTO)
  })

  it('acepta una ruta larga y aleatoria, con o sin barra, en minúsculas', () => {
    expect(normalizarRutaPanel('/puerta-k3m9x2q8w7z1')).toBe('/puerta-k3m9x2q8w7z1')
    expect(normalizarRutaPanel(' Puerta-K3M9X2Q8W7Z1 ')).toBe('/puerta-k3m9x2q8w7z1')
  })

  it('rechaza lo corto, lo que tiene varios tramos o caracteres raros', () => {
    expect(normalizarRutaPanel('/corta')).toBe(RUTA_PANEL_POR_DEFECTO)
    expect(normalizarRutaPanel('/a/b-larguisima-ruta')).toBe(RUTA_PANEL_POR_DEFECTO)
    expect(normalizarRutaPanel('/ruta_con_guion_bajo')).toBe(RUTA_PANEL_POR_DEFECTO)
    expect(normalizarRutaPanel('/ruta?con=consulta12')).toBe(RUTA_PANEL_POR_DEFECTO)
  })

  it('no puede pisar una ruta del sitio', () => {
    expect(normalizarRutaPanel('/admin-secreto-123456')).toBe(RUTA_PANEL_POR_DEFECTO)
    expect(normalizarRutaPanel('/login-del-equipo-99')).toBe(RUTA_PANEL_POR_DEFECTO)
    expect(normalizarRutaPanel('/miembros-especiales')).toBe(RUTA_PANEL_POR_DEFECTO)
  })

  it('la de serie es válida por sí misma', () => {
    expect(normalizarRutaPanel(RUTA_PANEL_POR_DEFECTO)).toBe(RUTA_PANEL_POR_DEFECTO)
  })
})

describe('esAccesoInternoDirecto', () => {
  it('reconoce /login y lo que cuelga de ella, nada más', () => {
    expect(esAccesoInternoDirecto('/login')).toBe(true)
    expect(esAccesoInternoDirecto('/login/algo')).toBe(true)
    expect(esAccesoInternoDirecto('/loginx')).toBe(false)
    expect(esAccesoInternoDirecto('/miembros/login')).toBe(false)
    expect(esAccesoInternoDirecto('/comercios/login')).toBe(false)
  })
})

describe('rutaPanelCanonica', () => {
  it('lleva las minúsculas a /OrumAdminLogin, con lo que cuelgue', () => {
    expect(rutaPanelCanonica('/orumadminlogin')).toBe('/OrumAdminLogin')
    expect(rutaPanelCanonica('/ORUMADMINLOGIN/miembros/12')).toBe('/OrumAdminLogin/miembros/12')
  })

  it('no toca lo que ya está bien ni lo que no es del panel', () => {
    expect(rutaPanelCanonica('/OrumAdminLogin')).toBeNull()
    expect(rutaPanelCanonica('/OrumAdminLogin/comercios')).toBeNull()
    expect(rutaPanelCanonica('/admin')).toBeNull()
    expect(rutaPanelCanonica('/orumadminloginx')).toBeNull()
  })

  it('la puerta secreta no puede llamarse como el panel', () => {
    expect(normalizarRutaPanel('/orumadminlogin')).toBe(RUTA_PANEL_POR_DEFECTO)
  })
})
