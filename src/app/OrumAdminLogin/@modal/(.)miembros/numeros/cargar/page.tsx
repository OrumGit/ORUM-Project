import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
// Alias, no ruta relativa: esta página vive a cinco niveles de la sección que
// la usa, y un `../../../../..` se rompe en silencio al mover un archivo.
import { CargarRangoForm } from '@/app/OrumAdminLogin/miembros/numeros/_components/cargar-rango-form'

/**
 * Cargar rango de números, interceptado.
 *
 * Desde la pantalla de números se abre encima; por enlace directo se sirve la
 * página completa de `../../cargar`. El formulario es el mismo: aquí solo
 * cambia el envoltorio. Cerrar es siempre `router.back()` (vía contexto del
 * `OverlayRuta`), nunca un enlace hacia adelante.
 *
 * `detent="medium"`: son dos campos y ver la lista de detrás mientras se
 * escribe el rango ayuda.
 */
export default async function CargarRangoInterceptado() {
  await requireRol('super_admin')

  return (
    <OverlayRuta
      title="Cargar rango de números"
      description="Añade al pozo toda una secuencia de números de carné de una vez."
      detent="medium"
    >
      <CargarRangoForm />
    </OverlayRuta>
  )
}
